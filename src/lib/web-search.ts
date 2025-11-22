/**
 * Web Search Integration
 *
 * Provides basic web search capability for the AI assistant.
 * Uses a simple fetch-based approach to search the web when needed.
 */

import * as cheerio from "cheerio";
import { createLogger } from "./logger";

const logger = createLogger("web-search");

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

/**
 * Search the web using DuckDuckGo HTML (no API key required)
 */
export async function searchWeb(
  query: string,
  maxResults = 5,
): Promise<SearchResult[]> {
  logger.info({ query, maxResults }, "Performing web search");

  try {
    // Use DuckDuckGo HTML (no API key needed)
    const encodedQuery = encodeURIComponent(query);
    const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      logger.warn({ status: response.status }, "Search request failed");
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const results: SearchResult[] = [];

    // Parse DuckDuckGo results
    $(".result").each((_, element) => {
      if (results.length >= maxResults) return false;

      const $el = $(element);
      const titleEl = $el.find(".result__title a");
      const snippetEl = $el.find(".result__snippet");
      const urlEl = $el.find(".result__url");

      const title = titleEl.text().trim();
      const snippet = snippetEl.text().trim();
      let url = titleEl.attr("href") || "";

      // DuckDuckGo wraps URLs - extract actual URL
      if (url.startsWith("//duckduckgo.com/l/?")) {
        const urlMatch = url.match(/uddg=([^&]+)/);
        if (urlMatch) {
          url = decodeURIComponent(urlMatch[1]);
        }
      }

      if (title && url && snippet) {
        results.push({ title, url, snippet });
      }
    });

    logger.info({ resultCount: results.length }, "Web search completed");
    return results;
  } catch (error) {
    logger.error({ error, query }, "Web search failed");
    return [];
  }
}

/**
 * Fetch and extract text content from a URL
 */
export async function fetchPageContent(
  url: string,
  maxLength = 5000,
): Promise<string> {
  logger.info({ url }, "Fetching page content");

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      logger.warn({ status: response.status, url }, "Failed to fetch page");
      return "";
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove script and style tags
    $("script, style, nav, footer, header").remove();

    // Extract main content
    const mainContent =
      $("main").text() || $("article").text() || $("body").text();

    // Clean up whitespace
    const cleaned = mainContent
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, maxLength);

    logger.info(
      { url, contentLength: cleaned.length },
      "Page content fetched",
    );
    return cleaned;
  } catch (error) {
    logger.error({ error, url }, "Failed to fetch page content");
    return "";
  }
}

/**
 * Format search results for AI context
 */
export function formatSearchResultsForAI(results: SearchResult[]): string {
  if (results.length === 0) {
    return "No search results found.";
  }

  return results
    .map(
      (result, index) =>
        `${index + 1}. ${result.title}
URL: ${result.url}
${result.snippet}`,
    )
    .join("\n\n");
}

/**
 * Perform a web search and return formatted results for AI
 */
export async function searchWebForAI(
  query: string,
  maxResults = 3,
): Promise<string> {
  logger.info({ query }, "Web search for AI context");

  const results = await searchWeb(query, maxResults);

  if (results.length === 0) {
    return `I searched the web but couldn't find relevant results for: "${query}"`;
  }

  return `Web search results for "${query}":\n\n${formatSearchResultsForAI(results)}`;
}
