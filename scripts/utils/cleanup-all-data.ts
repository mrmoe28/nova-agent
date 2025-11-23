import dotenv from "dotenv";
import { prisma } from "./src/lib/prisma";

// Load local database URL for Prisma-powered scripts
// We explicitly read .env.local because Next.js dev already uses it,
// but standalone tsx scripts do not automatically load it.
dotenv.config({ path: ".env.local" });

async function main() {
  console.log("Cleaning up all test data...");

  // Delete in correct order due to foreign keys
  await prisma.priceSnapshot.deleteMany({});
  console.log("✓ Deleted all price snapshots");

  await prisma.equipment.deleteMany({});
  console.log("✓ Deleted all equipment");

  await prisma.scrapeHistory.deleteMany({});
  console.log("✓ Deleted all scrape history");

  await prisma.crawlJob.deleteMany({});
  console.log("✓ Deleted all crawl jobs");

  await prisma.distributor.deleteMany({});
  console.log("✓ Deleted all distributors");

  console.log("\n✅ Database cleaned successfully");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
