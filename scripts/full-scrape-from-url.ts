#!/usr/bin/env tsx

/**
 * Full scrape helper (no Vercel timeout)
 *
 * Usage:
 *   npx tsx scripts/full-scrape-from-url.ts <url> [distributorId] [maxProducts]
 *
 * - If distributorId is provided, attaches products to that distributor.
 * - If not, creates a new distributor from scrapeCompanyInfo().
 */

import dotenv from "dotenv";
import { resolve } from "path";
import { prisma } from "@/lib/prisma";
import {
  scrapeCompanyInfo,
  deepCrawlForProducts,
  scrapeMultipleProducts,
  detectCategory,
  type ScrapedProduct,
} from "@/lib/scraper";

dotenv.config({ path: resolve(__dirname, "..", ".env.local") });

async function main() {
  const [, , url, distributorIdArg, maxProductsArg] = process.argv;

  if (!url) {
    console.error(
      "Usage: npx tsx scripts/full-scrape-from-url.ts <url> [distributorId] [maxProducts]",
    );
    process.exit(1);
  }

  const maxProducts = maxProductsArg ? parseInt(maxProductsArg, 10) : 1000;

  console.log("\n=== FULL SCRAPE FROM URL ===\n");
  console.log("URL:", url);
  console.log("DistributorId (optional):", distributorIdArg || "(new)");
  console.log("Max products:", maxProducts);

  // 1) Company info
  console.log("\n[1/4] Scraping company info...");
  const companyInfo = await scrapeCompanyInfo(url, {
    rateLimit: 500,
    timeout: 15000,
    respectRobotsTxt: true,
    maxRetries: 2,
  });

  console.log("   Name:", companyInfo.name || "(unknown)");
  console.log(
    "   Product links discovered on company page:",
    companyInfo.productLinks?.length || 0,
  );

  // 2) Distributor upsert
  console.log("\n[2/4] Preparing distributor record...");
  let distributor =
    distributorIdArg &&
    (await prisma.distributor.findUnique({
      where: { id: distributorIdArg },
    }));

  if (!distributor) {
    distributor = await prisma.distributor.create({
      data: {
        name: companyInfo.name || new URL(url).hostname,
        contactName: companyInfo.contactName || null,
        email: companyInfo.email || null,
        phone: companyInfo.phone || null,
        website: companyInfo.website || url,
        address: companyInfo.address || null,
        notes: companyInfo.description || "Auto-scraped from website",
        logoUrl: companyInfo.logoUrl || null,
        lastScrapedAt: new Date(),
      },
    });
    console.log("   Created distributor:", distributor.id, distributor.name);
  } else {
    distributor = await prisma.distributor.update({
      where: { id: distributor.id },
      data: {
        name: companyInfo.name || distributor.name,
        email: companyInfo.email || distributor.email,
        phone: companyInfo.phone || distributor.phone,
        website: companyInfo.website || distributor.website,
        address: companyInfo.address || distributor.address,
        notes: companyInfo.description || distributor.notes,
        logoUrl: companyInfo.logoUrl || distributor.logoUrl,
        lastScrapedAt: new Date(),
      },
    });
    console.log("   Updated distributor:", distributor.id, distributor.name);
  }

  // 3) Deep crawl for product URLs
  console.log("\n[3/4] Deep crawling for product URLs...");
  const crawlResult = await deepCrawlForProducts(url, {
    maxPages: 50,
    maxDepth: 2,
    concurrency: 5,
    config: {
      rateLimit: 500,
      timeout: 15000,
      respectRobotsTxt: true,
      maxRetries: 2,
    },
  });

  const productUrls = crawlResult.productLinks.slice(0, maxProducts);
  console.log("   Pages visited:", crawlResult.pagesVisited.length);
  console.log("   Product URLs found:", crawlResult.productLinks.length);
  console.log("   Product URLs to scrape this run:", productUrls.length);

  if (productUrls.length === 0) {
    console.log("\nNo product URLs found. Exiting.");
    return;
  }

  // 4) Scrape products and upsert into DB
  console.log("\n[4/4] Scraping product pages and saving to DB...");
  const scrapedProducts = await scrapeMultipleProducts(productUrls, {
    rateLimit: 500,
    timeout: 15000,
    respectRobotsTxt: true,
    maxRetries: 2,
  });

  const distributorId = distributor.id;

  const sourceUrls = scrapedProducts
    .map((p) => p.sourceUrl)
    .filter((u): u is string => !!u);

  const existing = await prisma.equipment.findMany({
    where: {
      distributorId,
      sourceUrl: { in: sourceUrls },
    },
  });

  const existingMap = new Map(existing.map((e) => [e.sourceUrl, e]));

  let created = 0;
  let updated = 0;
  let rejected = 0;

  for (const p of scrapedProducts) {
    if (!p.name || (!p.price && !p.sourceUrl)) {
      rejected++;
      continue;
    }

    const existingEq = p.sourceUrl ? existingMap.get(p.sourceUrl) : undefined;
    const baseData = {
      distributorId,
      category: detectCategory(p as ScrapedProduct),
      name: p.name,
      manufacturer: p.manufacturer || null,
      modelNumber: p.modelNumber || p.name.substring(0, 50),
      description: p.description || null,
      specifications: p.specifications
        ? JSON.stringify(p.specifications)
        : null,
      unitPrice: p.price || existingEq?.unitPrice || 0,
      imageUrl: p.imageUrl || existingEq?.imageUrl || null,
      sourceUrl: p.sourceUrl || existingEq?.sourceUrl || null,
      dataSheetUrl: p.dataSheetUrl || existingEq?.dataSheetUrl || null,
      inStock: p.inStock !== false,
      lastScrapedAt: new Date(),
    };

    if (existingEq) {
      await prisma.equipment.update({
        where: { id: existingEq.id },
        data: baseData,
      });
      updated++;
    } else {
      await prisma.equipment.create({ data: baseData });
      created++;
    }
  }

  console.log("\n=== SCRAPE SUMMARY ===");
  console.log("Products scraped:", scrapedProducts.length);
  console.log("Created:", created);
  console.log("Updated:", updated);
  console.log("Rejected (missing name/price):", rejected);
}

main()
  .catch((err) => {
    console.error("Full scrape failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


