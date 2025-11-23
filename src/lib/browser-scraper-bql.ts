import * as cheerio from "cheerio";
import { createLogger } from "./logger";
import { ScrapedProduct, ScraperConfig } from "./scraper";
import { BROWSER_CONFIG } from "./config";
import { validateScrapingUrl } from "./url-validator";

const logger = createLogger("browser-scraper-bql");

/**
 * Browser-based scraper using BrowserQL (GraphQL API)
 * Compatible with Browserless free tier - no WebSocket required
 * Uses HTTP/GraphQL for browser automation
 */
export class BrowserScraperBQL {
  private endpoint: string;
  private token: string;

  constructor() {
    const token = process.env.BROWSERLESS_TOKEN;
    if (!token) {
      const error = new Error(
        "BROWSERLESS_TOKEN not configured. Please set your Browserless API token in Vercel environment variables.",
      );
      logger.error("BROWSERLESS_TOKEN missing - check environment configuration");
      throw error;
    }

    this.endpoint = BROWSER_CONFIG.BROWSERLESS_ENDPOINT;
    this.token = token;
    logger.info("BrowserScraperBQL initialized successfully");
  }

  /**
   * Execute a BrowserQL GraphQL mutation
   */
  private async executeBQL(
    query: string,
    variables: Record<string, unknown>,
  ): Promise<unknown> {
    const response = await fetch(`${this.endpoint}?token=${this.token}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(
        `BrowserQL request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(`BrowserQL errors: ${JSON.stringify(data.errors)}`);
    }

    return data.data;
  }

  /**
   * Fetch HTML and extract live image URL using BrowserQL
   */
  async fetchHTMLWithImage(
    url: string,
  ): Promise<{ html: string; imageUrl: string | null }> {
    // Validate URL to prevent SSRF attacks
    validateScrapingUrl(url);

    logger.info({ url }, "Fetching page with BrowserQL");

    // Step 1: Navigate and get HTML
    const gotoQuery = `
      mutation GotoPage($url: String!) {
        goto(url: $url, waitUntil: networkidle0) {
          status
        }
        wait(timeout: ${BROWSER_CONFIG.BQL_WAIT_TIMEOUT})
        html {
          content
        }
      }
    `;

    const gotoData = (await this.executeBQL(gotoQuery, { url })) as {
      html: { content: string };
    };

    const html = gotoData.html.content;

    // Step 2: Execute JavaScript to extract image URL (separate mutation)
    // Use proper JavaScript as a variable to avoid quote escaping issues
    const imageExtractionScript = `
      (async function scrollAndExtract() {
        // Scroll to trigger lazy loading
        let previousHeight = 0;
        let attempts = 0;
        const maxAttempts = ${BROWSER_CONFIG.MAX_SCROLL_ATTEMPTS};

        while (attempts < maxAttempts) {
          const currentHeight = document.body.scrollHeight;

          if (currentHeight === previousHeight) {
            attempts++;
            if (attempts >= 3) break;
          } else {
            attempts = 0;
          }

          previousHeight = currentHeight;
          window.scrollTo(0, currentHeight);
          await new Promise(r => setTimeout(r, ${BROWSER_CONFIG.SCROLL_INTERVAL}));
        }

        // Scroll back to top
        window.scrollTo(0, 0);
        await new Promise(r => setTimeout(r, ${BROWSER_CONFIG.POST_SCROLL_WAIT}));

        // Extract image URL from live DOM
        const selectors = [
          'meta[property="og:image"]',
          '[itemprop="image"]',
          'img[class*="product"]',
          'img.main-image',
          '.product-images img',
          '.product-image img',
          'picture img',
          'img[data-src]',
          'img[src]'
        ];

        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element) {
            if (selector.startsWith('meta')) {
              const content = element.getAttribute('content');
              if (content && content.trim()) return content;
            } else {
              const img = element;
              if (img.src && !img.src.includes('data:image') && !img.src.includes('placeholder')) {
                return img.src;
              }
              const dataSrc = img.getAttribute('data-src') ||
                            img.getAttribute('data-lazy') ||
                            img.getAttribute('data-original') ||
                            img.getAttribute('data-image');
              if (dataSrc) return dataSrc;
            }
          }
        }

        return null;
      })()
    `;

    const evaluateQuery = `
      mutation EvaluateScript($script: String!) {
        evaluate(expression: $script) {
          value
        }
      }
    `;

    const evaluateData = (await this.executeBQL(evaluateQuery, {
      script: imageExtractionScript,
    })) as {
      evaluate?: { value: string };
    };

    const imageUrl = evaluateData.evaluate?.value || null;

    logger.info(
      {
        url,
        htmlLength: html.length,
        hasImage: !!imageUrl,
        imageUrl: imageUrl?.substring(0, 50),
      },
      "Successfully fetched HTML with BrowserQL",
    );

    return { html, imageUrl };
  }

  /**
   * Scrape a product page using BrowserQL
   */
  async scrapeProductPage(url: string): Promise<ScrapedProduct> {
    try {
      const { html, imageUrl: liveImageUrl } =
        await this.fetchHTMLWithImage(url);
      const $ = cheerio.load(html);

      const product: ScrapedProduct = {
        sourceUrl: url,
      };

      // Extract product data using cheerio (same patterns as regular scraper)
      // Try schema.org JSON-LD first
      $('script[type="application/ld+json"]').each((_, script) => {
        try {
          const jsonText = $(script).html() || "{}";

          // Limit JSON size to prevent memory exhaustion (1MB max)
          if (jsonText.length > 1024 * 1024) {
            logger.warn({ size: jsonText.length, url }, "JSON-LD script too large, skipping");
            return;
          }

          const data = JSON.parse(jsonText);
          if (
            data["@type"] === "Product" ||
            data["@context"]?.includes("schema.org")
          ) {
            if (data.name) product.name = data.name;
            if (data.image) {
              product.imageUrl = Array.isArray(data.image)
                ? data.image[0]
                : data.image;
            }
            if (data.offers) {
              const offers = Array.isArray(data.offers)
                ? data.offers[0]
                : data.offers;
              if (offers.price) product.price = parseFloat(offers.price);
            }
            if (data.description) product.description = data.description;
            if (data.sku) product.modelNumber = data.sku;
            if (data.brand) {
              product.manufacturer =
                typeof data.brand === "string" ? data.brand : data.brand.name;
            }
          }
        } catch {
          // Invalid JSON
        }
      });

      // Fallback to HTML extraction
      if (!product.name) {
        product.name =
          $('h1[itemprop="name"]').first().text().trim() ||
          $("h1.product-title").first().text().trim() ||
          $('meta[property="og:title"]').attr("content") ||
          $("title").text().split("|")[0].trim();
      }

      // Extract price
      if (!product.price) {
        const priceText =
          $('[itemprop="price"]').first().attr("content") ||
          $(".price").first().text() ||
          $('[class*="price"]').first().text();

        if (priceText) {
          const priceMatch = priceText
            .replace(/[,$]/g, "")
            .match(/(\d+\.?\d*)/);
          if (priceMatch) {
            product.price = parseFloat(priceMatch[1]);
          }
        }
      }

      // Use image URL extracted from live DOM (2025 best practice)
      // This captures lazy-loaded images that Cheerio misses
      if (!product.imageUrl && liveImageUrl) {
        product.imageUrl = liveImageUrl;
        logger.debug({ liveImageUrl }, "Using image URL from live DOM");
      }

      logger.info(
        {
          url,
          hasName: !!product.name,
          hasPrice: !!product.price,
          hasImage: !!product.imageUrl,
        },
        "Product scraped with BrowserQL",
      );

      return product;
    } catch (error) {
      logger.error(
        {
          url,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        "Failed to scrape product with BrowserQL",
      );
      throw error;
    }
  }

  /**
   * Scrape multiple product pages
   * Now uses parallel processing for improved performance (3 concurrent)
   */
  async scrapeMultipleProducts(
    urls: string[],
    config: Partial<ScraperConfig> = {},
  ): Promise<ScrapedProduct[]> {
    const results: ScrapedProduct[] = [];

    // Parallel processing: scrape 3 products concurrently (BrowserQL free tier limit)
    const batchSize = 3;

    logger.info(
      { totalUrls: urls.length, batchSize, parallel: true },
      "Starting parallel BrowserQL batch scraping",
    );

    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(urls.length / batchSize);

      logger.debug(
        {
          batch: `${batchNumber}/${totalBatches}`,
          urls: batch.length,
          progress: `${Math.min(i + batchSize, urls.length)}/${urls.length}`,
        },
        "Processing BrowserQL batch",
      );

      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(async (url) => {
          try {
            return await this.scrapeProductPage(url);
          } catch (error) {
            logger.error(
              {
                url,
                error: error instanceof Error ? error.message : "Unknown error",
              },
              "Failed to scrape product in parallel BrowserQL batch",
            );
            return { name: `Error: ${url}`, sourceUrl: url };
          }
        }),
      );

      results.push(...batchResults);

      // Rate limiting between batches
      if (i + batchSize < urls.length && config.rateLimit) {
        logger.debug(
          { delay: config.rateLimit, nextBatch: batchNumber + 1 },
          "Applying rate limit delay between BrowserQL batches",
        );
        await new Promise((resolve) => setTimeout(resolve, config.rateLimit));
      }
    }

    const successCount = results.filter((r) => !r.name?.startsWith("Error:"))
      .length;
    const failureCount = urls.length - successCount;

    logger.info(
      {
        totalUrls: urls.length,
        successCount,
        failureCount,
        batches: Math.ceil(urls.length / batchSize),
      },
      "Parallel BrowserQL batch scraping completed",
    );

    return results;
  }
}

// Singleton instance
let browserScraperInstance: BrowserScraperBQL | null = null;

/**
 * Get or create browser scraper instance
 */
export async function getBrowserScraper(): Promise<BrowserScraperBQL> {
  if (!browserScraperInstance) {
    browserScraperInstance = new BrowserScraperBQL();
  }
  return browserScraperInstance;
}

/**
 * Clean up browser scraper (no-op for BrowserQL)
 */
export async function closeBrowserScraper() {
  browserScraperInstance = null;
}
