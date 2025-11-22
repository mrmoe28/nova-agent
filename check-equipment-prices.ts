import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
config({ path: resolve(__dirname, ".env.local") });

import { prisma } from "./src/lib/prisma";
import { createLogger } from "./src/lib/logger";

const logger = createLogger("price-check");

async function checkEquipmentPrices() {
  console.log("🔍 Checking equipment prices across all distributors...\n");

  // Get all distributors with their equipment
  const distributors = await prisma.distributor.findMany({
    include: {
      equipment: {
        select: {
          id: true,
          name: true,
          unitPrice: true,
          sourceUrl: true,
          inStock: true,
          lastScrapedAt: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  if (distributors.length === 0) {
    console.log("❌ No distributors found in database");
    return;
  }

  console.log(`Found ${distributors.length} distributor(s)\n`);
  console.log("=".repeat(80));

  let totalEquipment = 0;
  let totalWithPrices = 0;
  let totalWithoutPrices = 0;

  for (const distributor of distributors) {
    const equipmentCount = distributor.equipment.length;
    const withPrices = distributor.equipment.filter((e) => e.unitPrice > 0).length;
    const withoutPrices = equipmentCount - withPrices;

    totalEquipment += equipmentCount;
    totalWithPrices += withPrices;
    totalWithoutPrices += withoutPrices;

    console.log(`\n📦 ${distributor.name}`);
    console.log(`   ID: ${distributor.id}`);
    console.log(`   Website: ${distributor.website || "N/A"}`);
    console.log(`   Last Scraped: ${distributor.lastScrapedAt || "Never"}`);
    console.log(`   Total Equipment: ${equipmentCount}`);
    console.log(`   ✅ With Prices: ${withPrices}`);
    console.log(`   ❌ Without Prices: ${withoutPrices}`);

    if (withoutPrices > 0) {
      console.log(`\n   Missing Prices (${withoutPrices} items):`);
      const missingPrices = distributor.equipment.filter((e) => e.unitPrice === 0);

      // Show first 10 items without prices
      missingPrices.slice(0, 10).forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item.name.substring(0, 60)}${item.name.length > 60 ? "..." : ""}`);
        console.log(`      Price: $${item.unitPrice}`);
        console.log(`      URL: ${item.sourceUrl || "N/A"}`);
        console.log(`      Last Scraped: ${item.lastScrapedAt || "Never"}`);
      });

      if (missingPrices.length > 10) {
        console.log(`   ... and ${missingPrices.length - 10} more`);
      }
    }

    // Show sample of items WITH prices for comparison
    if (withPrices > 0) {
      console.log(`\n   ✅ Sample items WITH prices (${Math.min(withPrices, 3)} of ${withPrices}):`);
      const withPricesSample = distributor.equipment
        .filter((e) => e.unitPrice > 0)
        .slice(0, 3);

      withPricesSample.forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item.name.substring(0, 60)}${item.name.length > 60 ? "..." : ""}`);
        console.log(`      Price: $${item.unitPrice.toFixed(2)}`);
        console.log(`      URL: ${item.sourceUrl || "N/A"}`);
      });
    }

    console.log("\n" + "=".repeat(80));
  }

  // Summary
  console.log("\n📊 SUMMARY");
  console.log("=".repeat(80));
  console.log(`Total Distributors: ${distributors.length}`);
  console.log(`Total Equipment: ${totalEquipment}`);
  console.log(`✅ With Prices: ${totalWithPrices} (${totalEquipment > 0 ? ((totalWithPrices / totalEquipment) * 100).toFixed(1) : 0}%)`);
  console.log(`❌ Without Prices: ${totalWithoutPrices} (${totalEquipment > 0 ? ((totalWithoutPrices / totalEquipment) * 100).toFixed(1) : 0}%)`);

  // Check for common URL patterns in items without prices
  const allMissingPrices = distributors.flatMap((d) =>
    d.equipment.filter((e) => e.unitPrice === 0)
  );

  if (allMissingPrices.length > 0) {
    console.log("\n🔍 ANALYSIS: Common URL patterns for items missing prices");
    console.log("=".repeat(80));

    const urlPatterns: { [key: string]: number } = {};
    allMissingPrices.forEach((item) => {
      if (item.sourceUrl) {
        try {
          const url = new URL(item.sourceUrl);
          const pattern = `${url.hostname}${url.pathname.split("/").slice(0, 3).join("/")}`;
          urlPatterns[pattern] = (urlPatterns[pattern] || 0) + 1;
        } catch {
          // Invalid URL
        }
      }
    });

    const sortedPatterns = Object.entries(urlPatterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    sortedPatterns.forEach(([pattern, count]) => {
      console.log(`   ${count}x: ${pattern}`);
    });
  }

  console.log("\n✅ Price check complete");
}

checkEquipmentPrices()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
