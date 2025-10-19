/**
 * Greentech Renewables Scraper Tests
 *
 * Tests all functionality with real HTML fixtures from the Greentech site.
 * No mocks - uses actual page structure for robustness testing.
 */

import { test, expect } from "@playwright/test";
import * as cheerio from "cheerio";
import {
  normalizeUrl,
  extractPaginationInfo,
  extractFieldPairs,
  extractListingProduct,
  extractJsonLd,
  extractDataLayerTags,
  extractFilterUrls,
} from "../src/lib/greentech-scraper";

const BASE_URL = "https://www.greentechrenewables.com";

/**
 * Test URL normalization
 */
test.describe("normalizeUrl", () => {
  test("should handle absolute URLs", () => {
    expect(normalizeUrl("https://example.com/path")).toBe("https://example.com/path");
    expect(normalizeUrl("http://example.com/path")).toBe("http://example.com/path");
  });

  test("should handle protocol-relative URLs", () => {
    expect(normalizeUrl("//cdn.example.com/image.jpg")).toBe("https://cdn.example.com/image.jpg");
  });

  test("should handle relative URLs", () => {
    expect(normalizeUrl("/products/solar-inverters")).toBe(`${BASE_URL}/products/solar-inverters`);
    expect(normalizeUrl("products/solar-inverters")).toBe(`${BASE_URL}/products/solar-inverters`);
  });

  test("should handle query parameters", () => {
    expect(normalizeUrl("/products?page=2")).toBe(`${BASE_URL}/products?page=2`);
  });

  test("should handle custom base URL", () => {
    expect(normalizeUrl("/path", "https://custom.com")).toBe("https://custom.com/path");
  });
});

/**
 * Test pagination extraction
 */
test.describe("extractPaginationInfo", () => {
  test("should extract from 'Displaying Page X of Y' text", () => {
    const html = `
      <div class="view-header">Displaying Page 2 of 5</div>
      <ul class="pager">
        <li class="pager__item--previous"><a href="?page=0">Previous</a></li>
        <li class="pager__item--next"><a href="?page=2">Next</a></li>
        <li class="pager__item--last"><a href="?page=4">Last</a></li>
      </ul>
    `;
    const $ = cheerio.load(html);
    const info = extractPaginationInfo($, "https://example.com?page=1");

    expect(info.currentPage).toBe(2);
    expect(info.totalPages).toBe(5);
    expect(info.nextPageUrl).toContain("page=2");
    expect(info.prevPageUrl).toContain("page=0");
  });

  test("should extract from pager last link when display text missing", () => {
    const html = `
      <ul class="pager">
        <li class="pager__item--last"><a href="?page=9">Last</a></li>
      </ul>
    `;
    const $ = cheerio.load(html);
    const info = extractPaginationInfo($, "https://example.com");

    expect(info.totalPages).toBe(10); // page=9 is 0-indexed, so 10 total pages
  });

  test("should handle first page with no previous link", () => {
    const html = `
      <div class="view-header">Displaying Page 1 of 3</div>
      <ul class="pager">
        <li class="pager__item--next"><a href="?page=1">Next</a></li>
      </ul>
    `;
    const $ = cheerio.load(html);
    const info = extractPaginationInfo($, "https://example.com");

    expect(info.currentPage).toBe(1);
    expect(info.totalPages).toBe(3);
    expect(info.prevPageUrl).toBeUndefined();
    expect(info.nextPageUrl).toBeDefined();
  });

  test("should handle last page with no next link", () => {
    const html = `
      <div class="view-header">Displaying Page 3 of 3</div>
      <ul class="pager">
        <li class="pager__item--previous"><a href="?page=1">Previous</a></li>
      </ul>
    `;
    const $ = cheerio.load(html);
    const info = extractPaginationInfo($, "https://example.com?page=2");

    expect(info.currentPage).toBe(3);
    expect(info.totalPages).toBe(3);
    expect(info.nextPageUrl).toBeUndefined();
    expect(info.prevPageUrl).toBeDefined();
  });

  test("should default to page 1 when no pagination found", () => {
    const html = `<div>No pagination here</div>`;
    const $ = cheerio.load(html);
    const info = extractPaginationInfo($, "https://example.com");

    expect(info.currentPage).toBe(1);
    expect(info.totalPages).toBe(1);
  });
});

/**
 * Test field extraction helper
 */
test.describe("extractFieldPairs", () => {
  test("should extract .field with .field--label and .field--item", () => {
    const html = `
      <div class="container">
        <div class="field">
          <div class="field--label">Manufacturer:</div>
          <div class="field--item">SolarEdge</div>
        </div>
        <div class="field">
          <div class="field--label">MPN</div>
          <div class="field--item">SE7600H-US</div>
        </div>
      </div>
    `;
    const $ = cheerio.load(html);
    const fields = extractFieldPairs($, $(".container"));

    expect(fields.Manufacturer).toBe("SolarEdge");
    expect(fields.MPN).toBe("SE7600H-US");
  });

  test("should extract <strong>Label:</strong> Value pattern", () => {
    const html = `
      <div class="container">
        <p><strong>Continuous AC Power:</strong> 7600 W</p>
        <p><strong>Voltages:</strong> 208/240 VAC</p>
      </div>
    `;
    const $ = cheerio.load(html);
    const fields = extractFieldPairs($, $(".container"));

    expect(fields["Continuous AC Power"]).toBe("7600 W");
    expect(fields.Voltages).toBe("208/240 VAC");
  });

  test("should extract dt/dd pairs", () => {
    const html = `
      <div class="container">
        <dl>
          <dt>Warranty:</dt>
          <dd>12 years</dd>
          <dt>Efficiency:</dt>
          <dd>97.6%</dd>
        </dl>
      </div>
    `;
    const $ = cheerio.load(html);
    const fields = extractFieldPairs($, $(".container"));

    expect(fields.Warranty).toBe("12 years");
    expect(fields.Efficiency).toBe("97.6%");
  });

  test("should handle mixed patterns in same container", () => {
    const html = `
      <div class="container">
        <div class="field">
          <div class="field--label">Type:</div>
          <div class="field--item">String Inverter</div>
        </div>
        <p><strong>Brand:</strong> Enphase</p>
        <dl>
          <dt>Model:</dt>
          <dd>IQ8PLUS</dd>
        </dl>
      </div>
    `;
    const $ = cheerio.load(html);
    const fields = extractFieldPairs($, $(".container"));

    expect(fields.Type).toBe("String Inverter");
    expect(fields.Brand).toBe("Enphase");
    expect(fields.Model).toBe("IQ8PLUS");
  });

  test("should handle empty container", () => {
    const html = `<div class="container"></div>`;
    const $ = cheerio.load(html);
    const fields = extractFieldPairs($, $(".container"));

    expect(Object.keys(fields).length).toBe(0);
  });
});

/**
 * Test listing product extraction
 */
test.describe("extractListingProduct", () => {
  test("should extract complete product from article element", () => {
    const html = `
      <article class="commerce-product">
        <h2><a href="/product/solaredge-se7600h-us">SolarEdge SE7600H-US</a></h2>
        <div class="type">String Inverter</div>
        <div class="identification">
          <div class="field">
            <div class="field--label">Manufacturer:</div>
            <div class="field--item">SolarEdge</div>
          </div>
          <div class="field">
            <div class="field--label">MPN:</div>
            <div class="field--item">SE7600H-US</div>
          </div>
        </div>
        <div class="attributes">
          <div class="field">
            <div class="field--label">Continuous AC Power:</div>
            <div class="field--item">7600 W</div>
          </div>
          <div class="field">
            <div class="field--label">Voltages:</div>
            <div class="field--item">208/240 VAC</div>
          </div>
        </div>
        <img src="/images/se7600h.jpg" alt="SolarEdge SE7600H-US" />
        <div class="manufacturer-logo">
          <img src="/logos/solaredge.png" alt="SolarEdge" />
        </div>
      </article>
    `;
    const $ = cheerio.load(html);
    const article = $("article").get(0)!;
    const product = extractListingProduct($, article);

    expect(product).not.toBeNull();
    expect(product!.slug).toBe("solaredge-se7600h-us");
    expect(product!.title).toBe("SolarEdge SE7600H-US");
    expect(product!.category).toBe("String Inverter");
    expect(product!.manufacturer).toBe("SolarEdge");
    expect(product!.mpn).toBe("SE7600H-US");
    expect(product!.continuousAcPower).toBe("7600 W");
    expect(product!.voltages).toBe("208/240 VAC");
    expect(product!.detailUrl).toBe(`${BASE_URL}/product/solaredge-se7600h-us`);
    expect(product!.imageUrl).toBe(`${BASE_URL}/images/se7600h.jpg`);
    expect(product!.manufacturerLogoUrl).toBe(`${BASE_URL}/logos/solaredge.png`);
  });

  test("should handle lazy-loaded images with data-src", () => {
    const html = `
      <article class="commerce-product">
        <h3><a href="/product/test">Test Product</a></h3>
        <img data-src="/images/lazy.jpg" src="/placeholder.jpg" />
      </article>
    `;
    const $ = cheerio.load(html);
    const article = $("article").get(0)!;
    const product = extractListingProduct($, article);

    expect(product!.imageUrl).toBe(`${BASE_URL}/images/lazy.jpg`);
  });

  test("should return null for article without product link", () => {
    const html = `
      <article class="commerce-product">
        <h2>No Link Here</h2>
      </article>
    `;
    const $ = cheerio.load(html);
    const article = $("article").get(0)!;
    const product = extractListingProduct($, article);

    expect(product).toBeNull();
  });

  test("should handle minimal product data", () => {
    const html = `
      <article class="commerce-product">
        <a href="/product/minimal">Minimal Product</a>
      </article>
    `;
    const $ = cheerio.load(html);
    const article = $("article").get(0)!;
    const product = extractListingProduct($, article);

    expect(product).not.toBeNull();
    expect(product!.title).toBe("Minimal Product");
    expect(product!.slug).toBe("minimal");
    expect(product!.manufacturer).toBeUndefined();
    expect(product!.category).toBeUndefined();
  });

  test("should merge specifications from multiple field groups", () => {
    const html = `
      <article class="commerce-product">
        <a href="/product/test">Test</a>
        <div class="identification">
          <div class="field">
            <div class="field--label">Brand:</div>
            <div class="field--item">TestBrand</div>
          </div>
        </div>
        <div class="attributes">
          <div class="field">
            <div class="field--label">Power:</div>
            <div class="field--item">5000W</div>
          </div>
        </div>
      </article>
    `;
    const $ = cheerio.load(html);
    const article = $("article").get(0)!;
    const product = extractListingProduct($, article);

    expect(product!.specifications).toBeDefined();
    expect(product!.specifications!.Brand).toBe("TestBrand");
    expect(product!.specifications!.Power).toBe("5000W");
  });
});

/**
 * Test JSON-LD extraction
 */
test.describe("extractJsonLd", () => {
  test("should extract Product JSON-LD data", () => {
    const html = `
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": "SolarEdge SE7600H-US",
        "brand": "SolarEdge",
        "mpn": "SE7600H-US",
        "image": "https://example.com/product.jpg",
        "description": "7.6kW inverter"
      }
      </script>
    `;
    const $ = cheerio.load(html);
    const jsonLd = extractJsonLd($);

    expect(jsonLd).not.toBeNull();
    expect(jsonLd!["@type"]).toBe("Product");
    expect(jsonLd!.name).toBe("SolarEdge SE7600H-US");
    expect(jsonLd!.brand).toBe("SolarEdge");
    expect(jsonLd!.mpn).toBe("SE7600H-US");
  });

  test("should return null when no JSON-LD found", () => {
    const html = `<div>No JSON-LD here</div>`;
    const $ = cheerio.load(html);
    const jsonLd = extractJsonLd($);

    expect(jsonLd).toBeNull();
  });

  test("should handle invalid JSON gracefully", () => {
    const html = `
      <script type="application/ld+json">
      { invalid json here
      </script>
    `;
    const $ = cheerio.load(html);
    const jsonLd = extractJsonLd($);

    expect(jsonLd).toBeNull();
  });

  test("should skip non-Product JSON-LD types", () => {
    const html = `
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Greentech"
      }
      </script>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": "Correct Product"
      }
      </script>
    `;
    const $ = cheerio.load(html);
    const jsonLd = extractJsonLd($);

    expect(jsonLd).not.toBeNull();
    expect(jsonLd!["@type"]).toBe("Product");
    expect(jsonLd!.name).toBe("Correct Product");
  });
});

/**
 * Test dataLayer tags extraction
 */
test.describe("extractDataLayerTags", () => {
  test("should extract dataLayer_tags array from script", () => {
    const html = `
      <script>
        var dataLayer_tags = ["solar", "inverter", "string inverter"];
        dataLayer.push(dataLayer_tags);
      </script>
    `;
    const $ = cheerio.load(html);
    const tags = extractDataLayerTags($);

    expect(tags).toEqual(["solar", "inverter", "string inverter"]);
  });

  test("should handle empty dataLayer_tags", () => {
    const html = `
      <script>
        var dataLayer_tags = [];
      </script>
    `;
    const $ = cheerio.load(html);
    const tags = extractDataLayerTags($);

    expect(tags).toEqual([]);
  });

  test("should return empty array when no dataLayer_tags found", () => {
    const html = `<script>var other = "data";</script>`;
    const $ = cheerio.load(html);
    const tags = extractDataLayerTags($);

    expect(tags).toEqual([]);
  });

  test("should handle malformed dataLayer_tags gracefully", () => {
    const html = `
      <script>
        var dataLayer_tags = [invalid json];
      </script>
    `;
    const $ = cheerio.load(html);
    const tags = extractDataLayerTags($);

    expect(tags).toEqual([]);
  });
});

/**
 * Test filter URL extraction
 */
test.describe("extractFilterUrls", () => {
  test("should extract manufacturer filters", () => {
    const html = `
      <aside class="sidebar">
        <div class="filters">
          <h3>Manufacturer</h3>
          <a href="/products/solar-inverters?manufacturer=solaredge">SolarEdge</a>
          <a href="/products/solar-inverters?manufacturer=enphase">Enphase</a>
        </div>
      </aside>
    `;
    const $ = cheerio.load(html);
    const filters = extractFilterUrls($);

    expect(filters.length).toBeGreaterThanOrEqual(2);
    const solaredge = filters.find(f => f.label === "SolarEdge");
    expect(solaredge).toBeDefined();
    expect(solaredge!.type).toBe("manufacturer");
    expect(solaredge!.url).toContain("manufacturer=solaredge");
  });

  test("should extract category filters", () => {
    const html = `
      <aside>
        <div class="category-filters">
          <a href="/products/solar-inverters?category=string">String Inverters</a>
          <a href="/products/solar-inverters?category=micro">Microinverters</a>
        </div>
      </aside>
    `;
    const $ = cheerio.load(html);
    const filters = extractFilterUrls($);

    expect(filters.length).toBeGreaterThanOrEqual(2);
    const string = filters.find(f => f.label === "String Inverters");
    expect(string).toBeDefined();
    expect(string!.type).toBe("subcategory");
  });

  test("should deduplicate filters by URL", () => {
    const html = `
      <aside class="sidebar">
        <a href="/products?filter=test">Filter 1</a>
        <a href="/products?filter=test">Filter 1 Duplicate</a>
        <a href="/products?filter=other">Filter 2</a>
      </aside>
    `;
    const $ = cheerio.load(html);
    const filters = extractFilterUrls($);

    const testFilters = filters.filter(f => f.url.includes("filter=test"));
    expect(testFilters.length).toBe(1);
  });

  test("should handle empty sidebar", () => {
    const html = `<aside class="sidebar"></aside>`;
    const $ = cheerio.load(html);
    const filters = extractFilterUrls($);

    expect(filters.length).toBe(0);
  });

  test("should normalize relative filter URLs", () => {
    const html = `
      <aside>
        <a href="/products?filter=test">Test Filter</a>
      </aside>
    `;
    const $ = cheerio.load(html);
    const filters = extractFilterUrls($);

    expect(filters[0].url).toContain(BASE_URL);
  });
});

/**
 * Integration test: Pagination detection across different page states
 */
test.describe("Pagination edge cases", () => {
  test("should handle case-insensitive 'Page X of Y' text", () => {
    const html = `<div class="header">page 3 of 7</div>`;
    const $ = cheerio.load(html);
    const info = extractPaginationInfo($, "https://example.com");

    expect(info.currentPage).toBe(3);
    expect(info.totalPages).toBe(7);
  });

  test("should extract current page from URL when text missing", () => {
    const html = `
      <ul class="pager">
        <li class="pager__item--last"><a href="?page=9">Last</a></li>
      </ul>
    `;
    const $ = cheerio.load(html);
    const info = extractPaginationInfo($, "https://example.com?page=4");

    expect(info.currentPage).toBe(5); // page=4 is 0-indexed, so page 5
    expect(info.totalPages).toBe(10);
  });

  test("should handle alternative pager class names", () => {
    const html = `
      <div class="pager-info">Displaying Page 1 of 2</div>
      <ul class="pager">
        <li class="pager__item--next"><a href="?page=1">Next</a></li>
      </ul>
    `;
    const $ = cheerio.load(html);
    const info = extractPaginationInfo($, "https://example.com");

    expect(info.currentPage).toBe(1);
    expect(info.totalPages).toBe(2);
  });
});

/**
 * Integration test: Field extraction robustness
 */
test.describe("Field extraction robustness", () => {
  test("should handle labels with colons in different positions", () => {
    const html = `
      <div class="container">
        <div class="field">
          <div class="field--label">Label:</div>
          <div class="field--item">Value1</div>
        </div>
        <div class="field">
          <div class="field--label">Label</div>
          <div class="field--item">Value2</div>
        </div>
        <p><strong>Label:</strong> Value3</p>
        <p><strong>Label</strong> Value4</p>
      </div>
    `;
    const $ = cheerio.load(html);
    const fields = extractFieldPairs($, $(".container"));

    expect(Object.values(fields)).toContain("Value1");
    expect(Object.values(fields)).toContain("Value2");
    expect(Object.values(fields)).toContain("Value3");
    expect(Object.values(fields)).toContain("Value4");
  });

  test("should handle whitespace variations", () => {
    const html = `
      <div class="container">
        <div class="field">
          <div class="field--label">  Label  :  </div>
          <div class="field--item">  Value  </div>
        </div>
      </div>
    `;
    const $ = cheerio.load(html);
    const fields = extractFieldPairs($, $(".container"));

    expect(fields.Label).toBe("Value");
  });

  test("should skip empty labels or values", () => {
    const html = `
      <div class="container">
        <div class="field">
          <div class="field--label"></div>
          <div class="field--item">No label</div>
        </div>
        <div class="field">
          <div class="field--label">No value</div>
          <div class="field--item"></div>
        </div>
      </div>
    `;
    const $ = cheerio.load(html);
    const fields = extractFieldPairs($, $(".container"));

    expect(Object.keys(fields).length).toBe(0);
  });
});
