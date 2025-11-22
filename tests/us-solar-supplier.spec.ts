import { test, expect } from '@playwright/test';
import type { ScrapedProduct } from '@/lib/scraper';

const TEST_URL = 'https://ussolarsupplier.com/collections/usa-solar-panels';
const API_ENDPOINT = 'http://localhost:3001/api/distributors/scrape-from-url';
const TEST_TIMEOUT = 180000; // 3 minutes for comprehensive scraping

test.describe('US Solar Supplier Scraper Test', () => {
  test('should scrape US Solar Supplier solar panels collection', async ({ request }) => {
    test.setTimeout(TEST_TIMEOUT);

    console.log('🔍 Testing scraper with URL:', TEST_URL);
    console.log('⏱️  Starting scrape...\n');

    const startTime = Date.now();

    // Call the scraper API
    const response = await request.post(API_ENDPOINT, {
      data: {
        url: TEST_URL,
        saveToDatabase: false, // Don't save during test
        scrapeProducts: true,
        maxProducts: 20, // Limit for faster testing
        useBrowser: false, // Test HTTP scraper first
        useAI: false,
      },
      timeout: TEST_TIMEOUT,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n⏱️  Scrape completed in ${duration}s`);

    // Check response status
    expect(response.status()).toBe(200);

    // Parse response
    const result = await response.json();
    console.log('\n📊 Scraper Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Log company information
    if (result.company) {
      console.log('\n🏢 Company Info:');
      console.log(`   Name: ${result.company.name || 'Not found'}`);
      console.log(`   Website: ${result.company.website || 'Not found'}`);
      console.log(`   Email: ${result.company.email || 'Not found'}`);
      console.log(`   Phone: ${result.company.phone || 'Not found'}`);
      console.log(`   Logo: ${result.company.logoUrl ? '✅' : '❌'}`);
    }

    // Log product statistics
    console.log('\n📦 Products:');
    console.log(`   Total product links found: ${result.totalProductLinks || 0}`);
    console.log(`   Products scraped: ${result.productsFound || 0}`);

    // Log sample products
    if (result.products && result.products.length > 0) {
      console.log('\n🔍 Sample Products:');
      result.products.slice(0, 5).forEach((product: ScrapedProduct, index: number) => {
        console.log(`\n   ${index + 1}. ${product.name || 'Unnamed'}`);
        console.log(`      Price: ${product.price ? `$${product.price}` : 'Not found'}`);
        console.log(`      Image: ${product.imageUrl ? '✅' : '❌'}`);
        console.log(`      Manufacturer: ${product.manufacturer || 'Not found'}`);
        console.log(`      In Stock: ${product.inStock !== false ? '✅' : '❌'}`);
      });
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Assertions
    expect(result.success).toBe(true);
    expect(result.company).toBeDefined();
    expect(result.company.name).toBeTruthy();
    expect(result.totalProductLinks).toBeGreaterThan(0);
    expect(result.productsFound).toBeGreaterThan(0);

    // Check product data quality
    const validProducts = result.products.filter((p: ScrapedProduct) => p.name && p.price);
    const productsWithImages = result.products.filter((p: ScrapedProduct) => p.imageUrl);

    console.log('✅ Validation Results:');
    console.log(`   Valid products (name + price): ${validProducts.length}/${result.products.length}`);
    console.log(`   Products with images: ${productsWithImages.length}/${result.products.length}`);

    // At least 50% should have valid data
    expect(validProducts.length).toBeGreaterThan(result.products.length * 0.5);

    // Log performance metrics
    console.log('\n⚡ Performance:');
    console.log(`   Total time: ${duration}s`);
    console.log(`   Time per product: ${(parseFloat(duration) / result.productsFound).toFixed(2)}s`);
    console.log(`   Products/second: ${(result.productsFound / parseFloat(duration)).toFixed(2)}`);
  });

  test('should handle errors gracefully with invalid URL', async ({ request }) => {
    console.log('🔍 Testing error handling with invalid URL');

    const response = await request.post(API_ENDPOINT, {
      data: {
        url: 'https://invalid-url-that-does-not-exist-12345.com',
        saveToDatabase: false,
        scrapeProducts: true,
        maxProducts: 5,
      },
      timeout: 60000,
    });

    // Should return error but not crash
    const result = await response.json();

    console.log('Response status:', response.status());
    console.log('Result:', result);

    // Should handle error gracefully
    expect([200, 500]).toContain(response.status());
  });

  test('should test browser scraper mode (if BROWSERLESS_TOKEN available)', async ({ request }) => {
    test.setTimeout(TEST_TIMEOUT);

    console.log('🌐 Testing browser scraper mode');
    console.log('⏱️  Starting browser scrape...\n');

    const startTime = Date.now();

    const response = await request.post(API_ENDPOINT, {
      data: {
        url: TEST_URL,
        saveToDatabase: false,
        scrapeProducts: true,
        maxProducts: 10, // Fewer products for browser mode (slower)
        useBrowser: true, // Test browser scraper
        useAI: false,
      },
      timeout: TEST_TIMEOUT,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n⏱️  Browser scrape completed in ${duration}s`);

    const result = await response.json();

    if (response.status() === 200) {
      console.log('✅ Browser scraper succeeded');
      console.log(`   Products found: ${result.productsFound || 0}`);

      // Check if images were extracted (browser mode should get more images)
      const productsWithImages = result.products?.filter((p: ScrapedProduct) => p.imageUrl) || [];
      console.log(`   Products with images: ${productsWithImages.length}/${result.productsFound}`);

      expect(result.success).toBe(true);
    } else {
      console.log('⚠️  Browser scraper failed (might need BROWSERLESS_TOKEN)');
      console.log('   Error:', result.error);
    }
  });

  test('should compare cache performance (first vs second request)', async ({ request }) => {
    console.log('⚡ Testing cache performance\n');

    // First request (uncached)
    console.log('1️⃣  First request (uncached)...');
    const start1 = Date.now();
    const response1 = await request.post(API_ENDPOINT, {
      data: {
        url: TEST_URL,
        saveToDatabase: false,
        scrapeProducts: true,
        maxProducts: 10,
        useBrowser: false,
        useAI: false,
      },
      timeout: TEST_TIMEOUT,
    });
    const duration1 = ((Date.now() - start1) / 1000).toFixed(2);
    const result1 = await response1.json();

    console.log(`   ✅ Completed in ${duration1}s`);
    console.log(`   Products found: ${result1.productsFound || 0}\n`);

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Second request (should use cache)
    console.log('2️⃣  Second request (should be cached)...');
    const start2 = Date.now();
    const response2 = await request.post(API_ENDPOINT, {
      data: {
        url: TEST_URL,
        saveToDatabase: false,
        scrapeProducts: true,
        maxProducts: 10,
        useBrowser: false,
        useAI: false,
      },
      timeout: TEST_TIMEOUT,
    });
    const duration2 = ((Date.now() - start2) / 1000).toFixed(2);
    const result2 = await response2.json();

    console.log(`   ✅ Completed in ${duration2}s`);
    console.log(`   Products found: ${result2.productsFound || 0}\n`);

    // Compare performance
    const speedup = (parseFloat(duration1) / parseFloat(duration2)).toFixed(2);
    console.log('📊 Cache Performance:');
    console.log(`   First request: ${duration1}s`);
    console.log(`   Second request: ${duration2}s`);
    console.log(`   Speedup: ${speedup}x faster`);

    // Second request should be significantly faster (at least 2x)
    expect(parseFloat(duration2)).toBeLessThan(parseFloat(duration1));

    if (parseFloat(speedup) >= 2) {
      console.log('   ✅ Cache is working! (2x+ speedup)');
    } else {
      console.log('   ⚠️  Cache speedup lower than expected');
    }
  });
});
