#!/usr/bin/env tsx
/**
 * Verify Neon Database Schema
 * Checks that all required tables exist
 */

import { prisma } from "./src/lib/prisma";

async function main() {
  console.log("🔍 Verifying Neon Database Schema\n");

  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully\n");

    // Check each critical table
    const tables = [
      { name: "Project", check: () => prisma.project.count() },
      { name: "Bill", check: () => prisma.bill.count() },
      { name: "Analysis", check: () => prisma.analysis.count() },
      { name: "System", check: () => prisma.system.count() },
      { name: "BOMItem", check: () => prisma.bOMItem.count() },
      { name: "Plan", check: () => prisma.plan.count() },
      { name: "Distributor", check: () => prisma.distributor.count() },
      { name: "Equipment", check: () => prisma.equipment.count() },
      { name: "PriceSnapshot", check: () => prisma.priceSnapshot.count() },
      { name: "CrawlJob", check: () => prisma.crawlJob.count() },
      { name: "ScrapeHistory", check: () => prisma.scrapeHistory.count() },
      { name: "EnhancedBill", check: () => prisma.enhancedBill.count() },
      { name: "Utility", check: () => prisma.utility.count() },
      { name: "Tariff", check: () => prisma.tariff.count() },
      { name: "LoadProfile", check: () => prisma.loadProfile.count() },
      {
        name: "CriticalLoadProfile",
        check: () => prisma.criticalLoadProfile.count(),
      },
      { name: "SolarResource", check: () => prisma.solarResource.count() },
      {
        name: "ProductionEstimate",
        check: () => prisma.productionEstimate.count(),
      },
      {
        name: "EquipmentCatalog",
        check: () => prisma.equipmentCatalog.count(),
      },
      {
        name: "BatteryPerformanceModel",
        check: () => prisma.batteryPerformanceModel.count(),
      },
      {
        name: "SizingRecommendation",
        check: () => prisma.sizingRecommendation.count(),
      },
      {
        name: "ValidationFixture",
        check: () => prisma.validationFixture.count(),
      },
      { name: "ProjectMetrics", check: () => prisma.projectMetrics.count() },
      { name: "SystemAlert", check: () => prisma.systemAlert.count() },
    ];

    console.log("📊 Table Status:");
    let allTablesExist = true;

    for (const table of tables) {
      try {
        const count = await table.check();
        console.log(`   ✅ ${table.name.padEnd(25)} - ${count} records`);
      } catch (error) {
        console.log(`   ❌ ${table.name.padEnd(25)} - TABLE MISSING OR ERROR`);
        console.error(`      Error: ${error instanceof Error ? error.message : "Unknown"}`);
        allTablesExist = false;
      }
    }

    console.log("\n📈 Summary:");
    console.log(`   Total tables checked: ${tables.length}`);

    if (allTablesExist) {
      console.log("   ✅ All tables exist and are accessible");

      // Show critical data
      const distributorCount = await prisma.distributor.count();
      const equipmentCount = await prisma.equipment.count();
      const crawlJobCount = await prisma.crawlJob.count();

      console.log("\n📦 Critical Data:");
      console.log(`   Distributors: ${distributorCount}`);
      console.log(`   Equipment: ${equipmentCount}`);
      console.log(`   Crawl Jobs: ${crawlJobCount}`);

      console.log("\n✅ Database schema is ready for deployment!");
    } else {
      console.log("   ❌ Some tables are missing!");
      console.log("\n⚠️  Run: npx prisma db push");
    }
  } catch (error) {
    console.error("❌ Database connection failed:");
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

