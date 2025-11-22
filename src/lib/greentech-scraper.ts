/**
 * Greentech Renewables Solar Inverter Scraper
 *
 * Specialized scraper for https://www.greentechrenewables.com/products/solar-inverters
 *
 * Features:
 * - Automatic pagination detection and crawling
 * - Listing page data extraction from product cards
 * - Detail page enrichment with technical specs
 * - Filter URL harvesting for targeted crawls
 * - JSON-LD fallback support
 * - Configurable throttling and session management
 *
 * @module greentech-scraper
 */

import * as cheerio from "cheerio";
import { createLogger } from "./logger";
import type { ScraperConfig } from "./scraper";
import { fetchHTML } from "./scraper";

const logger = createLogger("greentech-scraper");

const BASE_URL = "https://www.greentechrenewables.com";
const LISTING_URL = `${BASE_URL}/products/solar-inverters`;

/**
 * Greentech product data from listing pages
 */
export interface GreentechListingProduct {
  slug: string;
  detailUrl: string;
  title: string;
  category?: string;
  manufacturer?: string;
  mpn?: string;
  continuousAcPower?: string;
  voltages?: string;
  imageUrl?: string;
  manufacturerLogoUrl?: string;
  specifications?: Record<string, string>;
}

/**
 * Enhanced product data from detail pages
 */
export interface GreentechDetailProduct extends GreentechListingProduct {
  catalogNumber?: string;
  pricingMessage?: string;
  getQuoteProductId?: string;
  technicalSpecs?: Record<string, string>;
  generalInfo?: Record<string, string>;
  datasheetLinks?: string[];
  jsonLdData?: Record<string, unknown>;
  dataLayerTags?: string[];
}

/**
 * Filter URL metadata for targeted crawling
 */
export interface GreentechFilter {
  type: "manufacturer" | "subcategory" | "other";
  label: string;
  url: string;
}

/**
 * Pagination metadata
 */
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  nextPageUrl?: string;
  prevPageUrl?: string;
}

/**
 * Normalize a relative URL to absolute using the base URL
 */
export function normalizeUrl(url: string, base: string = BASE_URL): string {
  try {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    if (url.startsWith("//")) {
      return `https:${url}`;
    }
    return new URL(url, base).href;
  } catch (error) {
    logger.warn({ url, base, error }, "Failed to normalize URL");
    return url;
  }
}

/**
 * Extract pagination information from a listing page
 *
 * Checks for:
 * 1. "Displaying Page X of Y" header text
 * 2. Pager element with last page link (li.pager__item--last a[href])
 */
export function extractPaginationInfo($: cheerio.Root, currentUrl: string): PaginationInfo {
  const info: PaginationInfo = {
    currentPage: 1,
    totalPages: 1,
  };

  // Method 1: Extract from "Displaying Page X of Y" text
  const displayText = $(".view-header, .pager-info, .page-info")
    .text()
    .trim();

  const pageMatch = displayText.match(/page\s+(\d+)\s+of\s+(\d+)/i);
  if (pageMatch) {
    info.currentPage = parseInt(pageMatch[1], 10);
    info.totalPages = parseInt(pageMatch[2], 10);
    logger.debug({ displayText, currentPage: info.currentPage, totalPages: info.totalPages }, "Pagination info from display text");
  }

  // Method 2: Extract from pager last link
  const lastPageLink = $("li.pager__item--last a, .pager__item--last a").first();
  if (lastPageLink.length) {
    const href = lastPageLink.attr("href");
    if (href) {
      const pageParam = href.match(/[?&]page=(\d+)/);
      if (pageParam) {
        const lastPage = parseInt(pageParam[1], 10) + 1; // Page param is 0-indexed
        if (lastPage > info.totalPages) {
          info.totalPages = lastPage;
        }
      }
      logger.debug({ href, totalPages: info.totalPages }, "Pagination info from last page link");
    }
  }

  // Extract next/prev links
  const nextLink = $("li.pager__item--next a, .pager__item--next a").first();
  if (nextLink.length) {
    info.nextPageUrl = normalizeUrl(nextLink.attr("href") || "");
  }

  const prevLink = $("li.pager__item--previous a, .pager__item--previous a").first();
  if (prevLink.length) {
    info.prevPageUrl = normalizeUrl(prevLink.attr("href") || "");
  }

  // Try to extract current page from URL
  const urlPageMatch = currentUrl.match(/[?&]page=(\d+)/);
  if (urlPageMatch) {
    info.currentPage = parseInt(urlPageMatch[1], 10) + 1; // Page param is 0-indexed
  }

  return info;
}

/**
 * Extract field label → value pairs from a container
 *
 * Handles patterns like:
 * - <div class="field"><div class="field--label">Label:</div><div class="field--item">Value</div></div>
 * - <div><strong>Label:</strong> Value</div>
 *
 * This helper makes future spec additions require no code changes.
 */
export function extractFieldPairs($: cheerio.Root, container: cheerio.Cheerio): Record<string, string> {
  const fields: Record<string, string> = {};

  // Pattern 1: .field with .field--label and .field--item
  container.find(".field").each((_, fieldEl) => {
    const $field = $(fieldEl);
    const label = $field.find(".field--label, .field__label").text().trim().replace(/:$/, "");
    const value = $field.find(".field--item, .field__item").text().trim();

    if (label && value) {
      fields[label] = value;
    }
  });

  // Pattern 2: <strong>Label:</strong> Value
  container.find("strong, b").each((_, strongEl) => {
    const $strong = $(strongEl);
    const label = $strong.text().trim().replace(/:$/, "");
    const $parent = $strong.parent();

    // Get the text after the strong tag
    const fullText = $parent.text().trim();
    const value = fullText.replace(label, "").replace(/^:?\s*/, "").trim();

    if (label && value && value !== label) {
      fields[label] = value;
    }
  });

  // Pattern 3: dt/dd pairs
  container.find("dt").each((_, dtEl) => {
    const $dt = $(dtEl);
    const label = $dt.text().trim().replace(/:$/, "");
    const $dd = $dt.next("dd");
    const value = $dd.text().trim();

    if (label && value) {
      fields[label] = value;
    }
  });

  return fields;
}

/**
 * Extract product data from a listing page article element
 */
export function extractListingProduct($: cheerio.Root, article: cheerio.Element): GreentechListingProduct | null {
  const $article = $(article);

  // Extract product URL
  const $link = $article.find("a[href*='/product'], a.product-link, h2 a, h3 a").first();
  const relativeUrl = $link.attr("href");

  if (!relativeUrl) {
    logger.debug("Skipping article without product link");
    return null;
  }

  const detailUrl = normalizeUrl(relativeUrl);
  const slug = relativeUrl.split("/").filter(Boolean).pop() || "";

  // Extract title
  const title = $link.text().trim() || $article.find("h2, h3, .product-title").first().text().trim();

  // Extract category (.type field)
  const category = $article.find(".type, .field--name-field-type").text().trim();

  // Extract identification fields (manufacturer, MPN)
  const identificationBlock = $article.find(".identification, .field--name-field-identification");
  const identFields = extractFieldPairs($, identificationBlock);

  // Extract attributes (continuous AC power, voltages, etc.)
  const attributesBlock = $article.find(".attributes, [class*='field--name-field-']");
  const attributes = extractFieldPairs($, attributesBlock);

  // Extract images
  const $img = $article.find("img").first();
  const imageUrl = $img.attr("data-src") || $img.attr("src");

  const $logoImg = $article.find(".manufacturer-logo img, .logo img").first();
  const manufacturerLogoUrl = $logoImg.attr("data-src") || $logoImg.attr("src");

  return {
    slug,
    detailUrl,
    title,
    category: category || undefined,
    manufacturer: identFields.Manufacturer || identFields.Brand || undefined,
    mpn: identFields.MPN || identFields["Model Number"] || undefined,
    continuousAcPower: attributes["Continuous AC Power"] || attributes.Power || undefined,
    voltages: attributes.Voltages || attributes.Voltage || undefined,
    imageUrl: imageUrl ? normalizeUrl(imageUrl) : undefined,
    manufacturerLogoUrl: manufacturerLogoUrl ? normalizeUrl(manufacturerLogoUrl) : undefined,
    specifications: { ...identFields, ...attributes },
  };
}

/**
 * Extract all products from a listing page
 */
export async function scrapeListingPage(
  url: string,
  config: Partial<ScraperConfig> = {},
): Promise<{ products: GreentechListingProduct[]; pagination: PaginationInfo }> {
  logger.info({ url }, "Scraping Greentech listing page");

  const html = await fetchHTML(url, {
    respectRobotsTxt: true,
    timeout: 30000,
    maxRetries: 3,
    ...config,
  });

  const $ = cheerio.load(html);
  const products: GreentechListingProduct[] = [];

  // Extract pagination info
  const pagination = extractPaginationInfo($, url);

  // Find all product articles
  $("article.commerce-product, article[class*='product']").each((_, article) => {
    const product = extractListingProduct($, article);
    if (product) {
      products.push(product);
    }
  });

  logger.info({ url, productCount: products.length, pagination }, "Listing page scraped");

  return { products, pagination };
}

/**
 * Extract JSON-LD structured data from a detail page
 */
export function extractJsonLd($: cheerio.Root): Record<string, unknown> | null {
  let jsonLdData: Record<string, unknown> | null = null;

  $('script[type="application/ld+json"]').each((_, script) => {
    try {
      const data = JSON.parse($(script).html() || "{}");
      if (data["@type"] === "Product" || data["@context"]?.includes("schema.org")) {
        jsonLdData = data as Record<string, unknown>;
        return false; // break
      }
    } catch (error) {
      logger.debug({ error }, "Failed to parse JSON-LD");
    }
  });

  return jsonLdData;
}

/**
 * Extract dataLayer tags from a detail page
 */
export function extractDataLayerTags($: cheerio.Root): string[] {
  const tags: string[] = [];

  // Look for dataLayer variable in scripts
  $("script").each((_, script) => {
    const content = $(script).html() || "";
    const dataLayerMatch = content.match(/dataLayer_tags\s*=\s*\[(.*?)\]/);

    if (dataLayerMatch) {
      try {
        // Parse the array content
        const tagsStr = dataLayerMatch[1];
        const parsed = JSON.parse(`[${tagsStr}]`);
        tags.push(...parsed);
      } catch (error) {
        logger.debug({ error }, "Failed to parse dataLayer_tags");
      }
    }
  });

  return tags;
}

/**
 * Scrape a product detail page
 */
export async function scrapeDetailPage(
  url: string,
  baseProduct?: GreentechListingProduct,
  config: Partial<ScraperConfig> = {},
): Promise<GreentechDetailProduct> {
  logger.info({ url }, "Scraping Greentech detail page");

  const html = await fetchHTML(url, {
    respectRobotsTxt: true,
    timeout: 30000,
    maxRetries: 3,
    ...config,
  });

  const $ = cheerio.load(html);

  // Start with base product data or create new
  const product: GreentechDetailProduct = {
    slug: baseProduct?.slug || url.split("/").filter(Boolean).pop() || "",
    detailUrl: url,
    title: baseProduct?.title || "",
    ...baseProduct,
  };

  // Extract catalog number
  const catalogNumber = $(".field--name-field-catalog-number, .catalog-number").text().trim();
  if (catalogNumber) {
    product.catalogNumber = catalogNumber;
  }

  // Extract manufacturer (if not already present)
  if (!product.manufacturer) {
    product.manufacturer = $(".field--name-field-manufacturer, .manufacturer").text().trim() || undefined;
  }

  // Extract category (if not already present)
  if (!product.category) {
    product.category = $(".field--name-field-category, .category, .breadcrumb li:last-child").text().trim() || undefined;
  }

  // Extract pricing message
  const pricingMessage = $(".pricing-message, .price-info, .field--name-field-pricing").text().trim();
  if (pricingMessage) {
    product.pricingMessage = pricingMessage;
  }

  // Extract "get quote" product ID from link
  const getQuoteLink = $("a[href*='/get-quote']").first().attr("href");
  if (getQuoteLink) {
    const productIdMatch = getQuoteLink.match(/[?&]product=([^&]+)/);
    if (productIdMatch) {
      product.getQuoteProductId = productIdMatch[1];
    }
  }

  // Extract technical specs from #product-tech-specs
  const techSpecsBlock = $("#product-tech-specs, .product-tech-specs");
  if (techSpecsBlock.length) {
    product.technicalSpecs = extractFieldPairs($, techSpecsBlock);
  }

  // Extract general info
  const generalInfoBlock = $(".general-info, .product-general-info, .field--name-field-general-info");
  if (generalInfoBlock.length) {
    product.generalInfo = extractFieldPairs($, generalInfoBlock);
  }

  // Extract datasheet links
  const datasheetLinks: string[] = [];
  $("a[href*='datasheet'], a[href$='.pdf'], a:contains('Datasheet'), a:contains('Data Sheet')").each((_, link) => {
    const href = $(link).attr("href");
    if (href) {
      datasheetLinks.push(normalizeUrl(href));
    }
  });
  if (datasheetLinks.length) {
    product.datasheetLinks = [...new Set(datasheetLinks)]; // Deduplicate
  }

  // Extract JSON-LD data
  const jsonLdData = extractJsonLd($);
  if (jsonLdData) {
    product.jsonLdData = jsonLdData;

    // Fill in missing fields from JSON-LD
    if (!product.title && jsonLdData.name) {
      product.title = String(jsonLdData.name);
    }
    if (!product.manufacturer && jsonLdData.brand) {
      product.manufacturer = typeof jsonLdData.brand === "string"
        ? jsonLdData.brand
        : String((jsonLdData.brand as Record<string, unknown>).name || "");
    }
    if (!product.mpn && jsonLdData.mpn) {
      product.mpn = String(jsonLdData.mpn);
    }
    if (!product.imageUrl && jsonLdData.image) {
      const imageUrl = Array.isArray(jsonLdData.image) ? jsonLdData.image[0] : jsonLdData.image;
      product.imageUrl = normalizeUrl(String(imageUrl));
    }
  }

  // Extract dataLayer tags
  const dataLayerTags = extractDataLayerTags($);
  if (dataLayerTags.length) {
    product.dataLayerTags = dataLayerTags;
  }

  logger.info({ url, hasSpecs: !!product.technicalSpecs, hasJsonLd: !!product.jsonLdData }, "Detail page scraped");

  return product;
}

/**
 * Harvest filter URLs from the sidebar
 *
 * Looks for manufacturer filters, subcategory filters, etc.
 * Does NOT rely on form submission (Antibot-protected).
 */
export function extractFilterUrls($: cheerio.Root): GreentechFilter[] {
  const filters: GreentechFilter[] = [];

  // Look for filter links in sidebar
  $(".sidebar a, .filters a, .facets a, aside a").each((_, link) => {
    const $link = $(link);
    const href = $link.attr("href");
    const label = $link.text().trim();

    if (!href || !label) return;

    // Determine filter type based on URL pattern or parent element
    let type: GreentechFilter["type"] = "other";
    const $parent = $link.parent();
    const parentClass = $parent.attr("class") || "";

    if (href.includes("manufacturer") || parentClass.includes("manufacturer")) {
      type = "manufacturer";
    } else if (href.includes("category") || parentClass.includes("category")) {
      type = "subcategory";
    }

    filters.push({
      type,
      label,
      url: normalizeUrl(href),
    });
  });

  // Deduplicate by URL
  const uniqueFilters = Array.from(
    new Map(filters.map(f => [f.url, f])).values()
  );

  logger.info({ filterCount: uniqueFilters.length }, "Extracted filter URLs");

  return uniqueFilters;
}

/**
 * Crawl all listing pages for solar inverters
 *
 * Automatically detects pagination and crawls all pages until no more remain.
 */
export async function crawlAllListingPages(
  config: Partial<ScraperConfig> = {},
): Promise<{
  products: GreentechListingProduct[];
  filters: GreentechFilter[];
  pagesScraped: number;
}> {
  logger.info("Starting full listing crawl");

  const allProducts: GreentechListingProduct[] = [];
  const productSlugs = new Set<string>(); // Deduplication
  let filters: GreentechFilter[] = [];
  let pagesScraped = 0;

  // Start with page 0
  let currentPage = 0;
  let hasMorePages = true;

  while (hasMorePages) {
    const url = currentPage === 0
      ? LISTING_URL
      : `${LISTING_URL}?page=${currentPage}`;

    try {
      const { products, pagination } = await scrapeListingPage(url, config);

      // Add unique products
      for (const product of products) {
        if (!productSlugs.has(product.slug)) {
          productSlugs.add(product.slug);
          allProducts.push(product);
        }
      }

      pagesScraped++;

      // Extract filters from first page only
      if (currentPage === 0) {
        const html = await fetchHTML(url, {
          respectRobotsTxt: true,
          timeout: 30000,
          maxRetries: 3,
          ...config,
        });
        const $ = cheerio.load(html);
        filters = extractFilterUrls($);
      }

      // Check if there are more pages
      if (currentPage + 1 < pagination.totalPages) {
        currentPage++;

        // Apply rate limiting
        if (config.rateLimit) {
          await new Promise(resolve => setTimeout(resolve, config.rateLimit));
        }
      } else {
        hasMorePages = false;
      }

      logger.info({
        currentPage: currentPage + 1,
        totalPages: pagination.totalPages,
        productsFound: allProducts.length
      }, "Page crawled");

    } catch (error) {
      logger.error({ url, error }, "Failed to scrape listing page");
      hasMorePages = false; // Stop on error
    }
  }

  logger.info({
    totalProducts: allProducts.length,
    filterCount: filters.length,
    pagesScraped
  }, "Listing crawl completed");

  return { products: allProducts, filters, pagesScraped };
}

/**
 * Main orchestrator function
 *
 * Complete workflow:
 * 1. Crawl all listing pages with pagination
 * 2. Extract filter URLs for future targeted crawls
 * 3. Visit each detail page for enriched data
 * 4. Deduplicate and merge data
 * 5. Return complete product catalog
 */
export async function scrapeGreentechInverters(
  config: Partial<ScraperConfig> & {
    skipDetailPages?: boolean;
    maxDetailPages?: number;
  } = {},
): Promise<{
  products: GreentechDetailProduct[];
  filters: GreentechFilter[];
  stats: {
    listingPages: number;
    detailPages: number;
    totalProducts: number;
  };
}> {
  logger.info("Starting Greentech Renewables inverter scrape");

  // Step 1: Crawl all listing pages
  const { products: listingProducts, filters, pagesScraped } = await crawlAllListingPages(config);

  // Step 2: Optionally skip detail page visits
  if (config.skipDetailPages) {
    logger.info("Skipping detail page scraping");
    return {
      products: listingProducts as GreentechDetailProduct[],
      filters,
      stats: {
        listingPages: pagesScraped,
        detailPages: 0,
        totalProducts: listingProducts.length,
      },
    };
  }

  // Step 3: Visit detail pages
  const maxDetailPages = config.maxDetailPages || listingProducts.length;
  const detailProducts: GreentechDetailProduct[] = [];
  const visited = new Set<string>();

  for (let i = 0; i < Math.min(listingProducts.length, maxDetailPages); i++) {
    const listingProduct = listingProducts[i];

    if (visited.has(listingProduct.detailUrl)) {
      continue;
    }

    try {
      const detailProduct = await scrapeDetailPage(
        listingProduct.detailUrl,
        listingProduct,
        config,
      );
      detailProducts.push(detailProduct);
      visited.add(listingProduct.detailUrl);

      // Apply rate limiting
      if (config.rateLimit && i < maxDetailPages - 1) {
        await new Promise(resolve => setTimeout(resolve, config.rateLimit));
      }

      logger.info({
        progress: `${i + 1}/${maxDetailPages}`,
        url: listingProduct.detailUrl
      }, "Detail page scraped");

    } catch (error) {
      logger.error({ url: listingProduct.detailUrl, error }, "Failed to scrape detail page");
      // Add listing product as fallback
      detailProducts.push(listingProduct as GreentechDetailProduct);
    }
  }

  logger.info({
    totalProducts: detailProducts.length,
    filterCount: filters.length,
    listingPages: pagesScraped,
    detailPages: visited.size,
  }, "Greentech scrape completed");

  return {
    products: detailProducts,
    filters,
    stats: {
      listingPages: pagesScraped,
      detailPages: visited.size,
      totalProducts: detailProducts.length,
    },
  };
}

/**
 * Export products to JSON format
 */
export function exportToJson(products: GreentechDetailProduct[]): string {
  return JSON.stringify(products, null, 2);
}

/**
 * Export products to CSV format
 */
export function exportToCsv(products: GreentechDetailProduct[]): string {
  if (products.length === 0) return "";

  // Collect all possible field names
  const allFields = new Set<string>();
  products.forEach(p => {
    Object.keys(p).forEach(key => allFields.add(key));
    Object.keys(p.specifications || {}).forEach(key => allFields.add(`spec_${key}`));
    Object.keys(p.technicalSpecs || {}).forEach(key => allFields.add(`tech_${key}`));
  });

  const headers = Array.from(allFields);
  const rows = products.map(p => {
    return headers.map(header => {
      if (header.startsWith("spec_")) {
        const specKey = header.replace("spec_", "");
        return p.specifications?.[specKey] || "";
      }
      if (header.startsWith("tech_")) {
        const techKey = header.replace("tech_", "");
        return p.technicalSpecs?.[techKey] || "";
      }
      const value = p[header as keyof GreentechDetailProduct];
      if (Array.isArray(value)) return value.join(";");
      if (typeof value === "object") return JSON.stringify(value);
      return value || "";
    });
  });

  const csvLines = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
  ];

  return csvLines.join("\n");
}
