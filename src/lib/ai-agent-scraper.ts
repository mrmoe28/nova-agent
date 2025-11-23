/**
 * AI Agent Scraper - Intelligent web scraping with reasoning and self-correction
 *
 * This scraper uses Claude AI to:
 * 1. Analyze page structure and identify products
 * 2. Make strategic decisions about scraping methods
 * 3. Self-correct when scraping fails
 * 4. Handle complex scenarios like pagination, tabs, and lazy loading
 */

import Anthropic from "@anthropic-ai/sdk";
import * as cheerio from "cheerio";
import { createLogger } from "./logger";
import { scrapeMultipleProducts, fetchHTML, isProductPageUrl } from "./scraper";
import { getBrowserScraper, closeBrowserScraper } from "./browser-scraper-bql";
import { validateScrapingUrl, filterValidUrls } from "./url-validator";
import type { ScrapedProduct, ScraperConfig } from "./scraper";
import { AI_CONFIG } from "./config";

const logger = createLogger("ai-agent-scraper");

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

/**
 * Page analysis result from Claude
 */
export interface PageAnalysis {
  pageType: "product" | "category" | "listing" | "homepage" | "unknown";
  confidence: number;
  productLinks: string[];
  paginationLinks: string[];
  hasJavaScript: boolean;
  recommendedApproach: "browser" | "http" | "mixed";
  reasoning: string;
  selectors: {
    productLinks?: string[];
    productName?: string[];
    productPrice?: string[];
    productImage?: string[];
  };
}

/**
 * Scraping strategy decided by AI
 */
export interface ScrapingStrategy {
  method: "browser" | "http";
  approach: "direct" | "crawl" | "hybrid";
  targetUrls: string[];
  maxDepth: number;
  selectors: Record<string, string[]>;
  reasoning: string;
}

/**
 * Self-correction diagnosis
 */
export interface Diagnosis {
  problem: string;
  likelyCause: string;
  suggestedFix: string;
  alternativeApproach?: ScrapingStrategy;
}

/**
 * AI Agent Scraper with reasoning capabilities
 */
export class AIAgentScraper {
  private attempts = 0;
  private maxAttempts = AI_CONFIG.MAX_ATTEMPTS;
  private history: string[] = [];

  /**
   * Main scraping method with AI reasoning loop
   */
  async scrape(
    url: string,
    config: Partial<ScraperConfig> = {},
  ): Promise<ScrapedProduct[]> {
    // Validate URL at entry point to prevent SSRF attacks
    validateScrapingUrl(url);

    logger.info({ url }, "AI Agent starting intelligent scraping");

    try {
      // Step 1: Analyze the page with AI
      const analysis = await this.analyzePage(url);
      logger.info({ analysis }, "Page analysis complete");

      // Step 2: Decide strategy based on analysis
      const strategy = await this.decideStrategy(url, analysis);
      logger.info({ strategy }, "Strategy decided");

      // Step 3: Execute with self-correction loop
      return await this.executeWithRetry(strategy, config);
    } catch (error) {
      logger.error({ url, error }, "AI Agent scraping failed");
      throw error;
    }
  }

  /**
   * Analyze page structure and content using Claude
   */
  private async analyzePage(url: string): Promise<PageAnalysis> {
    logger.info({ url }, "Fetching page for AI analysis");

    // Quick check if it's obviously a product page by URL
    const isProduct = isProductPageUrl(url);

    // Fetch HTML (use simple HTTP for analysis to save time)
    const html = await fetchHTML(url, {
      rateLimit: AI_CONFIG.ANALYSIS_RATE_LIMIT,
      timeout: AI_CONFIG.ANALYSIS_TIMEOUT,
      respectRobotsTxt: true,
      maxRetries: 1,
    });

    // Extract key information for Claude (truncate to avoid token limits)
    const $ = cheerio.load(html);
    const title = $("title").text();
    const metaDescription = $('meta[name="description"]').attr("content") || "";
    const h1 = $("h1").first().text();

    // Get sample links (limited to save tokens)
    const links = $("a[href]")
      .slice(0, AI_CONFIG.MAX_LINK_SAMPLES)
      .map((_, el) => ({
        href: $(el).attr("href"),
        text: $(el).text().trim().substring(0, AI_CONFIG.LINK_TEXT_MAX_LENGTH),
        class: $(el).attr("class") || "",
      }))
      .get();

    // Get page structure clues
    const hasProductGrid =
      $('.product, .product-item, .product-card, [class*="product"]').length >
      0;
    const hasPagination = $('.pagination, .pager, [class*="page"]').length > 0;
    const hasPrice =
      $('.price, [class*="price"], [itemprop="price"]').length > 0;

    const prompt = `Analyze this e-commerce page and identify its type and the best way to scrape products from it.

URL: ${url}
Title: ${title}
H1: ${h1}
Meta Description: ${metaDescription}

Page Structure Clues:
- URL pattern suggests product page: ${isProduct}
- Has product grid elements: ${hasProductGrid}
- Has pagination: ${hasPagination}
- Has price elements: ${hasPrice}

Sample Links (first 50):
${JSON.stringify(links, null, 2)}

Your task:
1. Determine if this is a product page, category page, listing page, or other
2. Identify product links (if category/listing page)
3. Identify pagination links for crawling more products
4. Suggest the best scraping approach (browser for JS-heavy, HTTP for simple HTML)
5. Provide CSS selectors or patterns to extract product data

Respond in JSON format:
{
  "pageType": "product" | "category" | "listing" | "homepage" | "unknown",
  "confidence": 0.0-1.0,
  "productLinks": ["url1", "url2"],
  "paginationLinks": ["url1", "url2"],
  "hasJavaScript": true/false,
  "recommendedApproach": "browser" | "http" | "mixed",
  "reasoning": "explain your analysis",
  "selectors": {
    "productLinks": [".product a", ".item-link"],
    "productName": [".product-name", "h1"],
    "productPrice": [".price", "[itemprop=price]"],
    "productImage": [".product-image img", "[itemprop=image]"]
  }
}`;

    const response = await anthropic.messages.create({
      model: AI_CONFIG.MODEL,
      max_tokens: AI_CONFIG.MAX_TOKENS,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Parse Claude's response
    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    // Extract JSON from response (Claude sometimes wraps it in markdown)
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn(
        { response: content.text },
        "Failed to parse JSON from Claude response",
      );
      // Fallback to basic detection
      return {
        pageType: isProduct ? "product" : "category",
        confidence: 0.5,
        productLinks: isProduct ? [url] : [],
        paginationLinks: [],
        hasJavaScript: false,
        recommendedApproach: "http",
        reasoning: "Fallback analysis due to parsing error",
        selectors: {},
      };
    }

    const analysis: PageAnalysis = JSON.parse(jsonMatch[0]);

    // Make product links absolute and validate them
    const absoluteLinks = analysis.productLinks.map((link) => {
      try {
        return link.startsWith("http") ? link : new URL(link, url).href;
      } catch {
        return link;
      }
    });

    // Filter out invalid/blocked URLs
    analysis.productLinks = filterValidUrls(absoluteLinks);

    return analysis;
  }

  /**
   * Decide scraping strategy based on analysis
   */
  private async decideStrategy(
    url: string,
    analysis: PageAnalysis,
  ): Promise<ScrapingStrategy> {
    // If it's a product page, scrape directly
    if (analysis.pageType === "product") {
      return {
        method: analysis.recommendedApproach === "browser" ? "browser" : "http",
        approach: "direct",
        targetUrls: [url],
        maxDepth: 0,
        selectors: analysis.selectors,
        reasoning: "Direct product page scraping",
      };
    }

    // If it's a category/listing page with products found
    if (analysis.productLinks.length > 0) {
      // Validate all target URLs before proceeding
      const validUrls = filterValidUrls(analysis.productLinks);

      return {
        method: analysis.recommendedApproach === "browser" ? "browser" : "http",
        approach: analysis.paginationLinks.length > 0 ? "crawl" : "direct",
        targetUrls: validUrls,
        maxDepth: analysis.paginationLinks.length > 0 ? 2 : 0,
        selectors: analysis.selectors,
        reasoning: `Found ${validUrls.length} valid product links on category page`,
      };
    }

    // Fallback: try hybrid approach with HTTP method
    return {
      method: "http",
      approach: "hybrid",
      targetUrls: [url],
      maxDepth: 2,
      selectors: analysis.selectors,
      reasoning: "Hybrid approach - will try deep crawl to discover products",
    };
  }

  /**
   * Execute strategy with retry and self-correction
   */
  private async executeWithRetry(
    strategy: ScrapingStrategy,
    config: Partial<ScraperConfig>,
  ): Promise<ScrapedProduct[]> {
    this.attempts = 0;
    let currentStrategy = strategy;

    while (this.attempts < this.maxAttempts) {
      this.attempts++;
      this.history.push(
        `Attempt ${this.attempts}: ${currentStrategy.reasoning}`,
      );

      logger.info(
        { attempt: this.attempts, strategy: currentStrategy },
        "Executing scraping strategy",
      );

      try {
        const result = await this.execute(currentStrategy, config);

        if (result.length > 0) {
          logger.info(
            { productsFound: result.length, attempts: this.attempts },
            "AI Agent scraping succeeded",
          );
          return result;
        }

        // No products found - diagnose and adjust
        logger.warn(
          { attempt: this.attempts },
          "No products found, diagnosing issue",
        );

        const diagnosis = await this.diagnose(
          currentStrategy,
          "No products found",
        );
        logger.info({ diagnosis }, "Diagnosis complete");

        if (diagnosis.alternativeApproach) {
          currentStrategy = diagnosis.alternativeApproach;
          this.history.push(`Adjustment: ${diagnosis.suggestedFix}`);
          continue;
        } else {
          logger.error({ diagnosis }, "No alternative approach available");
          break;
        }
      } catch (error) {
        logger.error({ attempt: this.attempts, error }, "Execution failed");

        const diagnosis = await this.diagnose(
          currentStrategy,
          error instanceof Error ? error.message : "Unknown error",
        );

        if (diagnosis.alternativeApproach && this.attempts < this.maxAttempts) {
          currentStrategy = diagnosis.alternativeApproach;
          this.history.push(`Error recovery: ${diagnosis.suggestedFix}`);
          continue;
        } else {
          throw error;
        }
      }
    }

    logger.warn(
      { attempts: this.attempts, history: this.history },
      "Max attempts reached",
    );
    return [];
  }

  /**
   * Execute the scraping strategy
   */
  private async execute(
    strategy: ScrapingStrategy,
    config: Partial<ScraperConfig>,
  ): Promise<ScrapedProduct[]> {
    const finalConfig = {
      rateLimit: 300,
      timeout: 8000,
      respectRobotsTxt: true,
      maxRetries: 1,
      ...config,
    };

    if (strategy.method === "browser") {
      // Use browser scraper
      const browserScraper = await getBrowserScraper();
      try {
        const results = await browserScraper.scrapeMultipleProducts(
          strategy.targetUrls,
          {
            rateLimit: 2000,
            timeout: 30000,
          },
        );
        return results;
      } finally {
        await closeBrowserScraper();
      }
    } else {
      // Use HTTP scraper
      return await scrapeMultipleProducts(strategy.targetUrls, finalConfig);
    }
  }

  /**
   * Diagnose why scraping failed and suggest corrections
   */
  private async diagnose(
    strategy: ScrapingStrategy,
    error: string,
  ): Promise<Diagnosis> {
    const prompt = `I'm a web scraper and I encountered an issue. Help me diagnose and fix it.

Current Strategy:
${JSON.stringify(strategy, null, 2)}

Error/Issue:
${error}

Scraping History:
${this.history.join("\n")}

Please diagnose the problem and suggest:
1. What likely caused this
2. A fix or alternative approach
3. A new strategy to try

Respond in JSON:
{
  "problem": "brief problem description",
  "likelyCause": "why this happened",
  "suggestedFix": "how to fix it",
  "alternativeApproach": {
    "method": "browser" | "http",
    "approach": "direct" | "crawl",
    "targetUrls": ["url1"],
    "maxDepth": 2,
    "selectors": {},
    "reasoning": "why this approach should work"
  }
}`;

    const response = await anthropic.messages.create({
      model: AI_CONFIG.MODEL,
      max_tokens: AI_CONFIG.MAX_DIAGNOSIS_TOKENS,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        problem: "Unable to diagnose",
        likelyCause: "Unknown",
        suggestedFix: "Try a different approach",
      };
    }

    return JSON.parse(jsonMatch[0]);
  }
}

/**
 * Singleton instance
 */
let aiScraperInstance: AIAgentScraper | null = null;

export function getAIScraper(): AIAgentScraper {
  if (!aiScraperInstance) {
    aiScraperInstance = new AIAgentScraper();
  }
  return aiScraperInstance;
}
