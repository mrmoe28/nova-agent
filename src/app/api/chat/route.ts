/**
 * AI Assistant Chat API
 *
 * Handles chat requests from the AI assistant widget.
 * Provides streaming responses with context from knowledge base and equipment catalog.
 */

import { NextRequest } from "next/server";
import { getAIAssistantService, type ChatMessage } from "@/lib/ai-assistant-service";
import { getKnowledgeBase } from "@/lib/knowledge-base";
import {
  searchEquipment,
  formatEquipmentForAI,
  getDistributorSummary,
  findSolarPanels,
  findBatteries,
  findInverters,
} from "@/lib/equipment-search";
import { searchWebForAI } from "@/lib/web-search";
import { AI_ASSISTANT_CONFIG } from "@/lib/config";
import { createLogger } from "@/lib/logger";

const logger = createLogger("chat-api");

export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds for chat

interface ChatRequest {
  messages: ChatMessage[];
  includeContext?: boolean;
}

/**
 * POST /api/chat
 * Main chat endpoint with streaming support
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequest;
    const { messages, includeContext = true } = body;

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No messages provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    logger.info(
      { messageCount: messages.length, includeContext },
      "Chat request received",
    );

    // Get the user's latest message
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage || latestMessage.role !== "user") {
      return new Response(
        JSON.stringify({ error: "Last message must be from user" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const userQuery = latestMessage.content;

    // Build context for the AI
    const contextMessages: ChatMessage[] = [];

    if (includeContext) {
      const context = await buildContext(userQuery);
      if (context) {
        contextMessages.push({
          role: "system",
          content: context,
        });
      }
    }

    // Get knowledge base system prompt
    const knowledgeBase = await getKnowledgeBase();
    const systemPrompt = knowledgeBase.getSystemContext();

    // Combine messages: system prompt + context + conversation history
    // Filter out system messages from user's array, then apply slicing
    const conversationHistory = messages
      .filter(m => m.role !== "system")
      .slice(-AI_ASSISTANT_CONFIG.MAX_HISTORY);

    const allMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...contextMessages,
      ...conversationHistory,
    ];

    // Get AI service and stream response
    const aiService = getAIAssistantService();

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          logger.info("Starting streaming response");

          for await (const chunk of aiService.stream({
            messages: allMessages,
            temperature: 0.7,
            maxTokens: 2000,
          })) {
            // Send chunk as SSE (Server-Sent Events) format
            const data = JSON.stringify({
              content: chunk.content,
              provider: chunk.provider,
              model: chunk.model,
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }

          // Send done signal
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();

          logger.info("Streaming response completed");
        } catch (error) {
          logger.error({ error }, "Streaming error");
          const errorData = JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error",
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    logger.error({ error }, "Chat API error");
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

/**
 * Build context for the AI based on the user's query
 */
async function buildContext(query: string): Promise<string> {
  const contextParts: string[] = [];

  logger.info({ query }, "Building context");

  try {
    // 1. Search knowledge base
    const knowledgeBase = await getKnowledgeBase();
    const relevantKnowledge = knowledgeBase.search(query, 2);

    if (relevantKnowledge.length > 0) {
      contextParts.push("## Relevant Documentation\n");
      for (const section of relevantKnowledge) {
        contextParts.push(`### ${section.topic}\n${section.content}\n`);
      }
    }

    // 2. Search equipment catalog if query seems equipment-related
    if (isEquipmentQuery(query)) {
      logger.info("Detected equipment query");
      const equipmentContext = await buildEquipmentContext(query);
      if (equipmentContext) {
        contextParts.push(equipmentContext);
      }
    }

    // 3. Web search if enabled and query seems to need external info
    if (AI_ASSISTANT_CONFIG.ENABLE_WEB_SEARCH && needsWebSearch(query)) {
      logger.info("Performing web search");
      try {
        const webResults = await searchWebForAI(query, 2);
        contextParts.push(`## Web Search Results\n${webResults}\n`);
      } catch (error) {
        logger.warn({ error }, "Web search failed");
      }
    }

    const finalContext = contextParts.join("\n");
    logger.info(
      { contextLength: finalContext.length },
      "Context built successfully",
    );

    return finalContext;
  } catch (error) {
    logger.error({ error }, "Failed to build context");
    return "";
  }
}

/**
 * Build equipment-specific context
 */
async function buildEquipmentContext(query: string): Promise<string> {
  const parts: string[] = [];

  try {
    // Detect what type of equipment is being asked about
    const queryLower = query.toLowerCase();

    if (
      queryLower.includes("panel") ||
      queryLower.includes("solar") ||
      queryLower.includes("photovoltaic") ||
      queryLower.includes("pv")
    ) {
      const panels = await findSolarPanels(undefined, undefined, 5);
      if (panels.length > 0) {
        parts.push("## Available Solar Panels\n");
        parts.push(formatEquipmentForAI(panels));
      }
    }

    if (queryLower.includes("battery") || queryLower.includes("storage")) {
      const batteries = await findBatteries(undefined, undefined, 5);
      if (batteries.length > 0) {
        parts.push("## Available Batteries\n");
        parts.push(formatEquipmentForAI(batteries));
      }
    }

    if (queryLower.includes("inverter")) {
      const inverters = await findInverters(undefined, undefined, 5);
      if (inverters.length > 0) {
        parts.push("## Available Inverters\n");
        parts.push(formatEquipmentForAI(inverters));
      }
    }

    // General equipment search
    if (parts.length === 0) {
      const equipment = await searchEquipment(query, { limit: 5 });
      if (equipment.length > 0) {
        parts.push("## Matching Equipment\n");
        parts.push(formatEquipmentForAI(equipment));
      }
    }

    // Add distributor info
    const distributors = await getDistributorSummary();
    parts.push(`\n## Available Distributors\n${distributors}`);

    return parts.join("\n");
  } catch (error) {
    logger.error({ error }, "Failed to build equipment context");
    return "";
  }
}

/**
 * Detect if query is about equipment
 */
function isEquipmentQuery(query: string): boolean {
  const equipmentKeywords = [
    "panel",
    "battery",
    "inverter",
    "equipment",
    "product",
    "price",
    "cost",
    "buy",
    "purchase",
    "find",
    "search",
    "recommend",
    "best",
    "cheap",
    "expensive",
    "watt",
    "kwh",
    "kw",
    "manufacturer",
    "brand",
    "model",
  ];

  const queryLower = query.toLowerCase();
  return equipmentKeywords.some((keyword) => queryLower.includes(keyword));
}

/**
 * Detect if query needs web search
 */
function needsWebSearch(query: string): boolean {
  const webSearchKeywords = [
    "latest",
    "current",
    "recent",
    "news",
    "2024",
    "2025",
    "update",
    "what is",
    "who is",
    "when",
    "where",
  ];

  const queryLower = query.toLowerCase();
  return webSearchKeywords.some((keyword) => queryLower.includes(keyword));
}

/**
 * GET /api/chat/status
 * Check AI service status
 */
export async function GET() {
  try {
    const aiService = getAIAssistantService();
    const status = await aiService.getStatus();

    return new Response(JSON.stringify(status), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error({ error }, "Status check failed");
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
