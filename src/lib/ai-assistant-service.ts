/**
 * AI Assistant Service - Hybrid Ollama + OpenAI Provider
 *
 * This service provides a unified interface for AI chat completions with:
 * 1. Local-first approach using Ollama (free, private, fast)
 * 2. Automatic fallback to OpenAI (reliable, cloud-based)
 * 3. Streaming support for real-time responses
 * 4. Health checks and provider switching
 */

import OpenAI from "openai";
import { AI_ASSISTANT_CONFIG } from "./config";
import { createLogger } from "./logger";

const logger = createLogger("ai-assistant");

export type AIProvider = "ollama" | "openai";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface AIServiceResponse {
  content: string;
  provider: AIProvider;
  model: string;
}

/**
 * AI Assistant Service
 * Manages connections to Ollama and OpenAI with automatic fallback
 */
export class AIAssistantService {
  private ollamaClient: OpenAI | null = null;
  private openaiClient: OpenAI | null = null;
  private ollamaHealthy = false;
  private lastHealthCheck = 0;
  private readonly healthCheckInterval = 60000; // 1 minute

  constructor() {
    this.initializeClients();
  }

  /**
   * Initialize OpenAI clients for both Ollama and OpenAI API
   */
  private initializeClients(): void {
    // Initialize Ollama client if endpoint is configured
    if (AI_ASSISTANT_CONFIG.OLLAMA_ENDPOINT) {
      try {
        this.ollamaClient = new OpenAI({
          baseURL: `${AI_ASSISTANT_CONFIG.OLLAMA_ENDPOINT}/v1`,
          apiKey: "ollama", // Ollama doesn't need a real key
        });
        logger.info(
          { endpoint: AI_ASSISTANT_CONFIG.OLLAMA_ENDPOINT },
          "Ollama client initialized",
        );
      } catch (error) {
        logger.warn({ error }, "Failed to initialize Ollama client");
      }
    }

    // Initialize OpenAI client if API key is configured
    if (AI_ASSISTANT_CONFIG.OPENAI_API_KEY) {
      try {
        this.openaiClient = new OpenAI({
          apiKey: AI_ASSISTANT_CONFIG.OPENAI_API_KEY,
        });
        logger.info("OpenAI client initialized");
      } catch (error) {
        logger.error({ error }, "Failed to initialize OpenAI client");
      }
    }

    // Check Ollama health on startup
    if (this.ollamaClient) {
      this.checkOllamaHealth().catch((err) => {
        logger.warn({ error: err }, "Initial Ollama health check failed");
      });
    }
  }

  /**
   * Check if Ollama is healthy and available
   */
  private async checkOllamaHealth(): Promise<boolean> {
    if (!this.ollamaClient) {
      return false;
    }

    // Use cached health status if checked recently
    const now = Date.now();
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return this.ollamaHealthy;
    }

    try {
      // Try to list models as a health check
      const response = await fetch(
        `${AI_ASSISTANT_CONFIG.OLLAMA_ENDPOINT}/api/tags`,
        { signal: AbortSignal.timeout(5000) },
      );

      this.ollamaHealthy = response.ok;
      this.lastHealthCheck = now;

      logger.debug(
        { healthy: this.ollamaHealthy },
        "Ollama health check completed",
      );
      return this.ollamaHealthy;
    } catch (error) {
      logger.warn({ error }, "Ollama health check failed");
      this.ollamaHealthy = false;
      this.lastHealthCheck = now;
      return false;
    }
  }

  /**
   * Determine which provider to use based on configuration and health
   */
  private async selectProvider(): Promise<{
    provider: AIProvider;
    client: OpenAI;
    model: string;
  }> {
    // If default is OpenAI, use it directly
    if (AI_ASSISTANT_CONFIG.DEFAULT_PROVIDER === "openai") {
      if (!this.openaiClient) {
        throw new Error("OpenAI client not configured");
      }
      return {
        provider: "openai",
        client: this.openaiClient,
        model: AI_ASSISTANT_CONFIG.OPENAI_MODEL,
      };
    }

    // Try Ollama first if it's the default
    if (this.ollamaClient) {
      const isHealthy = await this.checkOllamaHealth();
      if (isHealthy) {
        return {
          provider: "ollama",
          client: this.ollamaClient,
          model: AI_ASSISTANT_CONFIG.OLLAMA_MODEL,
        };
      }
      logger.info("Ollama unavailable, falling back to OpenAI");
    }

    // Fallback to OpenAI
    if (!this.openaiClient) {
      throw new Error("No AI provider available (Ollama unhealthy, OpenAI not configured)");
    }

    return {
      provider: "openai",
      client: this.openaiClient,
      model: AI_ASSISTANT_CONFIG.OPENAI_MODEL,
    };
  }

  /**
   * Complete a chat conversation (non-streaming)
   */
  async complete(options: ChatCompletionOptions): Promise<AIServiceResponse> {
    const { provider, client, model } = await this.selectProvider();

    logger.info(
      { provider, model, messageCount: options.messages.length },
      "Starting chat completion",
    );

    try {
      const response = await client.chat.completions.create({
        model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2000,
        stream: false,
      });

      const content = response.choices[0]?.message?.content || "";

      logger.info(
        { provider, model, contentLength: content.length },
        "Chat completion successful",
      );

      return {
        content,
        provider,
        model,
      };
    } catch (error) {
      logger.error({ error, provider, model }, "Chat completion failed");

      // If Ollama failed, try OpenAI fallback
      if (provider === "ollama" && this.openaiClient) {
        logger.info("Attempting OpenAI fallback after Ollama failure");
        return this.completeWithOpenAI(options);
      }

      throw error;
    }
  }

  /**
   * Force completion with OpenAI (used as fallback)
   */
  private async completeWithOpenAI(
    options: ChatCompletionOptions,
  ): Promise<AIServiceResponse> {
    if (!this.openaiClient) {
      throw new Error("OpenAI client not configured");
    }

    const response = await this.openaiClient.chat.completions.create({
      model: AI_ASSISTANT_CONFIG.OPENAI_MODEL,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2000,
      stream: false,
    });

    const content = response.choices[0]?.message?.content || "";

    return {
      content,
      provider: "openai",
      model: AI_ASSISTANT_CONFIG.OPENAI_MODEL,
    };
  }

  /**
   * Stream a chat conversation
   * Returns an async iterable for streaming responses
   */
  async *stream(
    options: ChatCompletionOptions,
  ): AsyncIterable<{ content: string; provider: AIProvider; model: string }> {
    const { provider, client, model } = await this.selectProvider();

    logger.info(
      { provider, model, messageCount: options.messages.length },
      "Starting streaming completion",
    );

    try {
      const stream = await client.chat.completions.create({
        model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2000,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          yield { content, provider, model };
        }
      }

      logger.info({ provider, model }, "Streaming completion finished");
    } catch (error) {
      logger.error({ error, provider, model }, "Streaming completion failed");

      // If Ollama failed, try OpenAI fallback
      if (provider === "ollama" && this.openaiClient) {
        logger.info("Attempting OpenAI fallback after Ollama failure");
        yield* this.streamWithOpenAI(options);
        return;
      }

      throw error;
    }
  }

  /**
   * Force streaming with OpenAI (used as fallback)
   */
  private async *streamWithOpenAI(
    options: ChatCompletionOptions,
  ): AsyncIterable<{ content: string; provider: AIProvider; model: string }> {
    if (!this.openaiClient) {
      throw new Error("OpenAI client not configured");
    }

    const stream = await this.openaiClient.chat.completions.create({
      model: AI_ASSISTANT_CONFIG.OPENAI_MODEL,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2000,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        yield { content, provider: "openai", model: AI_ASSISTANT_CONFIG.OPENAI_MODEL };
      }
    }
  }

  /**
   * Get the current provider status
   */
  async getStatus(): Promise<{
    ollama: { available: boolean; healthy: boolean };
    openai: { available: boolean };
    defaultProvider: AIProvider;
  }> {
    const ollamaHealthy = await this.checkOllamaHealth();

    return {
      ollama: {
        available: !!this.ollamaClient,
        healthy: ollamaHealthy,
      },
      openai: {
        available: !!this.openaiClient,
      },
      defaultProvider: AI_ASSISTANT_CONFIG.DEFAULT_PROVIDER,
    };
  }
}

/**
 * Singleton instance
 */
let aiServiceInstance: AIAssistantService | null = null;

export function getAIAssistantService(): AIAssistantService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIAssistantService();
  }
  return aiServiceInstance;
}
