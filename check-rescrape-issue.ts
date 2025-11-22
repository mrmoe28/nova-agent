#!/usr/bin/env tsx
/**
 * Check why rescraping isn't increasing equipment count
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
config({ path: resolve(__dirname, ".env.local") });

import { prisma } from "./src/lib/prisma";

async function checkRescrapeIssue() {
  try {
    console.log("🔍 Checking why rescraping isn't increasing equipment count...\n");

    const distributor = await prisma.distributor.findFirst({
      where: { name: "Renewable Outdoors" },
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            sourceUrl: true,
            lastScrapedAt: true,
          },
        },
        scrapeHistory: {
          orderBy: { scrapedAt: "desc" },
          take: 5,
        },
      },
    });

    if (!distributor) {
      console.log("❌ Distributor not found");
      return;
    }

    console.log(`📦 Distributor: ${distributor.name}`);
    console.log(`   Current Equipment Count: ${distributor.equipment.length}\n`);

    console.log("📊 Recent Scrape History:");
    distributor.scrapeHistory.forEach((h) => {
      console.log(
        `   ${h.scrapedAt.toISOString()}: ${h.status} - Found: ${h.itemsFound}, Saved: ${h.itemsSaved}`,
      );
      if (h.errorMessage) {
        console.log(`      Error: ${h.errorMessage}`);
      }
    });

    // Check for duplicate sourceUrls
    const sourceUrls = distributor.equipment
      .map((e) => e.sourceUrl)
      .filter(Boolean) as string[];
    const uniqueUrls = new Set(sourceUrls);
    const duplicates = sourceUrls.length - uniqueUrls.size;

    console.log(`\n🔗 Source URL Analysis:`);
    console.log(`   Total equipment with sourceUrl: ${sourceUrls.length}`);
    console.log(`   Unique sourceUrls: ${uniqueUrls.size}`);
    console.log(`   Duplicate sourceUrls: ${duplicates}`);

    // Check equipment without sourceUrl
    const withoutSourceUrl = distributor.equipment.filter((e) => !e.sourceUrl);
    console.log(`   Equipment without sourceUrl: ${withoutSourceUrl.length}`);

    // Check last scraped dates
    const recentScrapes = distributor.equipment.filter((e) => {
      if (!e.lastScrapedAt) return false;
      const daysSince = (Date.now() - e.lastScrapedAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince < 1; // Last 24 hours
    });

    console.log(`\n⏰ Equipment scraped in last 24 hours: ${recentScrapes.length}`);

    // Check if products are being filtered out
    console.log(`\n🔍 Potential Issues:`);
    if (distributor.scrapeHistory[0]?.itemsFound > distributor.scrapeHistory[0]?.itemsSaved) {
      const diff =
        distributor.scrapeHistory[0].itemsFound - distributor.scrapeHistory[0].itemsSaved;
      console.log(
        `   ⚠️  Latest scrape found ${distributor.scrapeHistory[0].itemsFound} items but only saved ${distributor.scrapeHistory[0].itemsSaved}`,
      );
      console.log(`   ⚠️  ${diff} items were filtered out (likely validation failures)`);
    }

    if (duplicates > 0) {
      console.log(
        `   ⚠️  ${duplicates} duplicate sourceUrls found - products might be getting updated instead of created`,
      );
    }
  } catch (error) {
    console.error("Error checking rescrape issue:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRescrapeIssue();

