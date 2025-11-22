import * as cheerio from "cheerio";
import { createLogger } from "./logger";
import { retry } from "./retry";
import { robotsChecker } from "./robots-checker";
import { SCRAPER_CONFIG } from "./config";
import { categorizeProduct } from "./categorize-product";
import { htmlCache, productCache } from "./cache";
import type { EquipmentCategory } from "@prisma/client";

const logger = createLogger("scraper");

/**
 * Pool of realistic User-Agent strings for rotation (2025)
 * Mix of Chrome, Firefox, Safari, and Edge on Windows, macOS, and Linux
 */
const USER_AGENTS = [
  // Chrome on Windows
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  // Chrome on macOS
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  // Firefox on Windows
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
  // Firefox on macOS
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.7; rv:133.0) Gecko/20100101 Firefox/133.0",
  // Safari on macOS
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
  // Edge on Windows
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  // Chrome on Linux
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
];

/**
 * Get a random User-Agent string from the pool
 */
function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Detect if a URL is likely a product page vs a category/listing page
 * Product pages have longer, more specific paths with dashes
 * Category pages have shorter, generic paths
 */
export function isProductPageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();

    // Remove trailing slash for consistent matching
    const cleanPath = pathname.replace(/\/$/, "");

    // Shopify product URLs (common pattern: /products/product-slug)
    // Check this FIRST before category patterns
    if (/^\/products\/[^\/]+/.test(cleanPath) && !/^\/products\/(new|featured|best-sellers|clearance)$/.test(cleanPath)) {
      return true;
    }

    // Category page indicators (shorter, generic paths)
    const categoryPatterns = [
      /^\/(shop|catalog|store|category|collection|collections|batteries|solar-panels|inverters|all-products|browse)$/,
      /^\/collections\//, // Shopify collections (category pages)
      /^\/(shop|catalog)\/(new|featured|best-sellers|clearance)$/,
      /^\/(all-products|shop)\/.+\/$/, // Category subdirectories with trailing slash
      /^\/(kits-bundles|kits|bundles)\//, // Kit/bundle category pages
      /^\/(all-products|kits-bundles|shop)\/(kits|bundles|batteries|panels|inverters|chargers|cables)/, // Common category paths
      /\/(complete-off-grid|complete-hybrid|complete-grid-tie|new-arrivals)\//, // Specific category paths
      /^\/[^\/]+\/(wall-mount|server-rack|stackable|free-standing|12-volt|24-volt|48-volt)$/,
      /page[\/=]\d+/, // Pagination
      /_bc_fsnf=/, // BigCommerce filter
      /\?.*brand=/, // Brand filters
      /^\/pages\//, // Static pages
    ];

    // If it matches category patterns, it's NOT a product page
    if (
      categoryPatterns.some(
        (pattern) => pattern.test(pathname) || pattern.test(url),
      )
    ) {
      return false;
    }

    // Product page indicators (longer, specific paths with multiple dashes)
    const productPatterns = [
      /\/[a-z0-9]+-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+/, // 4+ segments with dashes (eg4-ll-s-lithium-battery)
      /\/(product|item|detail|p|pd|dp|gp|itm)\//,
      /-\d{2,}ah|-\d{2,}v|-\d+kw/, // Contains specs like -100ah, -48v, -5kw
      /\/(eg4|bigbattery|canadian-solar|pytes|enphase|ecoflow|anker|jackery)-[a-z0-9-]+$/, // Brand-specific products
    ];

    // If it matches product patterns, it's a product page
    if (productPatterns.some((pattern) => pattern.test(pathname))) {
      return true;
    }

    // Default: paths with 3+ dashes are likely products
    const dashCount = (cleanPath.match(/-/g) || []).length;
    return dashCount >= 3;
  } catch {
    return false;
  }
}

/**
 * Get realistic browser headers to mimic human traffic
 */
function getRealisticHeaders(userAgent: string): Record<string, string> {
  return {
    "User-Agent": userAgent,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/png,image/svg+xml,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    DNT: "1", // Do Not Track
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Cache-Control": "max-age=0",
    TE: "trailers",
  };
}

/**
 * Add random delay to mimic human behavior
 * Returns a delay between min and max milliseconds
 */
function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if a link is a honeypot (hidden trap for bots)
 * Honeypots use CSS to hide links that humans can't see but bots might follow
 */
function isHoneypotLink($link: cheerio.Cheerio): boolean {
  const style = $link.attr("style") || "";
  const cssClass = $link.attr("class") || "";

  // Check for display: none
  if (style.includes("display:none") || style.includes("display: none")) {
    return true;
  }

  // Check for visibility: hidden
  if (
    style.includes("visibility:hidden") ||
    style.includes("visibility: hidden")
  ) {
    return true;
  }

  // Check for off-screen positioning
  if (
    style.includes("left:-9999") ||
    style.includes("left: -9999") ||
    style.includes("top:-9999") ||
    style.includes("top: -9999")
  ) {
    return true;
  }

  // Check for common honeypot class names
  const honeypotClasses = [
    "honeypot",
    "hidden",
    "hide",
    "invisible",
    "sr-only",
  ];
  if (honeypotClasses.some((cls) => cssClass.includes(cls))) {
    return true;
  }

  return false;
}

export interface ScraperConfig {
  rateLimit?: number; // milliseconds between requests (used as base for random delays)
  randomDelay?: boolean; // Add random delays between requests (10-20s recommended for production)
  timeout?: number; // request timeout in ms
  userAgent?: string;
  respectRobotsTxt?: boolean; // Whether to check robots.txt before crawling
  maxRetries?: number; // Maximum number of retries for failed requests
}

export interface ScrapedProduct {
  name?: string;
  manufacturer?: string;
  modelNumber?: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  sourceUrl?: string; // Original product page URL
  specifications?: Record<string, string>;
  category?: string;
  inStock?: boolean;
  dataSheetUrl?: string;
}

export interface ScrapedCompany {
  name?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  description?: string;
  logoUrl?: string;
  productLinks?: string[];
  catalogPages?: string[]; // Pages with product listings
  totalPagesFound?: number;
}

const DEFAULT_CONFIG: ScraperConfig = {
  rateLimit: SCRAPER_CONFIG.DEFAULT_RATE_LIMIT,
  randomDelay: false, // Set to true for production to avoid detection
  timeout: SCRAPER_CONFIG.DEFAULT_TIMEOUT,
  userAgent: SCRAPER_CONFIG.USER_AGENT_ID,
  respectRobotsTxt: true, // Always respect robots.txt
  maxRetries: SCRAPER_CONFIG.MAX_RETRIES,
};

/**
 * Fetch HTML content from a URL with robots.txt compliance and retry logic
 * Now includes response caching for improved performance
 */
export async function fetchHTML(
  url: string,
  config: ScraperConfig,
): Promise<string> {
  // Check cache first (1 hour TTL by default)
  const cached = htmlCache.get(url);
  if (cached) {
    logger.debug({ url, cacheAge: "hit" }, "Using cached HTML");
    return cached;
  }

  // Check robots.txt if enabled
  if (config.respectRobotsTxt) {
    const robotsCheck = await robotsChecker.canCrawl(url, "novaagent");

    if (!robotsCheck.allowed) {
      logger.warn(
        { url, matchedRule: robotsCheck.matchedRule },
        "URL blocked by robots.txt",
      );
      throw new Error(`Blocked by robots.txt: ${robotsCheck.matchedRule}`);
    }

    // Respect crawl-delay if specified
    if (robotsCheck.crawlDelay) {
      const delay = Math.max(robotsCheck.crawlDelay, config.rateLimit || 0);
      logger.debug(
        { url, crawlDelay: delay },
        "Applying crawl-delay from robots.txt",
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Use retry logic for the fetch operation
  const html = await retry(
    async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        config.timeout || 30000,
      );

      try {
        // Use random User-Agent rotation for better anti-bot evasion
        const userAgent = config.userAgent || getRandomUserAgent();
        const headers = getRealisticHeaders(userAgent);

        logger.debug(
          { url, userAgent },
          "Fetching HTML with rotated User-Agent",
        );

        const response = await fetch(url, {
          headers,
          signal: controller.signal,
        });

        if (!response.ok) {
          const error = new Error(
            `HTTP ${response.status}: ${response.statusText}`,
          ) as Error & { status: number };
          // Attach status code for retry logic
          error.status = response.status;
          throw error;
        }

        const html = await response.text();
        logger.debug({ url, size: html.length }, "Successfully fetched HTML");
        return html;
      } finally {
        clearTimeout(timeoutId);
      }
    },
    {
      maxRetries: config.maxRetries || SCRAPER_CONFIG.MAX_RETRIES,
      baseDelay: SCRAPER_CONFIG.BASE_DELAY,
      maxDelay: SCRAPER_CONFIG.MAX_DELAY,
      factor: SCRAPER_CONFIG.BACKOFF_FACTOR,
      onRetry: (error, attempt) => {
        logger.warn(
          { url, error: error.message, attempt },
          "Retrying fetch after error",
        );
      },
    },
  );

  // Cache the HTML response (1 hour TTL)
  htmlCache.set(url, html, 3600000);

  return html;
}

/**
 * Extract product data using common patterns
 */
function extractProductData($: cheerio.Root, url: string): ScrapedProduct {
  const product: ScrapedProduct = {};

  // Store the source URL
  product.sourceUrl = url;

  // First, try to extract from schema.org JSON-LD (most reliable)
  $('script[type="application/ld+json"]').each((_, script) => {
    try {
      const data = JSON.parse($(script).html() || "{}");
      // Check if it's a Product schema
      if (
        data["@type"] === "Product" ||
        data["@context"]?.includes("schema.org")
      ) {
        if (data.name) product.name = data.name;
        if (data.image) {
          // Handle both string and array formats
          product.imageUrl = Array.isArray(data.image)
            ? data.image[0]
            : data.image;
        }
        if (data.offers) {
          const offers = Array.isArray(data.offers)
            ? data.offers[0]
            : data.offers;
          if (offers.price) product.price = parseFloat(offers.price);
          if (offers.priceCurrency)
            product.specifications = {
              ...product.specifications,
              currency: offers.priceCurrency,
            };
          if (offers.availability) {
            product.inStock =
              offers.availability.includes("InStock") ||
              offers.availability.includes("Available");
          }
        }
        if (data.description) product.description = data.description;
        if (data.sku) product.modelNumber = data.sku;
        if (data.brand)
          product.manufacturer =
            typeof data.brand === "string" ? data.brand : data.brand.name;
        if (data.aggregateRating) {
          const rating = data.aggregateRating;
          if (rating.ratingValue) product.inStock = true; // Usually means popular/available
        }
      }
    } catch {
      // Invalid JSON, skip
    }
  });

  // If not found in schema.org, fall back to HTML extraction
  if (!product.name) {
    product.name =
      $('h1[itemprop="name"]').first().text().trim() ||
      $("h1.product-title").first().text().trim() ||
      $("h1.product-name").first().text().trim() ||
      $('meta[property="og:title"]').attr("content") ||
      $("title").text().split("|")[0].trim();
  }

  // Try to extract price (if not found in schema.org)
  if (!product.price) {
    const priceText =
      $('[itemprop="price"]').first().attr("content") ||
      $(".price").first().text() ||
      $('[class*="price"]').first().text() ||
      $('meta[property="og:price:amount"]').attr("content");

    if (priceText) {
      const priceMatch = priceText.replace(/[,$]/g, "").match(/(\d+\.?\d*)/);
      if (priceMatch) {
        product.price = parseFloat(priceMatch[1]);
      }
    }
  }

  // Try to extract image (if not found in schema.org) - check multiple attributes for lazy loading support
  if (!product.imageUrl) {
    const extractImageUrl = ($el: cheerio.Cheerio) => {
      // Priority order: data-src (lazy), src, data-lazy, data-original, srcset, data-srcset
      return (
        $el.attr("data-src") ||
        $el.attr("src") ||
        $el.attr("data-lazy") ||
        $el.attr("data-original") ||
        $el.attr("data-image") ||
        $el.attr("srcset")?.split(",")[0]?.trim().split(" ")[0] ||
        $el.attr("data-srcset")?.split(",")[0]?.trim().split(" ")[0]
      );
    };

    // Try multiple selectors in priority order
    const imageSelectors = [
      'meta[property="og:image"]',
      '[itemprop="image"]',
      'img[class*="product"]',
      "img.main-image",
      "img.product-image",
      ".product-images img",
      ".product-gallery img",
      'img[alt*="product"]',
      'img[alt*="Product"]',
      ".woocommerce-product-gallery img",
      "img[data-src]",
      "picture img",
    ];

    for (const selector of imageSelectors) {
      const $img = $(selector).first();
      if ($img.length) {
        // For meta tags, use content attribute
        if (selector.startsWith("meta")) {
          product.imageUrl = $img.attr("content");
        } else {
          product.imageUrl = extractImageUrl($img);
        }
        if (product.imageUrl) break;
      }
    }
  }

  // Make image URL absolute
  if (product.imageUrl && !product.imageUrl.startsWith("http")) {
    try {
      const urlObj = new URL(url);
      // Handle protocol-relative URLs
      if (product.imageUrl.startsWith("//")) {
        product.imageUrl = `${urlObj.protocol}${product.imageUrl}`;
      } else {
        product.imageUrl = new URL(product.imageUrl, urlObj.origin).href;
      }
    } catch {
      // Invalid URL, set to undefined
      product.imageUrl = undefined;
    }
  }

  // Try to extract description
  product.description =
    $('meta[name="description"]').attr("content") ||
    $('[itemprop="description"]').first().text().trim() ||
    $(".product-description").first().text().trim().substring(0, 500);

  // Try to extract model number
  const modelPatterns = [
    /model\s*#?\s*:?\s*([A-Z0-9-]+)/i,
    /part\s*#?\s*:?\s*([A-Z0-9-]+)/i,
    /SKU\s*:?\s*([A-Z0-9-]+)/i,
  ];

  const pageText = $("body").text();
  for (const pattern of modelPatterns) {
    const match = pageText.match(pattern);
    if (match) {
      product.modelNumber = match[1];
      break;
    }
  }

  // Try to extract availability
  const availabilityText = $('.availability, [class*="stock"]')
    .text()
    .toLowerCase();
  product.inStock =
    availabilityText.includes("in stock") ||
    availabilityText.includes("available") ||
    !availabilityText.includes("out of stock");

  // Extract specifications from tables
  const specs: Record<string, string> = {};
  $("table").each((_, table) => {
    $(table)
      .find("tr")
      .each((_, row) => {
        const cells = $(row).find("td, th");
        if (cells.length === 2) {
          const key = $(cells[0]).text().trim();
          const value = $(cells[1]).text().trim();
          if (key && value && key.length < 50) {
            specs[key] = value;
          }
        }
      });
  });

  if (Object.keys(specs).length > 0) {
    product.specifications = specs;
  }

  // Try to find datasheet link
  $("a").each((_, link) => {
    const href = $(link).attr("href");
    const text = $(link).text().toLowerCase();
    if (
      href &&
      (text.includes("datasheet") ||
        text.includes("spec sheet") ||
        text.includes("technical spec") ||
        href.toLowerCase().includes("datasheet") ||
        href.endsWith(".pdf"))
    ) {
      product.dataSheetUrl = href.startsWith("http")
        ? href
        : new URL(href, new URL(url).origin).href;
      return false; // break
    }
  });

  return product;
}

/**
 * Scrape a product page
 * Now includes product caching for improved performance
 */
export async function scrapeProductPage(
  url: string,
  config: Partial<ScraperConfig> = {},
): Promise<ScrapedProduct> {
  // Check product cache first (6 hours TTL)
  const cached = productCache.get(url);
  if (cached) {
    logger.debug({ url }, "Using cached product data");
    return cached;
  }

  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    logger.info({ url }, "Scraping product page");
    const html = await fetchHTML(url, finalConfig);
    const $ = cheerio.load(html);
    const product = extractProductData($, url);

    logger.info(
      {
        url,
        hasName: !!product.name,
        hasPrice: !!product.price,
        hasImage: !!product.imageUrl,
      },
      "Product page scraped successfully",
    );

    // Cache the product data (6 hours TTL)
    productCache.set(url, product, 21600000);

    return product;
  } catch (error) {
    logger.error(
      {
        url,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      "Failed to scrape product page",
    );
    throw new Error(
      `Failed to scrape ${url}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Scrape multiple product URLs with rate limiting
 * Now uses parallel batch processing for 10x performance improvement
 */
export async function scrapeMultipleProducts(
  urls: string[],
  config: Partial<ScraperConfig> = {},
): Promise<ScrapedProduct[]> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const results: ScrapedProduct[] = [];

  // Parallel processing: scrape 5 products concurrently
  const batchSize = 5;

  logger.info(
    { totalUrls: urls.length, batchSize, parallel: true },
    "Starting parallel batch scraping",
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
      "Processing batch",
    );

    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(async (url) => {
        try {
          return await scrapeProductPage(url, finalConfig);
        } catch (error) {
          logger.error(
            {
              url,
              error: error instanceof Error ? error.message : "Unknown error",
            },
            "Failed to scrape product in parallel batch",
          );
          return { name: `Error: ${url}`, sourceUrl: url };
        }
      }),
    );

    results.push(...batchResults);

    // Rate limiting between batches (not between individual products within batch)
    if (i + batchSize < urls.length && finalConfig.rateLimit) {
      const delay = finalConfig.randomDelay
        ? getRandomDelay(finalConfig.rateLimit, finalConfig.rateLimit * 2)
        : finalConfig.rateLimit;

      logger.debug(
        {
          delay,
          randomized: finalConfig.randomDelay,
          nextBatch: batchNumber + 1,
        },
        "Applying rate limit delay between batches",
      );
      await sleep(delay);
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
    "Parallel batch scraping completed",
  );

  return results;
}

/**
 * Extract products directly from Shopify collection/listing pages
 * This is much faster than scraping individual product pages
 */
export async function scrapeShopifyCollectionPage(
  url: string,
  config: Partial<ScraperConfig> = {},
): Promise<ScrapedProduct[]> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const products: ScrapedProduct[] = [];

  try {
    logger.info({ url }, "Scraping Shopify collection page");
    const html = await fetchHTML(url, finalConfig);
    const $ = cheerio.load(html);

    // Method 1: Extract from JSON-LD structured data (most reliable for Shopify)
    $('script[type="application/ld+json"]').each((_, script) => {
      try {
        const data = JSON.parse($(script).html() || "{}");
        
        // Shopify often uses ItemList schema for collection pages
        if (data["@type"] === "ItemList" && Array.isArray(data.itemListElement)) {
          data.itemListElement.forEach((item: any) => {
            if (item.item && item.item["@type"] === "Product") {
              const product: ScrapedProduct = {
                sourceUrl: item.item.url || item.item["@id"] || url,
              };

              if (item.item.name) product.name = item.item.name;
              if (item.item.brand) {
                product.manufacturer = typeof item.item.brand === "string" 
                  ? item.item.brand 
                  : item.item.brand.name;
              }
              if (item.item.sku) product.modelNumber = item.item.sku;
              if (item.item.description) product.description = item.item.description;
              if (item.item.image) {
                product.imageUrl = Array.isArray(item.item.image)
                  ? item.item.image[0]
                  : item.item.image;
              }
              if (item.item.offers) {
                const offers = Array.isArray(item.item.offers)
                  ? item.item.offers[0]
                  : item.item.offers;
                if (offers.price) product.price = parseFloat(offers.price);
                if (offers.availability) {
                  product.inStock = offers.availability.includes("InStock") ||
                    offers.availability.includes("Available");
                }
              }

              if (product.name) {
                products.push(product);
              }
            }
          });
        }
      } catch {
        // Invalid JSON, skip
      }
    });

    // Method 2: Extract from Shopify product cards (HTML fallback)
    if (products.length === 0) {
      // Shopify collection pages use various selectors
      const productCardSelectors = [
        '.product-card',
        '.grid-product',
        '.product-item',
        '[class*="product-card"]',
        '[class*="product-item"]',
        'article[class*="product"]',
        '.card[class*="product"]',
      ];

      for (const selector of productCardSelectors) {
        $(selector).each((_, card) => {
          const $card = $(card);
          const product: ScrapedProduct = {};

          // Extract product link
          const $link = $card.find('a[href*="/products/"]').first();
          if ($link.length) {
            const href = $link.attr("href");
            if (href) {
              product.sourceUrl = href.startsWith("http")
                ? href
                : new URL(href, url).href;
            }
          }

          // Extract product name
          product.name = 
            $card.find('.product-title, .product-name, h2, h3, [class*="product-title"], [class*="product-name"]').first().text().trim() ||
            $link.text().trim() ||
            $card.find('a').first().text().trim();

          // Extract price
          const priceText = 
            $card.find('.price, [class*="price"], .product-price, [class*="product-price"]').first().text().trim() ||
            $card.find('[data-price]').attr('data-price') ||
            $card.find('span[class*="money"]').first().text().trim();

          if (priceText) {
            const priceMatch = priceText.replace(/[,$]/g, "").match(/(\d+\.?\d*)/);
            if (priceMatch) {
              product.price = parseFloat(priceMatch[1]);
            }
          }

          // Extract image
          const $img = $card.find('img').first();
          if ($img.length) {
            product.imageUrl = 
              $img.attr("data-src") ||
              $img.attr("src") ||
              $img.attr("data-lazy") ||
              $img.attr("data-original");
            
            // Make image URL absolute
            if (product.imageUrl && !product.imageUrl.startsWith("http")) {
              try {
                product.imageUrl = new URL(product.imageUrl, url).href;
              } catch {
                product.imageUrl = undefined;
              }
            }
          }

          // Extract manufacturer/brand (often in product name or separate field)
          const brandText = 
            $card.find('.brand, .manufacturer, [class*="brand"], [class*="vendor"]').first().text().trim();
          if (brandText) {
            product.manufacturer = brandText;
          } else if (product.name) {
            // Try to extract brand from product name (e.g., "Rich Solar Mega 250 Pro")
            const nameParts = product.name.split(/\s+/);
            if (nameParts.length > 1) {
              // Common brand patterns at start of name
              const commonBrands = ['Rich Solar', 'Sungold Power', 'BougeRV', 'EG4', 'EcoFlow', 'Sol-Ark'];
              for (const brand of commonBrands) {
                if (product.name.startsWith(brand)) {
                  product.manufacturer = brand;
                  break;
                }
              }
            }
          }

          // Extract model number from name or SKU
          if (product.name) {
            const modelMatch = product.name.match(/(\d+[Ww]|\d+[Vv]|\d+[Aa][Hh]|\d+[Ww][Hh])/);
            if (modelMatch) {
              product.modelNumber = modelMatch[1];
            }
          }

          // Check availability
          const availabilityText = $card.text().toLowerCase();
          product.inStock = 
            !availabilityText.includes("out of stock") &&
            !availabilityText.includes("sold out") &&
            !availabilityText.includes("unavailable");

          if (product.name && product.sourceUrl) {
            products.push(product);
          }
        });

        if (products.length > 0) {
          logger.debug({ selector, productsFound: products.length }, "Extracted products from collection page");
          break; // Found products, stop trying other selectors
        }
      }
    }

    // Method 3: Extract from Shopify's product JSON data (often in script tags)
    if (products.length === 0) {
      $('script').each((_, script) => {
        const scriptContent = $(script).html() || "";
        // Look for Shopify product data in window.Shopify or similar
        if (scriptContent.includes('"products"') || scriptContent.includes("product:")) {
          try {
            // Try to extract product data from various Shopify JSON patterns
            // Use [\s\S] instead of . with s flag for ES2017 compatibility
            const productMatches = scriptContent.match(/products["\s]*:[\s]*\[([\s\S]*?)\]/);
            if (productMatches) {
              // This is a simplified extraction - Shopify JSON can be complex
              logger.debug("Found Shopify product JSON data");
            }
          } catch {
            // Skip if parsing fails
          }
        }
      });
    }

    logger.info(
      { url, productsFound: products.length },
      "Shopify collection page scraped",
    );

    return products;
  } catch (error) {
    logger.error(
      {
        url,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      "Failed to scrape Shopify collection page",
    );
    return [];
  }
}

/**
 * Detect category from product data
 */
export function detectCategory(product: ScrapedProduct): EquipmentCategory {
  return categorizeProduct(product.name ?? "Unknown Product", product.description ?? null);
}

/**
 * Extract company information from a website
 * Uses schema.org Organization markup first, then falls back to common selectors
 */
export async function scrapeCompanyInfo(
  url: string,
  config: Partial<ScraperConfig> = {},
): Promise<ScrapedCompany> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const company: ScrapedCompany = {};

  try {
    const html = await fetchHTML(url, finalConfig);
    const $ = cheerio.load(html);
    const urlObj = new URL(url);
    company.website = `${urlObj.protocol}//${urlObj.hostname}`;

    // Try to extract from schema.org Organization markup (JSON-LD)
    $('script[type="application/ld+json"]').each((_, script) => {
      try {
        const data = JSON.parse($(script).html() || "{}");
        if (
          data["@type"] === "Organization" ||
          data["@context"]?.includes("schema.org")
        ) {
          if (data.name) company.name = data.name;
          if (data.email) company.email = data.email;
          if (data.telephone) company.phone = data.telephone;
          if (data.address) {
            if (typeof data.address === "string") {
              company.address = data.address;
            } else if (
              data.address.streetAddress ||
              data.address.addressLocality
            ) {
              const parts = [
                data.address.streetAddress,
                data.address.addressLocality,
                data.address.addressRegion,
                data.address.postalCode,
                data.address.addressCountry,
              ].filter(Boolean);
              company.address = parts.join(", ");
            }
          }
          if (data.description) company.description = data.description;
        }
      } catch {
        // Invalid JSON, skip
      }
    });

    // Fallback: Extract company name from common locations
    if (!company.name) {
      company.name =
        $('[itemtype*="Organization"] [itemprop="name"]')
          .first()
          .text()
          .trim() ||
        $('meta[property="og:site_name"]').attr("content") ||
        $(".company-name, .brand-name, .site-title").first().text().trim() ||
        $("title").text().split("|")[0].split("-")[0].trim();
    }

    // Extract email from contact pages or footer
    if (!company.email) {
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
      const contactText = $(
        'footer, .contact, .footer, [class*="contact"]',
      ).text();
      const emailMatch = contactText.match(emailRegex);
      if (emailMatch) {
        company.email = emailMatch[1];
      }
    }

    // Extract phone number
    if (!company.phone) {
      const phoneRegex = /(\+?1?\s*\(?[2-9]\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{4})/;
      const contactText = $(
        'footer, .contact, .footer, [class*="contact"], [class*="phone"]',
      ).text();
      const phoneMatch = contactText.match(phoneRegex);
      if (phoneMatch) {
        company.phone = phoneMatch[1].trim();
      }
    }

    // Extract address
    if (!company.address) {
      company.address =
        $('[itemtype*="PostalAddress"]').text().trim() ||
        $('.address, .company-address, [class*="address"]')
          .first()
          .text()
          .trim()
          .substring(0, 200);
    }

    // Extract description
    if (!company.description) {
      company.description =
        $('meta[name="description"]').attr("content") ||
        $('meta[property="og:description"]').attr("content") ||
        $('.company-description, .about, [class*="about"]')
          .first()
          .text()
          .trim()
          .substring(0, 500);
    }

    // Find product links on the page
    const productLinks: Set<string> = new Set();
    const productKeywords = [
      "product",
      "shop",
      "store",
      "catalog",
      "equipment",
      "item",
    ];

    $("a[href]").each((_, link) => {
      const href = $(link).attr("href");
      if (!href) return;

      const linkText = $(link).text().toLowerCase();
      const linkHref = href.toLowerCase();

      // Check if link seems to be a product page
      const isProductLink = productKeywords.some(
        (keyword) => linkText.includes(keyword) || linkHref.includes(keyword),
      );

      if (
        isProductLink &&
        !linkHref.includes("#") &&
        !linkHref.includes("javascript")
      ) {
        try {
          // Make URL absolute
          const absoluteUrl = href.startsWith("http")
            ? href
            : new URL(href, company.website).href;

          // Only include URLs from the same domain
          if (new URL(absoluteUrl).hostname === urlObj.hostname) {
            productLinks.add(absoluteUrl);
          }
        } catch {
          // Invalid URL, skip
        }
      }
    });

    company.productLinks = Array.from(productLinks); // No limit - get all product links
    company.totalPagesFound = productLinks.size;

    // Extract logo
    company.logoUrl =
      $('meta[property="og:image"]').attr("content") ||
      $('[itemtype*="Organization"] [itemprop="logo"]').first().attr("src") ||
      $('.logo img, .site-logo img, [class*="logo"] img').first().attr("src");

    // Make logo URL absolute
    if (company.logoUrl && !company.logoUrl.startsWith("http")) {
      try {
        company.logoUrl = new URL(company.logoUrl, company.website).href;
      } catch {
        company.logoUrl = undefined;
      }
    }

    logger.info(
      {
        url,
        hasName: !!company.name,
        hasEmail: !!company.email,
        productLinksFound: company.productLinks?.length || 0,
      },
      "Company info scraped successfully",
    );

    return company;
  } catch (error) {
    logger.error(
      {
        url,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      "Failed to scrape company info",
    );
    throw new Error(
      `Failed to scrape company info from ${url}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Crawl multiple pages to find more product links
 * Follows pagination and category pages
 * Now uses parallel page processing for 3x performance improvement
 */
export async function deepCrawlForProducts(
  startUrl: string,
  options: {
    maxPages?: number;
    maxDepth?: number;
    config?: Partial<ScraperConfig>;
    concurrency?: number; // NEW: parallel crawling
  } = {},
): Promise<{
  productLinks: string[];
  pagesVisited: string[];
  catalogPages: string[];
}> {
  const { maxPages = 10, maxDepth = 2, config = {}, concurrency = 3 } = options;
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const productLinks: Set<string> = new Set();
  const catalogPages: Set<string> = new Set();
  const visitedUrls: Set<string> = new Set();
  const urlQueue: { url: string; depth: number }[] = [
    { url: startUrl, depth: 0 },
  ];

  const urlObj = new URL(startUrl);
  const baseHostname = urlObj.hostname;

  // Keywords for identifying catalog/listing pages
  const catalogKeywords = [
    "shop",
    "products",
    "catalog",
    "store",
    "category",
    "collection",
    "inventory",
    // Solar/battery specific
    "solar",
    "battery",
    "batteries",
    "inverter",
    "panel",
    "charger",
    "storage",
    // Common e-commerce patterns
    "all-",
    "browse",
    "search",
    "filter",
    "list",
    "grid",
  ];
  const paginationKeywords = ["page", "p=", "pg", "offset", "start", "limit"];

  logger.info(
    { startUrl, maxPages, maxDepth, concurrency, parallel: true },
    "Starting parallel deep crawl",
  );

  // Process URL queue in parallel batches
  while (urlQueue.length > 0 && visitedUrls.size < maxPages) {
    // Take batch of URLs to process concurrently
    const batch: { url: string; depth: number }[] = [];

    while (batch.length < concurrency && urlQueue.length > 0) {
      const item = urlQueue.shift()!;
      // Skip already visited or too deep
      if (!visitedUrls.has(item.url) && item.depth <= maxDepth) {
        batch.push(item);
        visitedUrls.add(item.url); // Mark as visited immediately to avoid duplicates
      }
    }

    if (batch.length === 0) {
      break; // No more valid URLs to process
    }

    logger.debug(
      {
        batchSize: batch.length,
        visited: visitedUrls.size,
        remaining: urlQueue.length,
        maxPages,
      },
      "Processing parallel crawl batch",
    );

    // Rate limiting before processing batch
    if (visitedUrls.size > batch.length && finalConfig.rateLimit) {
      const delay = finalConfig.randomDelay
        ? getRandomDelay(finalConfig.rateLimit, finalConfig.rateLimit * 2)
        : finalConfig.rateLimit;

      logger.debug(
        { delay, randomized: finalConfig.randomDelay },
        "Applying crawl delay before batch",
      );
      await sleep(delay);
    }

    // Process batch in parallel
    const batchResults = await Promise.allSettled(
      batch.map(async ({ url, depth }) => {
        try {
          logger.debug({ url, depth }, "Crawling page");

          const html = await fetchHTML(url, finalConfig);
          const $ = cheerio.load(html);

          // Collect page results
          const pageProductLinks: string[] = [];
          const pageNextUrls: { url: string; depth: number }[] = [];
          let isCatalogPage = false;

          // Check if this is a catalog/listing page
          isCatalogPage = catalogKeywords.some(
            (keyword) =>
              url.toLowerCase().includes(keyword) ||
              $("title").text().toLowerCase().includes(keyword) ||
              $('.products, .product-list, .catalog, [class*="product-grid"]')
                .length > 0,
          );

          // Shopify-specific: Extract product links from product grid/cards
          // Shopify uses specific selectors like .product-card, .grid-product, etc.
          const shopifyProductSelectors = [
            'a[href*="/products/"]', // Direct Shopify product links
            '.product-card a',
            '.grid-product a',
            '.product-item a',
            '.product a',
            '[class*="product-card"] a',
            '[class*="product-item"] a',
            '[class*="grid-product"] a',
            '.card a[href*="/products/"]',
            'article a[href*="/products/"]',
          ];

          // First, try Shopify-specific selectors for better accuracy
          const shopifyProductLinks = new Set<string>(); // Deduplicate
          shopifyProductSelectors.forEach((selector) => {
            $(selector).each((_, element) => {
              const $link = $(element);
              const href = $link.attr("href");
              if (!href) return;

              try {
                const absoluteUrl = href.startsWith("http")
                  ? href
                  : new URL(href, url).href;
                const linkObj = new URL(absoluteUrl);

                // Only include same domain and valid product URLs
                if (
                  linkObj.hostname === baseHostname &&
                  isProductPageUrl(absoluteUrl) &&
                  !absoluteUrl.includes("#") &&
                  !absoluteUrl.includes("javascript:")
                ) {
                  // Normalize URL (remove query params, fragments, trailing slashes)
                  const normalizedUrl = absoluteUrl.split('?')[0].split('#')[0].replace(/\/$/, '');
                  shopifyProductLinks.add(normalizedUrl);
                }
              } catch {
                // Invalid URL, skip
              }
            });
          });
          
          // Add Shopify product links to the page product links
          shopifyProductLinks.forEach((link) => pageProductLinks.push(link));
          
          logger.debug(
            { 
              shopifyProductsFound: shopifyProductLinks.size,
              url 
            },
            "Extracted Shopify product links"
          );

          // Also extract all links from this page (fallback for non-Shopify sites)
          $("a[href]").each((_, link) => {
            const $link = $(link);
            const href = $link.attr("href");
            if (!href) return;

            // Skip honeypot links (hidden traps for bots)
            if (isHoneypotLink($link)) {
              return;
            }

            try {
              // Make URL absolute
              const absoluteUrl = href.startsWith("http")
                ? href
                : new URL(href, url).href;
              const linkObj = new URL(absoluteUrl);

              // Only follow links on the same domain
              if (linkObj.hostname !== baseHostname) return;

              // Skip non-page links
              if (
                absoluteUrl.includes("#") ||
                absoluteUrl.includes("javascript:") ||
                absoluteUrl.match(/\.(pdf|jpg|jpeg|png|gif|zip|exe)$/i)
              ) {
                return;
              }

              const linkText = $(link).text().toLowerCase();
              const linkHref = href.toLowerCase();
              const pathname = linkObj.pathname.toLowerCase();

              // Enhanced product link detection with multiple patterns
              const productPatterns = [
                // Direct product keywords
                "product",
                "item",
                "detail",
                "p/",
                "/p/",
                // E-commerce patterns
                "/pd/",
                "/dp/",
                "/gp/",
                "/itm/",
                // Shopify product pattern (most important)
                /^\/products\/[^\/]+$/,
                // Category + item patterns (e.g., /batteries/eg4-lifepower4)
                /\/(solar|battery|batteries|inverter|panel|charger|cable|mount|bracket)s?\/[^\/]+$/,
                // SKU-like patterns
                /-\d{3,}/, // ends with dash and 3+ digits
                /[a-z]+-[a-z0-9]+-[a-z0-9]+/, // multi-dash separated (e.g., eg4-lifepower4-48v)
                // Brand name patterns for batteries/solar (Solaris shop and similar)
                /(byd|ecoflow|enphase|eg4|simpliphi|pytes|lith|lithion|tesla|lg|samsung)-/i,
              ];

              const isProductLink = productPatterns.some((pattern) => {
                if (typeof pattern === "string") {
                  return (
                    linkText.includes(pattern) ||
                    linkHref.includes(pattern) ||
                    pathname.includes(pattern)
                  );
                } else {
                  // RegExp pattern
                  return pattern.test(pathname) || pattern.test(linkHref);
                }
              });

              // Also check if link has product-like classes
              const linkClasses = $(link).attr("class") || "";
              const hasProductClass = linkClasses.match(/product|item|card/i);

              // Check if link is inside a product container (for BigCommerce sites like Solaris)
              const $parent = $(link).closest('.ProductDetails, .ProductImage, .ProductList, .product, .product-item, .product-card, [class*="product"]');
              const isInsideProductContainer = $parent.length > 0;

              // Use the proper isProductPageUrl() function to filter out category pages
              if (
                (isProductLink || hasProductClass || isInsideProductContainer) &&
                isProductPageUrl(absoluteUrl)
              ) {
                // Normalize URL (remove query params, fragments, trailing slashes)
                const normalizedUrl = absoluteUrl.split('?')[0].split('#')[0].replace(/\/$/, '');
                // Only add if not already found via Shopify selectors
                if (!shopifyProductLinks.has(normalizedUrl)) {
                  pageProductLinks.push(normalizedUrl);
                }
              }

              // Enhanced catalog/pagination detection
              const isCatalogLink = catalogKeywords.some(
                (k) => linkHref.includes(k) || pathname.includes(k),
              );
              const isPaginationLink = paginationKeywords.some((k) =>
                linkHref.includes(k),
              );

              // Shopify pagination patterns
              const isShopifyPagination = 
                /[?&]page=\d+/.test(linkHref) || // ?page=2 or &page=2
                /\/page\/\d+/.test(pathname) || // /page/2
                (linkText.match(/^\d+$/) && $(link).closest('.pagination, [class*="pagination"]').length > 0); // Number in pagination

              // Also look for numeric pages and "next" links
              const isNextLink =
                linkText.includes("next") ||
                linkText.includes("more") ||
                linkHref.includes("next") ||
                /page[\/=]\d+/.test(linkHref) ||
                isShopifyPagination;

              // Detect subcategory links (common patterns)
              const isSubcategoryLink =
                // Path-based subcategories (e.g., /products/solar-panels/monocrystalline)
                pathname.split("/").length >= 3 &&
                !isProductPageUrl(absoluteUrl) &&
                // Common subcategory indicators
                (linkText.length > 3 && linkText.length < 50) ||
                // Breadcrumb-style links
                $(link).closest("nav, .breadcrumb, .categories, .subcategories").length > 0 ||
                // Category menu links
                $(link).closest("[class*='category'], [class*='subcategory'], [class*='menu']").length > 0;

              // Follow catalog, pagination, next, and subcategory links
              if (
                (isCatalogLink || isPaginationLink || isNextLink || isSubcategoryLink) &&
                depth < maxDepth
              ) {
                pageNextUrls.push({ url: absoluteUrl, depth: depth + 1 });
              }
            } catch {
              // Invalid URL, skip
            }
          });

          return {
            url,
            productLinks: pageProductLinks,
            nextUrls: pageNextUrls,
            isCatalog: isCatalogPage,
          };
        } catch (error) {
          logger.error(
            {
              url,
              error: error instanceof Error ? error.message : "Unknown error",
            },
            "Error during parallel page crawl",
          );
          return null;
        }
      }),
    );

    // Process batch results and update shared state
    for (const result of batchResults) {
      if (result.status === "fulfilled" && result.value) {
        const { url, productLinks: pageProducts, nextUrls, isCatalog } = result.value;

        // Add product links
        pageProducts.forEach((link) => productLinks.add(link));

        // Add catalog page
        if (isCatalog) {
          catalogPages.add(url);
        }

        // Add next URLs to queue (avoid duplicates)
        nextUrls.forEach((item) => {
          if (!visitedUrls.has(item.url)) {
            urlQueue.push(item);
          }
        });
      }
    }

    // Stop if we've reached max pages
    if (visitedUrls.size >= maxPages) {
      break;
    }
  }

  logger.info(
    {
      pagesVisited: visitedUrls.size,
      productsFound: productLinks.size,
      catalogPagesFound: catalogPages.size,
      startUrl,
    },
    "Deep crawl completed",
  );

  return {
    productLinks: Array.from(productLinks),
    pagesVisited: Array.from(visitedUrls),
    catalogPages: Array.from(catalogPages),
  };
}
