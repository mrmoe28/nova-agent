# Scraper Architecture Pattern

This document defines the standardized architecture for all web scrapers in the NovaAgent project. Following this pattern ensures consistency, testability, and maintainability across all scraping implementations.

## Overview

The scraper architecture pattern demonstrated in `greentech-scraper.ts` provides:

1. **Type Safety** - Full TypeScript support with interfaces for all data structures
2. **Modularity** - Separate functions for each scraping concern
3. **Testability** - Pure functions with comprehensive test coverage
4. **Reusability** - Helper functions that adapt to changing HTML structure
5. **CLI Integration** - Command-line interface for standalone execution
6. **Error Handling** - Robust error handling with logging and fallbacks

## File Structure

For any scraper named `{source}`, create the following files:

```
src/lib/{source}-scraper.ts          # Main scraper module
scripts/scrape-{source}.ts            # CLI entry point
tests/{source}-scraper.spec.ts        # Comprehensive tests
```

## Core Components

### 1. Main Scraper Module (`src/lib/{source}-scraper.ts`)

#### Required Exports

```typescript
// Type Definitions
export interface {Source}ListingProduct { /* listing page data */ }
export interface {Source}DetailProduct extends {Source}ListingProduct { /* detail page data */ }
export interface {Source}Filter { /* filter/category URLs */ }
export interface PaginationInfo { /* pagination metadata */ }

// Utility Functions
export function normalizeUrl(url: string, base?: string): string
export function extractPaginationInfo($: cheerio.Root, currentUrl: string): PaginationInfo
export function extractFieldPairs($: cheerio.Root, container: cheerio.Cheerio): Record<string, string>

// Core Scraping Functions
export async function scrapeListingPage(url: string, config?: ScraperConfig): Promise<{...}>
export async function scrapeDetailPage(url: string, baseProduct?: ListingProduct, config?: ScraperConfig): Promise<DetailProduct>
export function extractFilterUrls($: cheerio.Root): Filter[]

// Orchestration
export async function crawlAllListingPages(config?: ScraperConfig): Promise<{...}>
export async function scrape{Source}Products(config?: ScraperConfig): Promise<{...}>

// Export Functions
export function exportToJson(products: DetailProduct[]): string
export function exportToCsv(products: DetailProduct[]): string
```

#### Module Structure Template

```typescript
import * as cheerio from "cheerio";
import { createLogger } from "./logger";
import type { ScraperConfig } from "./scraper";
import { fetchHTML } from "./scraper";

const logger = createLogger("{source}-scraper");
const BASE_URL = "https://example.com";

// 1. Type Definitions
export interface {Source}ListingProduct {
  slug: string;
  detailUrl: string;
  title: string;
  // ... source-specific fields
}

export interface {Source}DetailProduct extends {Source}ListingProduct {
  // ... enriched detail page fields
}

// 2. Utility Functions
export function normalizeUrl(url: string, base: string = BASE_URL): string {
  // URL normalization logic
}

export function extractPaginationInfo($: cheerio.Root, currentUrl: string): PaginationInfo {
  // Pagination extraction logic
}

export function extractFieldPairs($: cheerio.Root, container: cheerio.Cheerio): Record<string, string> {
  // Generic field extraction (CRITICAL for maintainability)
}

// 3. Core Extraction Functions
export function extractListingProduct($: cheerio.Root, element: cheerio.Element): {Source}ListingProduct | null {
  // Extract data from single listing card
}

export async function scrapeListingPage(url: string, config?: ScraperConfig) {
  logger.info({ url }, "Scraping listing page");
  const html = await fetchHTML(url, config);
  const $ = cheerio.load(html);

  const products: {Source}ListingProduct[] = [];
  const pagination = extractPaginationInfo($, url);

  // Extract all products from page

  return { products, pagination };
}

export async function scrapeDetailPage(url: string, baseProduct?: {Source}ListingProduct, config?: ScraperConfig) {
  logger.info({ url }, "Scraping detail page");
  const html = await fetchHTML(url, config);
  const $ = cheerio.load(html);

  const product: {Source}DetailProduct = { ...baseProduct };

  // Extract detail page data
  // Try JSON-LD fallback if DOM extraction fails

  return product;
}

// 4. Filter/Category Extraction
export function extractFilterUrls($: cheerio.Root): {Source}Filter[] {
  // Extract filter URLs from sidebar/navigation
}

// 5. Orchestration Functions
export async function crawlAllListingPages(config?: ScraperConfig) {
  // Automatically crawl all paginated listing pages
}

export async function scrape{Source}Products(config?: ScraperConfig) {
  // Main orchestrator:
  // 1. Crawl all listing pages
  // 2. Extract filters
  // 3. Visit detail pages
  // 4. Deduplicate and return results
}

// 6. Export Functions
export function exportToJson(products: {Source}DetailProduct[]): string {
  return JSON.stringify(products, null, 2);
}

export function exportToCsv(products: {Source}DetailProduct[]): string {
  // CSV export with dynamic column detection
}
```

### 2. CLI Entry Point (`scripts/scrape-{source}.ts`)

#### Template

```typescript
#!/usr/bin/env tsx

import { writeFile } from "fs/promises";
import { scrape{Source}Products, exportToJson, exportToCsv } from "../src/lib/{source}-scraper";
import { createLogger } from "../src/lib/logger";

const logger = createLogger("scrape-{source}-cli");

interface CliOptions {
  format: "json" | "csv";
  output: string;
  skipDetails: boolean;
  maxDetailPages?: number;
  rateLimit: number;
}

function parseArgs(): CliOptions {
  // Parse command-line arguments
}

async function main() {
  const options = parseArgs();

  logger.info(options, "Starting {source} scraper");

  try {
    const startTime = Date.now();

    const { products, filters, stats } = await scrape{Source}Products({
      skipDetailPages: options.skipDetails,
      maxDetailPages: options.maxDetailPages,
      rateLimit: options.rateLimit,
      respectRobotsTxt: true,
      timeout: 30000,
      maxRetries: 3,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Export results
    const content = options.format === "csv"
      ? exportToCsv(products)
      : exportToJson(products);

    await writeFile(options.output, content, "utf-8");

    // Export filters separately
    if (filters.length > 0) {
      const filtersFile = options.output.replace(/\.(json|csv)$/, "-filters.json");
      await writeFile(filtersFile, JSON.stringify(filters, null, 2), "utf-8");
    }

    // Print summary
    console.log("\n=== Scraping Summary ===");
    console.log(`Total Products: ${products.length}`);
    console.log(`Duration: ${duration}s`);
    console.log(`Output: ${options.output}`);

    process.exit(0);
  } catch (error) {
    logger.error({ error }, "Scraping failed");
    process.exit(1);
  }
}

main();
```

#### Required CLI Options

- `--format <json|csv>` - Output format
- `--output <path>` - Output file path
- `--skip-details` - Skip detail page scraping (faster)
- `--max-detail-pages <n>` - Limit detail pages
- `--rate-limit <ms>` - Delay between requests
- `--help, -h` - Show help message

### 3. Test Suite (`tests/{source}-scraper.spec.ts`)

#### Required Test Coverage

```typescript
import { test, expect } from "@playwright/test";
import * as cheerio from "cheerio";
import {
  normalizeUrl,
  extractPaginationInfo,
  extractFieldPairs,
  extractListingProduct,
  // ... other functions
} from "../src/lib/{source}-scraper";

// 1. URL Normalization Tests
test.describe("normalizeUrl", () => {
  test("should handle absolute URLs", () => { /* ... */ });
  test("should handle protocol-relative URLs", () => { /* ... */ });
  test("should handle relative URLs", () => { /* ... */ });
});

// 2. Pagination Tests
test.describe("extractPaginationInfo", () => {
  test("should extract from display text", () => { /* ... */ });
  test("should extract from pager links", () => { /* ... */ });
  test("should handle first/last page edge cases", () => { /* ... */ });
});

// 3. Field Extraction Tests (CRITICAL)
test.describe("extractFieldPairs", () => {
  test("should extract .field with .field--label and .field--item", () => { /* ... */ });
  test("should extract <strong>Label:</strong> Value pattern", () => { /* ... */ });
  test("should extract dt/dd pairs", () => { /* ... */ });
  test("should handle mixed patterns", () => { /* ... */ });
  test("should handle whitespace variations", () => { /* ... */ });
});

// 4. Listing Product Extraction Tests
test.describe("extractListingProduct", () => {
  test("should extract complete product from HTML", () => { /* ... */ });
  test("should handle lazy-loaded images", () => { /* ... */ });
  test("should return null for invalid elements", () => { /* ... */ });
  test("should handle minimal data gracefully", () => { /* ... */ });
});

// 5. Detail Page Tests
test.describe("scrapeDetailPage", () => {
  test("should extract detailed product data", () => { /* ... */ });
  test("should merge with base product data", () => { /* ... */ });
  test("should fall back to JSON-LD when DOM missing", () => { /* ... */ });
});

// 6. Filter Extraction Tests
test.describe("extractFilterUrls", () => {
  test("should extract manufacturer filters", () => { /* ... */ });
  test("should extract category filters", () => { /* ... */ });
  test("should deduplicate by URL", () => { /* ... */ });
});

// 7. Integration Tests
test.describe("Edge cases and robustness", () => {
  test("should handle malformed HTML", () => { /* ... */ });
  test("should handle missing fields gracefully", () => { /* ... */ });
  test("should normalize all URLs correctly", () => { /* ... */ });
});
```

#### Test Data Requirements

**NO DEMO/MOCK DATA** - Use real HTML fixtures from actual pages:

```typescript
const html = `
  <article class="commerce-product">
    <!-- REAL HTML FROM THE WEBSITE -->
  </article>
`;
const $ = cheerio.load(html);
// Test with real structure
```

## Key Design Principles

### 1. Separation of Concerns

Each function has a single, well-defined responsibility:

- **URL normalization** - One function
- **Pagination detection** - One function
- **Field extraction** - One function
- **Product extraction** - One function per page type
- **Orchestration** - High-level workflow coordination

### 2. Reusable Helpers

The `extractFieldPairs()` function is CRITICAL for maintainability:

```typescript
export function extractFieldPairs($: cheerio.Root, container: cheerio.Cheerio): Record<string, string> {
  const fields: Record<string, string> = {};

  // Pattern 1: .field with .field--label and .field--item
  container.find(".field").each((_, fieldEl) => { /* ... */ });

  // Pattern 2: <strong>Label:</strong> Value
  container.find("strong, b").each((_, strongEl) => { /* ... */ });

  // Pattern 3: dt/dd pairs
  container.find("dt").each((_, dtEl) => { /* ... */ });

  return fields;
}
```

This allows adding new fields **without code changes** - just update HTML selectors if structure changes.

### 3. Fallback Strategies

Always provide multiple extraction methods:

1. **Primary**: DOM selectors (fastest)
2. **Fallback 1**: JSON-LD structured data
3. **Fallback 2**: dataLayer tags
4. **Fallback 3**: Meta tags
5. **Fallback 4**: Text parsing with regex

### 4. Pagination Handling

Support multiple pagination formats:

- Page X of Y display text
- Pager element with page links
- URL query parameters
- Next/previous link detection

### 5. Rate Limiting & Politeness

Always include:

```typescript
const config: Partial<ScraperConfig> = {
  rateLimit: 2000,           // 2 seconds between requests
  respectRobotsTxt: true,    // Check robots.txt
  timeout: 30000,            // 30 second timeout
  maxRetries: 3,             // Retry failed requests
};
```

### 6. Logging

Use structured logging throughout:

```typescript
logger.info({ url, productCount }, "Listing page scraped");
logger.warn({ url, error }, "Failed to extract field");
logger.error({ url, error, stack }, "Scraping failed");
```

### 7. Deduplication

Always deduplicate products by unique identifier:

```typescript
const productSlugs = new Set<string>();
for (const product of products) {
  if (!productSlugs.has(product.slug)) {
    productSlugs.add(product.slug);
    allProducts.push(product);
  }
}
```

## Integration with NovaAgent

### Database Storage

Products scraped should integrate with the Equipment catalog:

```typescript
// After scraping
const { products } = await scrapeSomeProducts();

// Store in database
for (const product of products) {
  await prisma.equipment.upsert({
    where: { sourceUrl: product.detailUrl },
    create: {
      name: product.title,
      manufacturer: product.manufacturer,
      modelNumber: product.mpn,
      unitPrice: product.price,
      imageUrl: product.imageUrl,
      category: detectCategory(product),
      sourceUrl: product.detailUrl,
      specifications: product.specifications,
    },
    update: {
      unitPrice: product.price,
      imageUrl: product.imageUrl || undefined,
      lastScrapedAt: new Date(),
    },
  });
}
```

### API Endpoint Integration

Create API routes to trigger scraping:

```typescript
// app/api/distributors/scrape-{source}/route.ts
import { scrape{Source}Products } from "@/lib/{source}-scraper";

export async function POST(request: Request) {
  const { maxProducts, skipDetails } = await request.json();

  const results = await scrape{Source}Products({
    skipDetailPages: skipDetails,
    maxDetailPages: maxProducts,
    rateLimit: 2000,
  });

  return Response.json(results);
}
```

## Usage Examples

### CLI Usage

```bash
# Basic scraping
tsx scripts/scrape-{source}.ts

# Custom output
tsx scripts/scrape-{source}.ts --format csv --output products.csv

# Fast mode (skip details)
tsx scripts/scrape-{source}.ts --skip-details --rate-limit 1000

# Limited scraping
tsx scripts/scrape-{source}.ts --max-detail-pages 50
```

### Programmatic Usage

```typescript
import { scrape{Source}Products } from "@/lib/{source}-scraper";

// Full scraping
const { products, filters, stats } = await scrape{Source}Products({
  rateLimit: 2000,
  respectRobotsTxt: true,
});

// Fast scraping (listing pages only)
const { products } = await scrape{Source}Products({
  skipDetailPages: true,
  rateLimit: 1000,
});

// Targeted scraping
const { products } = await scrape{Source}Products({
  maxDetailPages: 100,
  rateLimit: 3000,
});
```

## Checklist for New Scrapers

When creating a new scraper, ensure:

- [ ] Created `src/lib/{source}-scraper.ts` with all required exports
- [ ] Created `scripts/scrape-{source}.ts` CLI entry point
- [ ] Created `tests/{source}-scraper.spec.ts` with comprehensive tests
- [ ] All functions have TypeScript types (no `any`)
- [ ] Includes `extractFieldPairs()` helper for maintainability
- [ ] Handles pagination automatically
- [ ] Implements URL normalization
- [ ] Provides JSON-LD fallback
- [ ] Includes filter/category URL extraction
- [ ] Respects robots.txt
- [ ] Implements rate limiting
- [ ] Has comprehensive logging
- [ ] Deduplicates products
- [ ] Tests use real HTML fixtures (no mocks)
- [ ] ESLint passes with no errors
- [ ] CLI has help text and examples
- [ ] Exports both JSON and CSV formats
- [ ] Documented in CONTEXT.md

## Anti-Patterns to Avoid

### ❌ Don't Use Demo/Mock Data in Tests

```typescript
// BAD
const mockProduct = { title: "Fake Product" };
expect(mockProduct.title).toBe("Fake Product");

// GOOD
const html = `<article><!-- REAL HTML FROM SITE --></article>`;
const $ = cheerio.load(html);
const product = extractProduct($, $("article").get(0));
expect(product.title).toBeDefined();
```

### ❌ Don't Hardcode Field Names

```typescript
// BAD
const manufacturer = $(".manufacturer").text();
const mpn = $(".mpn").text();

// GOOD
const fields = extractFieldPairs($, $(".identification"));
const manufacturer = fields.Manufacturer || fields.Brand;
const mpn = fields.MPN || fields["Model Number"];
```

### ❌ Don't Skip robots.txt

```typescript
// BAD
const html = await fetch(url);

// GOOD
const html = await fetchHTML(url, { respectRobotsTxt: true });
```

### ❌ Don't Ignore Rate Limiting

```typescript
// BAD
for (const url of urls) {
  await scrapePage(url);
}

// GOOD
for (const url of urls) {
  await scrapePage(url);
  await sleep(config.rateLimit);
}
```

### ❌ Don't Return Any Type

```typescript
// BAD
export function extractData($: cheerio.Root): any { /* ... */ }

// GOOD
export interface ExtractedData { /* ... */ }
export function extractData($: cheerio.Root): ExtractedData { /* ... */ }
```

## Maintenance & Updates

### When HTML Structure Changes

1. Update selectors in `extractListingProduct()` or `scrapeDetailPage()`
2. Add new patterns to `extractFieldPairs()` if needed
3. Update tests with new HTML fixtures
4. Run tests to verify: `npm test -- {source}-scraper.spec.ts`

### When Adding New Fields

1. Add field to type interfaces
2. Update extraction logic
3. Update CSV export to include new field
4. Add tests for new field

### When Site Adds Pagination

1. Update `extractPaginationInfo()` with new selectors
2. Test with fixtures showing pagination
3. Update `crawlAllListingPages()` if logic changes

## Performance Optimization

### Parallel Scraping

For independent pages, scrape in parallel:

```typescript
const promises = urls.map(url => scrapeListingPage(url, config));
const results = await Promise.all(promises);
```

### Selective Detail Scraping

Skip detail pages when not needed:

```typescript
const { products } = await scrapeSomeProducts({
  skipDetailPages: true,  // 10x faster
});
```

### Caching

Cache listing pages to avoid re-fetching:

```typescript
const cache = new Map<string, string>();

async function fetchWithCache(url: string) {
  if (cache.has(url)) return cache.get(url)!;
  const html = await fetchHTML(url);
  cache.set(url, html);
  return html;
}
```

## Troubleshooting

### Empty Product Arrays

- Check if selectors match actual HTML
- Verify `extractListingProduct()` returns non-null
- Add debug logging to see what's being extracted

### Missing Fields

- Check if field exists in HTML (inspect page source)
- Add new pattern to `extractFieldPairs()`
- Check for lazy-loaded content (may need browser mode)

### Rate Limiting / 429 Errors

- Increase `rateLimit` value
- Enable random delays: `randomDelay: true`
- Check robots.txt for crawl-delay directive

### Pagination Not Working

- Verify pager selectors match HTML
- Check if pagination uses JavaScript (may need browser scraping)
- Add debug logging in `extractPaginationInfo()`

---

## Reference Implementation

See `src/lib/greentech-scraper.ts` for the complete reference implementation of this architecture pattern.

This scraper demonstrates all the principles and best practices outlined in this document.
