import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

// Ensure DATABASE_URL is loaded for standalone scripts
dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient();

async function checkAllData() {
  try {
    console.log("\n=== ALL DISTRIBUTORS WITH EQUIPMENT COUNT ===\n");
    const allDistributors = await prisma.distributor.findMany({
      include: {
        _count: {
          select: { equipment: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    for (const dist of allDistributors) {
      console.log(`${dist.name}`);
      console.log(`  ID: ${dist.id}`);
      console.log(`  Equipment: ${dist._count.equipment}`);
      console.log(`  Created: ${dist.createdAt}`);
      console.log(`  Last Scraped: ${dist.lastScrapedAt || "Never"}`);
      console.log(`  Website: ${dist.website}`);
      console.log();
    }

    console.log("\n=== RECENT CRAWL JOBS ===\n");
    const recentJobs = await prisma.crawlJob.findMany({
      orderBy: { startedAt: "desc" },
      take: 10,
    });

    for (const job of recentJobs) {
      console.log(`Job ID: ${job.id}`);
      console.log(`  Type: ${job.type}`);
      console.log(`  Status: ${job.status}`);
      console.log(`  Target URL: ${job.targetUrl}`);
      console.log(`  Distributor ID: ${job.distributorId || "N/A"}`);
      console.log(`  Products Processed: ${job.productsProcessed || 0}`);
      console.log(`  Products Updated: ${job.productsUpdated || 0}`);
      console.log(`  Started: ${job.startedAt}`);
      console.log(`  Completed: ${job.completedAt || "N/A"}`);
      console.log(`  Error: ${job.errorMessage || "N/A"}`);
      console.log();
    }

    console.log("\n=== TOTAL EQUIPMENT IN DATABASE ===\n");
    const totalEquipment = await prisma.equipment.count();
    console.log(`Total Equipment Records: ${totalEquipment}`);

    console.log("\n=== EQUIPMENT BY DISTRIBUTOR ===\n");
    const equipmentByDistributor = await prisma.equipment.groupBy({
      by: ["distributorId"],
      _count: {
        id: true,
      },
    });

    for (const group of equipmentByDistributor) {
      const distributor = await prisma.distributor.findUnique({
        where: { id: group.distributorId },
      });
      console.log(
        `${distributor?.name || "Unknown"} (${group.distributorId}): ${group._count.id} items`,
      );
    }

    console.log("\n=== RECENT SCRAPE HISTORY ===\n");
    const recentScrapes = await prisma.scrapeHistory.findMany({
      orderBy: { scrapedAt: "desc" },
      take: 10,
      include: {
        distributor: {
          select: {
            name: true,
            id: true,
          },
        },
      },
    });

    for (const scrape of recentScrapes) {
      console.log(`${scrape.distributor.name} (${scrape.distributor.id})`);
      console.log(`  URL: ${scrape.url}`);
      console.log(`  Status: ${scrape.status}`);
      console.log(`  Items Found: ${scrape.itemsFound}`);
      console.log(`  Items Saved: ${scrape.itemsSaved}`);
      console.log(`  Scraped At: ${scrape.scrapedAt}`);
      console.log();
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllData();
