#!/usr/bin/env tsx
/**
 * Check scraping status and diagnose issues
 */

import { prisma } from "./src/lib/prisma";

async function main() {
  console.log("🔍 Checking Scraping Status\n");

  // Check database connection
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully");
  } catch (error) {
    console.error("❌ Database connection failed:");
    console.error(error);
    process.exit(1);
  }

  // Check recent crawl jobs
  console.log("\n📋 Recent Crawl Jobs (last 10):");
  const crawlJobs = await prisma.crawlJob.findMany({
    take: 10,
    orderBy: { startedAt: "desc" },
    include: {
      distributor: true,
    },
  });

  if (crawlJobs.length === 0) {
    console.log("   No crawl jobs found");
  } else {
    crawlJobs.forEach((job) => {
      const duration = job.completedAt
        ? Math.round(
            (job.completedAt.getTime() - job.startedAt.getTime()) / 1000,
          )
        : null;
      const distributorName = job.distributor?.name || "Unknown";
      console.log(
        `   ${job.status === "completed" ? "✅" : job.status === "failed" ? "❌" : "⏳"} ${distributorName} - ${job.status}`,
      );
      console.log(
        `      Started: ${job.startedAt.toLocaleString()}, Products: ${job.productsScraped}`,
      );
      if (duration) {
        console.log(`      Duration: ${duration}s`);
      }
      if (job.errorMessage) {
        console.log(`      Error: ${job.errorMessage}`);
      }
    });
  }

  // Check equipment count
  console.log("\n📦 Equipment Database Status:");
  const equipmentCount = await prisma.equipment.count();
  console.log(`   Total equipment: ${equipmentCount}`);

  const recentEquipment = await prisma.equipment.count({
    where: {
      lastScrapedAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      },
    },
  });
  console.log(`   Scraped in last 24h: ${recentEquipment}`);

  // Check equipment by distributor
  const byDistributor = await prisma.equipment.groupBy({
    by: ["distributorId"],
    _count: true,
    orderBy: {
      _count: {
        distributorId: "desc",
      },
    },
    take: 10,
  });

  console.log("\n🏢 Equipment by Distributor (top 10):");
  for (const group of byDistributor) {
    if (group.distributorId) {
      const dist = await prisma.distributor.findUnique({
        where: { id: group.distributorId },
      });
      console.log(`   ${dist?.name || "Unknown"}: ${group._count} products`);
    }
  }

  // Check scrape history
  console.log("\n📊 Scrape History (last 10):");
  const scrapeHistory = await prisma.scrapeHistory.findMany({
    take: 10,
    orderBy: { scrapedAt: "desc" },
    include: {
      distributor: true,
    },
  });

  if (scrapeHistory.length === 0) {
    console.log("   No scrape history found");
  } else {
    scrapeHistory.forEach((history) => {
      console.log(
        `   ${history.success ? "✅" : "❌"} ${history.distributor.name}`,
      );
      console.log(
        `      ${history.scrapedAt.toLocaleString()} - ${history.itemsScraped} items`,
      );
      if (history.errorMessage) {
        console.log(`      Error: ${history.errorMessage}`);
      }
    });
  }

  // Check for failing patterns
  const failedJobs = await prisma.crawlJob.count({
    where: { status: "failed" },
  });
  const totalJobs = await prisma.crawlJob.count();

  console.log("\n📈 Success Rate:");
  if (totalJobs > 0) {
    const successRate = ((totalJobs - failedJobs) / totalJobs) * 100;
    console.log(`   ${successRate.toFixed(1)}% (${totalJobs - failedJobs}/${totalJobs} successful)`);
  } else {
    console.log("   No scraping jobs yet");
  }

  // Recent failures
  if (failedJobs > 0) {
    console.log("\n❌ Recent Failures:");
    const recentFailures = await prisma.crawlJob.findMany({
      where: { status: "failed" },
      take: 5,
      orderBy: { startedAt: "desc" },
      include: { distributor: true },
    });

    recentFailures.forEach((job) => {
      console.log(`   ${job.distributor.name}:`);
      console.log(`      ${job.errorMessage || "Unknown error"}`);
      console.log(`      ${job.startedAt.toLocaleString()}`);
    });
  }

  await prisma.$disconnect();
}

main();

