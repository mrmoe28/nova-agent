import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
config({ path: resolve(__dirname, ".env.local") });

import { prisma } from "./src/lib/prisma";

async function checkEquipmentDisplay() {
  try {
    console.log("🔍 Checking why scraped products might not be showing...\n");

    // Get all distributors
    const distributors = await prisma.distributor.findMany({
      select: {
        id: true,
        name: true,
        website: true,
      },
    });

    console.log(`Found ${distributors.length} distributors\n`);

    for (const distributor of distributors) {
      console.log(`\n📦 Distributor: ${distributor.name} (${distributor.id})`);
      console.log(`   Website: ${distributor.website || "N/A"}`);

      // Count all equipment (no filters)
      const allEquipment = await prisma.equipment.count({
        where: { distributorId: distributor.id },
      });

      // Count active equipment
      const activeEquipment = await prisma.equipment.count({
        where: {
          distributorId: distributor.id,
          isActive: true,
        },
      });

      // Count inactive equipment
      const inactiveEquipment = await prisma.equipment.count({
        where: {
          distributorId: distributor.id,
          isActive: false,
        },
      });

      // Count equipment without name or price
      const invalidEquipment = await prisma.equipment.count({
        where: {
          distributorId: distributor.id,
          OR: [
            { name: "" },
            { unitPrice: 0 },
          ],
        },
      });

      // Count equipment by category
      const byCategory = await prisma.equipment.groupBy({
        by: ["category"],
        where: { distributorId: distributor.id },
        _count: true,
      });

      console.log(`   Total Equipment: ${allEquipment}`);
      console.log(`   Active: ${activeEquipment}`);
      console.log(`   Inactive: ${inactiveEquipment}`);
      console.log(`   Invalid (no name/price): ${invalidEquipment}`);

      if (byCategory.length > 0) {
        console.log(`   By Category:`);
        byCategory.forEach((cat) => {
          console.log(`     - ${cat.category}: ${cat._count}`);
        });
      }

      // Check for duplicates (same name or modelNumber)
      const duplicates = await prisma.$queryRaw<Array<{ name: string; count: bigint }>>`
        SELECT name, COUNT(*) as count
        FROM "Equipment"
        WHERE "distributorId" = ${distributor.id}
        GROUP BY name
        HAVING COUNT(*) > 1
        LIMIT 10
      `;

      if (duplicates.length > 0) {
        console.log(`   ⚠️  Duplicate names found:`);
        duplicates.forEach((dup) => {
          console.log(`     - "${dup.name}": ${dup.count} occurrences`);
        });
      }

      // Check recent scrapes
      const recentScrapes = await prisma.scrapeHistory.findMany({
        where: { distributorId: distributor.id },
        orderBy: { scrapedAt: "desc" },
        take: 3,
        select: {
          scrapedAt: true,
          status: true,
          itemsFound: true,
          itemsSaved: true,
        },
      });

      if (recentScrapes.length > 0) {
        console.log(`   Recent Scrapes:`);
        recentScrapes.forEach((scrape) => {
          console.log(
            `     - ${scrape.scrapedAt.toISOString()}: ${scrape.status} (Found: ${scrape.itemsFound}, Saved: ${scrape.itemsSaved})`,
          );
        });
      }

      // Check if there's a mismatch between itemsFound and actual equipment count
      if (recentScrapes.length > 0) {
        const latestScrape = recentScrapes[0];
        if (latestScrape.itemsFound > allEquipment) {
          console.log(
            `   ⚠️  WARNING: Latest scrape found ${latestScrape.itemsFound} items but only ${allEquipment} exist in database!`,
          );
        }
      }
    }

    // Summary
    console.log(`\n\n📊 SUMMARY`);
    const totalEquipment = await prisma.equipment.count();
    const totalActive = await prisma.equipment.count({ where: { isActive: true } });
    const totalInactive = await prisma.equipment.count({ where: { isActive: false } });

    console.log(`Total Equipment in Database: ${totalEquipment}`);
    console.log(`Active: ${totalActive}`);
    console.log(`Inactive: ${totalInactive}`);

    // Check API endpoint behavior
    console.log(`\n🔍 API Endpoint Analysis:`);
    console.log(
      `   /api/distributors/[id] - Does NOT filter by isActive (shows all equipment)`,
    );
    console.log(
      `   /api/equipment - Filters by isActive: true (only shows active equipment)`,
    );
    console.log(
      `   Frontend uses /api/distributors/[id] - Should show all equipment`,
    );
  } catch (error) {
    console.error("Error checking equipment:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEquipmentDisplay();

