#!/usr/bin/env tsx
import { prisma } from "./src/lib/prisma";

async function main() {
  const recent = await prisma.crawlJob.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: { distributor: true },
  });

  console.log("Recent CrawlJobs:");
  console.log(JSON.stringify(recent, null, 2));

  await prisma.$disconnect();
}

main();


