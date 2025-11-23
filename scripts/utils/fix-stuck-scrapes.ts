#!/usr/bin/env tsx
/**
 * Fix stuck scraping jobs
 */

import { prisma } from "./src/lib/prisma";

async function main() {
  console.log("🔧 Fixing Stuck Scraping Jobs\n");

  await prisma.$connect();

  // 1. Find jobs stuck in "running" status for > 30 minutes
  // Increased from 5 min to 30 min to allow long scraping operations to complete
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  
  const stuckJobs = await prisma.crawlJob.findMany({
    where: {
      status: "running",
      startedAt: {
        lt: thirtyMinutesAgo,
      },
    },
    include: {
      distributor: true,
    },
  });

  console.log(`Found ${stuckJobs.length} stuck jobs\n`);

  if (stuckJobs.length > 0) {
    console.log("Marking as failed:");
    for (const job of stuckJobs) {
      const elapsed = job.startedAt
        ? Math.round((Date.now() - job.startedAt.getTime()) / 1000 / 60)
        : 0;
      console.log(`   - ${job.distributor?.name || "Unknown"} (stuck for ${elapsed}m)`);
      
      await prisma.crawlJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          errorMessage: `Job timed out after ${elapsed} minutes - marked as failed automatically`,
          completedAt: new Date(),
        },
      });
    }
    console.log(`\n✅ Marked ${stuckJobs.length} stuck jobs as failed\n`);
  }

  // 2. Clean up orphaned crawl jobs (distributor deleted)
  // Only delete orphans older than 1 hour to avoid deleting jobs from active scraping
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const orphanedJobs = await prisma.crawlJob.findMany({
    where: {
      distributorId: null,
      createdAt: {
        lt: oneHourAgo,
      },
    },
  });

  if (orphanedJobs.length > 0) {
    console.log(`Found ${orphanedJobs.length} old orphaned crawl jobs (>1 hour old)`);
    console.log("Deleting orphaned jobs...");
    
    await prisma.crawlJob.deleteMany({
      where: {
        distributorId: null,
        createdAt: {
          lt: oneHourAgo,
        },
      },
    });
    
    console.log(`✅ Deleted ${orphanedJobs.length} orphaned jobs\n`);
  } else {
    console.log("No old orphaned jobs found\n");
  }

  // 3. Show current status
  const statusCounts = await prisma.crawlJob.groupBy({
    by: ["status"],
    _count: true,
  });

  console.log("📊 Current Job Status:");
  statusCounts.forEach((group) => {
    const icon = group.status === "completed" ? "✅" : group.status === "failed" ? "❌" : "⏳";
    console.log(`   ${icon} ${group.status}: ${group._count}`);
  });

  // 4. Show equipment status
  const equipmentTotal = await prisma.equipment.count();
  const equipmentRecent = await prisma.equipment.count({
    where: {
      lastScrapedAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
  });

  console.log("\n📦 Equipment Status:");
  console.log(`   Total: ${equipmentTotal}`);
  console.log(`   Scraped in last 24h: ${equipmentRecent}`);

  console.log("\n✅ Cleanup complete!");

  await prisma.$disconnect();
}

main();

