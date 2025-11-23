/**
 * Robust Page Type Detection
 * 
 * Detects whether a page is a PRODUCT page or CATEGORY page using:
 * 1. Schema.org JSON-LD data (gold standard)
 * 2. URL patterns (Shopify/WordPress common structures)
 * 3. Visual heuristics (HTML structure)
 */

import * as cheerio from 'cheerio';
import { createLogger } from './logger';

const logger = createLogger('page-detection');

export type PageType = 'PRODUCT' | 'CATEGORY' | 'UNKNOWN';

/**
 * Detect page type using multiple signals
 * 
 * @param $ - Cheerio instance loaded with page HTML
 * @param url - Page URL
 * @returns PageType enum
 */
// Cheerio's `load` can return a `Root` type, which is compatible with the
// `CheerioAPI` surface we use (querying, traversing). Accept both to avoid
// type mismatches when calling from different modules.
export function detectPageType(
  $: cheerio.CheerioAPI | cheerio.Root,
  url: string,
): PageType {
  logger.debug({ url }, 'Starting page type detection');

  // 1. Strong Signal: Check for JSON-LD Schema (Standard E-commerce)
  const jsonLd = $('script[type="application/ld+json"]');
  let isProductSchema = false;

  jsonLd.each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || '{}');
      const type = data['@type'];
      
      // Check for Product schema or an array containing a Product
      if (type === 'Product' || (Array.isArray(data) && data.some((i: any) => i['@type'] === 'Product'))) {
        isProductSchema = true;
        logger.debug({ url }, 'Found Product schema in JSON-LD');
      }
    } catch (e) {
      // Ignore parse errors
      logger.debug({ error: e }, 'Failed to parse JSON-LD');
    }
  });

  if (isProductSchema) {
    logger.info({ url, method: 'json-ld' }, 'Detected PRODUCT page');
    return 'PRODUCT';
  }

  // 2. Heuristics: URL patterns (Shopify/WordPress common structures)
  if (url.includes('/products/') && !url.match(/\/products\/?$/)) {
    // Has /products/ but not ending with just /products or /products/
    const segments = url.split('/products/')[1]?.split('/');
    if (segments && segments.length > 1) {
      logger.info({ url, method: 'url-pattern' }, 'Detected PRODUCT page');
      return 'PRODUCT';
    }
  }
  
  if (url.includes('/item/')) {
    logger.info({ url, method: 'url-pattern' }, 'Detected PRODUCT page');
    return 'PRODUCT';
  }
  
  if (url.includes('/collections/') || url.includes('/category/')) {
    logger.info({ url, method: 'url-pattern' }, 'Detected CATEGORY page');
    return 'CATEGORY';
  }

  // 3. Visual Heuristics (HTML Structure)
  const hasAddToCart = $(
    'form[action*="/cart/add"], button:contains("Add to Cart"), button:contains("Buy Now"), button[data-action="add-to-cart"]'
  ).length > 0;
  
  const hasPrice = $(
    '[itemprop="price"], .price, .product-price, [class*="price"], meta[property="og:price:amount"]'
  ).length > 0;

  const hasProductGrid = $(
    '.product-grid, .products-grid, .product-list, [class*="product-grid"], [class*="products-list"]'
  ).length > 0;

  const hasPagination = $(
    '.pagination, [class*="pagination"], .pager, nav[aria-label*="pagination"]'
  ).length > 0;

  // Product page indicators
  if (hasAddToCart && hasPrice) {
    logger.info({ url, method: 'visual-heuristics' }, 'Detected PRODUCT page (has add-to-cart + price)');
    return 'PRODUCT';
  }

  // Category page indicators
  if (hasProductGrid || hasPagination) {
    logger.info({ url, method: 'visual-heuristics' }, 'Detected CATEGORY page (has product grid or pagination)');
    return 'CATEGORY';
  }

  // 4. Additional Product Indicators
  const hasProductSchema = $('[itemtype*="Product"]').length > 0;
  const hasProductMeta = $('meta[property="og:type"][content="product"]').length > 0;
  
  if (hasProductSchema || hasProductMeta) {
    logger.info({ url, method: 'microdata' }, 'Detected PRODUCT page');
    return 'PRODUCT';
  }

  // Default fallback: If it looks like a list, assume CATEGORY
  const linkCount = $('a[href*="/products/"], a[href*="/item/"]').length;
  if (linkCount > 5) {
    logger.info({ url, method: 'fallback', linkCount }, 'Detected CATEGORY page (many product links)');
    return 'CATEGORY';
  }

  logger.warn({ url }, 'Could not determine page type, defaulting to CATEGORY');
  return 'CATEGORY';
}

/**
 * Check if a URL pattern suggests it's a product page
 * Legacy function for backward compatibility
 */
export function isProductPageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    const cleanPath = pathname.replace(/\/$/, "");

    // Category page indicators (check these FIRST to avoid false positives)
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
      // Generic category names in /products/ path (1 level deep only)
      /^\/products\/(solar-panels|solar-inverters|inverters|batteries|battery|solar-racking|racking|mounting|energy-storage|ev-charging|monitoring|balance-system|electrical|wiring|cables|accessories)$/i,
    ];

    // If it matches category patterns, it's NOT a product page
    if (categoryPatterns.some((pattern) => pattern.test(pathname) || pattern.test(url))) {
      return false;
    }

    // Shopify-style product URLs (must be 2+ levels deep to avoid categories)
    const productsMatch = cleanPath.match(/^\/products\/([^\/]+)(?:\/(.+))?$/);
    if (productsMatch) {
      const [, category, productSlug] = productsMatch;

      // If there's a second segment (productSlug), it's likely a product page
      if (productSlug) {
        return true;
      }

      // If only 1 segment after /products/, check if it's a specific product
      const hasProductIndicators =
        /[a-z0-9]+-[a-z0-9]+-[a-z0-9]+/.test(category) || // 3+ dashes
        /-\d{2,}(ah|v|kw|w)/i.test(category) || // Contains specs
        /\d{3,}/.test(category) || // Contains 3+ digit model numbers
        /(^|\-)(iq|se|iq8|micro|eg4|ll-s|lifepower|wallbox|powerwall)/i.test(category); // Known product prefixes

      if (hasProductIndicators) {
        return true;
      }

      return false;
    }

    // Product page indicators
    const productPatterns = [
      /\/[a-z0-9]+-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+/, // 4+ segments with dashes
      /\/(product|item|detail|p|pd|dp|gp|itm)\//,
      /-\d{2,}ah|-\d{2,}v|-\d+kw/, // Contains specs
      /\/(eg4|bigbattery|canadian-solar|pytes|enphase|ecoflow|anker|jackery)-[a-z0-9-]+$/, // Brand-specific products
    ];

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

