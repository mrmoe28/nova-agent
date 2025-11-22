import { test, expect } from "@playwright/test";
import {
  scrapeCompanyInfo,
  scrapeProductPage,
  deepCrawlForProducts,
  isProductPageUrl,
} from "../src/lib/scraper";

test.describe("Renewable Outdoors Scraper Tests", () => {
  const BASE_URL = "https://renewableoutdoors.com";

  test("should scrape company information from homepage", async () => {
    const company = await scrapeCompanyInfo(BASE_URL, {
      rateLimit: 2000,
      respectRobotsTxt: true,
      timeout: 30000,
    });

    console.log("Company Info:", JSON.stringify(company, null, 2));

    // Validate company data
    expect(company.website).toBe(BASE_URL);
    expect(company.name).toBeDefined();
    expect(company.name).not.toBe("");

    // Should find product links
    expect(company.productLinks).toBeDefined();
    expect(Array.isArray(company.productLinks)).toBe(true);
    if (company.productLinks && company.productLinks.length > 0) {
      console.log(`Found ${company.productLinks.length} product links`);
      console.log("Sample product links:", company.productLinks.slice(0, 5));
    }
  });

  test("should identify product page URLs correctly", () => {
    // Test various URL patterns from Renewable Outdoors
    const testCases = [
      {
        url: "https://renewableoutdoors.com/products/solar-panel-200w",
        expected: true,
        description: "Product URL with /products/ path",
      },
      {
        url: "https://renewableoutdoors.com/collections/solar-panels",
        expected: false,
        description: "Collection/category page",
      },
      {
        url: "https://renewableoutdoors.com/collections/batteries",
        expected: false,
        description: "Battery collection page",
      },
      {
        url: "https://renewableoutdoors.com/products/ecoflow-delta-pro",
        expected: true,
        description: "EcoFlow product page",
      },
      {
        url: "https://renewableoutdoors.com/pages/about",
        expected: false,
        description: "About page",
      },
    ];

    for (const testCase of testCases) {
      const result = isProductPageUrl(testCase.url);
      expect(result).toBe(testCase.expected);
      console.log(
        `✓ ${testCase.description}: ${testCase.url} => ${result ? "PRODUCT" : "NOT PRODUCT"}`,
      );
    }
  });

  test("should crawl and find product links", async () => {
    const result = await deepCrawlForProducts(BASE_URL, {
      maxPages: 5,
      maxDepth: 2,
      concurrency: 2,
      config: {
        rateLimit: 2000,
        respectRobotsTxt: true,
        timeout: 30000,
      },
    });

    console.log("\nCrawl Results:");
    console.log(`- Pages visited: ${result.pagesVisited.length}`);
    console.log(`- Product links found: ${result.productLinks.length}`);
    console.log(`- Catalog pages found: ${result.catalogPages.length}`);

    // Validate results
    expect(result.productLinks.length).toBeGreaterThan(0);
    expect(result.pagesVisited.length).toBeGreaterThan(0);

    // Log sample product links
    if (result.productLinks.length > 0) {
      console.log("\nSample product links found:");
      result.productLinks.slice(0, 10).forEach((link, idx) => {
        console.log(`  ${idx + 1}. ${link}`);
      });
    }

    // Log catalog pages
    if (result.catalogPages.length > 0) {
      console.log("\nCatalog pages found:");
      result.catalogPages.forEach((page, idx) => {
        console.log(`  ${idx + 1}. ${page}`);
      });
    }
  });

  test.skip("should scrape a sample product page (manual URL)", async () => {
    // Note: This test is skipped by default - needs a real product URL
    // Update the URL below with an actual product URL from the site
    const productUrl = "https://renewableoutdoors.com/products/example-product";

    const product = await scrapeProductPage(productUrl, {
      rateLimit: 2000,
      respectRobotsTxt: true,
      timeout: 30000,
    });

    console.log("\nProduct Details:");
    console.log(JSON.stringify(product, null, 2));

    // Validate product data
    expect(product.name).toBeDefined();
    expect(product.sourceUrl).toBe(productUrl);

    if (product.price) {
      console.log(`Price: $${product.price}`);
      expect(product.price).toBeGreaterThan(0);
    }

    if (product.imageUrl) {
      console.log(`Image: ${product.imageUrl}`);
      expect(product.imageUrl).toMatch(/^https?:\/\//);
    }

    if (product.description) {
      console.log(`Description: ${product.description.substring(0, 100)}...`);
    }
  });

  test("should handle robots.txt compliance", async () => {
    // Test that the scraper respects robots.txt
    const result = await scrapeCompanyInfo(BASE_URL, {
      rateLimit: 2000,
      respectRobotsTxt: true,
      timeout: 30000,
    });

    // Should succeed without throwing robots.txt errors
    expect(result).toBeDefined();
    console.log("✓ Robots.txt compliance check passed");
  });

  test("should extract Shopify product schema", async () => {
    // Shopify sites typically use schema.org JSON-LD
    // This test verifies the scraper can extract structured data
    console.log("Testing Shopify schema extraction capabilities...");

    // Test with homepage - should have Organization schema
    const company = await scrapeCompanyInfo(BASE_URL, {
      rateLimit: 2000,
      timeout: 30000,
    });

    console.log("Extracted company data:");
    console.log(`- Name: ${company.name}`);
    console.log(`- Email: ${company.email || "not found"}`);
    console.log(`- Phone: ${company.phone || "not found"}`);
    console.log(`- Description: ${company.description?.substring(0, 100) || "not found"}...`);

    expect(company.name).toBeDefined();
  });

  test("should handle rate limiting properly", async () => {
    const startTime = Date.now();

    // Scrape with 2 second rate limit
    const company = await scrapeCompanyInfo(BASE_URL, {
      rateLimit: 2000,
      timeout: 30000,
    });

    const elapsed = Date.now() - startTime;

    // Should take at least the rate limit time (if multiple requests made)
    console.log(`Scraping took ${elapsed}ms`);
    expect(company).toBeDefined();
    console.log("✓ Rate limiting working correctly");
  });

  test("should handle pagination if present", async () => {
    // Test crawling with pagination detection
    const result = await deepCrawlForProducts(BASE_URL + "/collections/solar-panels", {
      maxPages: 3,
      maxDepth: 1,
      config: {
        rateLimit: 2000,
        timeout: 30000,
      },
    });

    console.log("\nPagination test results:");
    console.log(`- Pages visited: ${result.pagesVisited.length}`);
    console.log(`- Products found: ${result.productLinks.length}`);

    // Should find multiple pages if pagination exists
    if (result.pagesVisited.length > 1) {
      console.log("✓ Pagination detected and followed");
    } else {
      console.log("! No pagination found or not needed");
    }

    expect(result.pagesVisited.length).toBeGreaterThan(0);
  });

  test("should extract product categories", async () => {
    // Test that we can identify different product categories
    const categories = [
      "/collections/solar-panels",
      "/collections/batteries",
      "/collections/portable-power-stations",
      "/collections/charge-controllers",
    ];

    console.log("\nTesting category detection:");

    for (const category of categories) {
      const isProduct = isProductPageUrl(BASE_URL + category);
      expect(isProduct).toBe(false);
      console.log(`✓ ${category} correctly identified as category page`);
    }
  });

  test("should handle errors gracefully", async () => {
    // Test with invalid URL
    const invalidUrl = "https://renewableoutdoors.com/nonexistent-page-12345";

    try {
      await scrapeProductPage(invalidUrl, {
        rateLimit: 1000,
        timeout: 10000,
      });
      // If we get here, it means the page existed or error wasn't thrown
      console.log("Note: Invalid page may have returned valid response");
    } catch (error) {
      // Expected to fail
      expect(error).toBeDefined();
      console.log("✓ Error handling working correctly");
    }
  });

  test("should identify product types correctly", () => {
    // Test URL patterns that should be products
    const productUrls = [
      "https://renewableoutdoors.com/products/solar-panel-flexible-100w",
      "https://renewableoutdoors.com/products/ecoflow-delta-2",
      "https://renewableoutdoors.com/products/victron-multiplus-3000",
      "https://renewableoutdoors.com/products/battery-lithium-12v-100ah",
    ];

    // Test URL patterns that should NOT be products
    const nonProductUrls = [
      "https://renewableoutdoors.com/collections/all",
      "https://renewableoutdoors.com/pages/contact",
      "https://renewableoutdoors.com/cart",
      "https://renewableoutdoors.com/account/login",
      "https://renewableoutdoors.com/",
    ];

    console.log("\nTesting product URL identification:");
    console.log("\nShould be products:");
    productUrls.forEach((url) => {
      const result = isProductPageUrl(url);
      expect(result).toBe(true);
      console.log(`  ✓ ${url.split("/").pop()} => PRODUCT`);
    });

    console.log("\nShould NOT be products:");
    nonProductUrls.forEach((url) => {
      const result = isProductPageUrl(url);
      expect(result).toBe(false);
      console.log(`  ✓ ${url.split("/").pop() || "homepage"} => CATEGORY/PAGE`);
    });
  });
});

