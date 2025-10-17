import puppeteer, { Browser, Page } from "puppeteer-core";
import * as cheerio from "cheerio";
import { createLogger } from "./logger";
import { ScrapedProduct, ScraperConfig } from "./scraper";

const logger = createLogger("browser-scraper");

/**
 * Browser-based scraper using Puppeteer with remote managed browser
 * Compatible with Browserless, Browserbase, Bright Data, and other managed browser services
 * Connects via WebSocket - no local Chrome binary required
 */
export class BrowserScraper {
  private browser: Browser | null = null;

  /**
   * Initialize connection to remote managed browser
   */
  async init() {
    if (this.browser) return;

    const endpoint = process.env.BROWSER_WS_ENDPOINT;
    if (!endpoint) {
      throw new Error(
        "BROWSER_WS_ENDPOINT not configured. Please set it to your managed browser WebSocket URL (Browserless, Browserbase, etc.)",
      );
    }

    logger.info(
      { endpoint: endpoint.split("?")[0] },
      "Connecting to remote managed browser",
    );

    try {
      this.browser = await puppeteer.connect({
        browserWSEndpoint: endpoint,
      });

      logger.info("Successfully connected to remote browser");
    } catch (error) {
      logger.error({ error }, "Failed to connect to remote browser");
      throw error;
    }
  }

  /**
   * Close the browser connection
   */
  async close() {
    if (this.browser) {
      await this.browser.disconnect();
      this.browser = null;
      logger.info("Browser disconnected");
    }
  }

  /**
   * Fetch HTML using remote browser (bypasses bot detection)
   */
  async fetchHTML(
    url: string,
    config: Partial<ScraperConfig> = {},
  ): Promise<string> {
    await this.init();

    const page = await this.browser!.newPage();

    try {
      // Set larger viewport for lazy-loaded content (2025 best practice)
      await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
      });

      // Set realistic User-Agent
      await page.setUserAgent(
        config.userAgent ||
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      );

      // Set additional headers to mimic real browser
      await page.setExtraHTTPHeaders({
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      });

      // Optional: block unnecessary resources for faster loading
      await page.setRequestInterception(true);
      page.on("request", (request) => {
        // Block ads, analytics, and other tracking to reduce fingerprint
        const url = request.url();
        if (
          /googletagmanager|doubleclick|facebook|analytics|hotjar|segment|optimizely/i.test(
            url,
          )
        ) {
          request.abort();
        } else {
          request.continue();
        }
      });

      logger.info({ url }, "Fetching page with remote browser");

      // Navigate with timeout
      await page.goto(url, {
        waitUntil: "networkidle0",
        timeout: config.timeout || 30000,
      });

      // Wait for images to load
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Scroll to trigger lazy loading
      await this.scrollPage(page);

      // Wait for lazy-loaded images
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Get the fully rendered HTML
      const html = await page.content();

      logger.info(
        { url, htmlLength: html.length },
        "Successfully fetched HTML with remote browser",
      );

      return html;
    } catch (error) {
      logger.error(
        {
          url,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        "Failed to fetch HTML with remote browser",
      );
      throw error;
    } finally {
      await page.close();
    }
  }

  /**
   * Scroll the page to trigger lazy-loaded images
   * Uses 2025 best practice: check if new content is loaded between scrolls
   */
  private async scrollPage(page: Page) {
    await page.evaluate(async () => {
      return new Promise<void>((resolve) => {
        let previousHeight = 0;
        let attempts = 0;
        const maxAttempts = 10;

        const scrollInterval = setInterval(async () => {
          const currentHeight = document.body.scrollHeight;

          // Check if new content loaded
          if (currentHeight === previousHeight) {
            attempts++;
            if (attempts >= 3) {
              // No new content after 3 attempts, we're done
              clearInterval(scrollInterval);
              window.scrollTo(0, 0); // Scroll back to top
              setTimeout(resolve, 500);
              return;
            }
          } else {
            attempts = 0; // Reset if new content loaded
          }

          if (attempts >= maxAttempts) {
            clearInterval(scrollInterval);
            window.scrollTo(0, 0);
            setTimeout(resolve, 500);
            return;
          }

          previousHeight = currentHeight;
          window.scrollTo(0, currentHeight);
        }, 1500); // 1.5s wait between scrolls (2025 best practice)
      });
    });
  }

  /**
   * Extract image URL from live DOM (2025 best practice)
   * Uses .src property instead of getAttribute for dynamic images
   */
  private async extractImageUrl(page: Page): Promise<string | null> {
    return await page.evaluate(() => {
      // Try multiple selectors in order of priority
      const selectors = [
        'meta[property="og:image"]',
        '[itemprop="image"]',
        'img[class*="product"]',
        "img.main-image",
        ".product-images img",
        ".product-image img",
        "picture img",
        "img[data-src]",
        "img[src]",
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          // For meta tags, use content attribute
          if (selector.startsWith("meta")) {
            const content = element.getAttribute("content");
            if (content && content.trim()) return content;
          } else {
            // For img tags, use .src property (live DOM value, not attribute)
            const img = element as HTMLImageElement;
            if (
              img.src &&
              !img.src.includes("data:image") &&
              !img.src.includes("placeholder")
            ) {
              return img.src;
            }
            // Fallback to data attributes
            const dataSrc =
              img.getAttribute("data-src") ||
              img.getAttribute("data-lazy") ||
              img.getAttribute("data-original") ||
              img.getAttribute("data-image");
            if (dataSrc) return dataSrc;
          }
        }
      }

      return null;
    });
  }

  /**
   * Scrape a product page using remote browser
   * Updated 2025: Extract images from live DOM before parsing static HTML
   */
  async scrapeProductPage(
    url: string,
    config: Partial<ScraperConfig> = {},
  ): Promise<ScrapedProduct> {
    await this.init();
    const page = await this.browser!.newPage();

    try {
      // Set larger viewport for lazy-loaded content
      await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
      });

      // Set realistic User-Agent
      await page.setUserAgent(
        config.userAgent ||
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      );

      // Set additional headers
      await page.setExtraHTTPHeaders({
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      });

      // Block ads and trackers
      await page.setRequestInterception(true);
      page.on("request", (request) => {
        const requestUrl = request.url();
        if (
          /googletagmanager|doubleclick|facebook|analytics|hotjar|segment|optimizely/i.test(
            requestUrl,
          )
        ) {
          request.abort();
        } else {
          request.continue();
        }
      });

      logger.info({ url }, "Scraping product page with remote browser");

      // Navigate to page
      await page.goto(url, {
        waitUntil: "networkidle0",
        timeout: config.timeout || 30000,
      });

      // Wait for initial content
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Scroll to trigger lazy loading
      await this.scrollPage(page);

      // Wait for lazy-loaded images
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // CRITICAL: Extract image URL from live DOM BEFORE parsing HTML
      const liveImageUrl = await this.extractImageUrl(page);
      logger.debug({ liveImageUrl }, "Extracted image URL from live DOM");

      // Now get the HTML for Cheerio parsing
      const html = await page.content();
      const $ = cheerio.load(html);

      // Use the same extraction logic as the regular scraper
      const product: ScrapedProduct = {
        sourceUrl: url,
      };

      // Extract product data using cheerio (same patterns as regular scraper)
      // Try schema.org JSON-LD first
      $('script[type="application/ld+json"]').each((_, script) => {
        try {
          const data = JSON.parse($(script).html() || "{}");
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
        "Product scraped with remote browser",
      );

      return product;
    } catch (error) {
      logger.error(
        {
          url,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        "Failed to scrape product with remote browser",
      );
      throw error;
    } finally {
      await page.close();
    }
  }

  /**
   * Scrape multiple product pages
   */
  async scrapeMultipleProducts(
    urls: string[],
    config: Partial<ScraperConfig> = {},
  ): Promise<ScrapedProduct[]> {
    const results: ScrapedProduct[] = [];

    logger.info(
      { totalUrls: urls.length },
      "Starting remote browser batch scraping",
    );

    for (let i = 0; i < urls.length; i++) {
      try {
        const product = await this.scrapeProductPage(urls[i], config);
        results.push(product);

        // Rate limiting
        if (i < urls.length - 1 && config.rateLimit) {
          await new Promise((resolve) => setTimeout(resolve, config.rateLimit));
        }
      } catch (error) {
        logger.error(
          {
            url: urls[i],
            error: error instanceof Error ? error.message : "Unknown error",
          },
          "Failed to scrape product in batch",
        );
        results.push({ name: `Error: ${urls[i]}`, sourceUrl: urls[i] });
      }
    }

    logger.info(
      {
        totalUrls: urls.length,
        successCount: results.filter((r) => !r.name?.startsWith("Error:"))
          .length,
      },
      "Remote browser batch scraping completed",
    );

    return results;
  }
}

// Singleton instance
let browserScraperInstance: BrowserScraper | null = null;

/**
 * Get or create browser scraper instance
 */
export async function getBrowserScraper(): Promise<BrowserScraper> {
  if (!browserScraperInstance) {
    browserScraperInstance = new BrowserScraper();
    await browserScraperInstance.init();
  }
  return browserScraperInstance;
}

/**
 * Clean up browser scraper
 */
export async function closeBrowserScraper() {
  if (browserScraperInstance) {
    await browserScraperInstance.close();
    browserScraperInstance = null;
  }
}
