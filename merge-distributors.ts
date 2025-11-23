#!/usr/bin/env tsx
/**
 * Merge multiple duplicate distributors into a single target distributor.
 *
 * Usage:
 *   npx tsx merge-distributors.ts <targetId> <sourceId1> <sourceId2> ...
 *
 * Example (Renewable Outdoors):
 *   npx tsx merge-distributors.ts cmibyvko3000jld047rxx4c82 cmibyuehc0002ld04herss6s4 cmibyski10002ld04fl57u3fa
 */

import dotenv from "dotenv";
import { resolve } from "path";
import { prisma } from "./src/lib/prisma";

// Load DATABASE_URL from .env.local for scripts
dotenv.config({ path: resolve(__dirname, ".env.local") });

async function mergeDistributors(targetId: string, sourceIds: string[]) {
  if (!targetId || sourceIds.length === 0) {
    console.error(
      "Usage: npx tsx merge-distributors.ts <targetId> <sourceId1> <sourceId2> ...",
    );
    process.exit(1);
  }

  console.log("=== Distributor Merge ===\n");
  console.log("Target distributor ID:", targetId);
  console.log("Source distributor IDs:", sourceIds.join(", "));

  const target = await prisma.distributor.findUnique({
    where: { id: targetId },
    include: {
      _count: { select: { equipment: true } },
    },
  });

  if (!target) {
    console.error("❌ Target distributor not found");
    process.exit(1);
  }

  console.log(
    `\nTarget: ${target.name} (${target.id}) - ${target._count.equipment} equipment items`,
  );

  for (const sourceId of sourceIds) {
    if (sourceId === targetId) continue;

    const source = await prisma.distributor.findUnique({
      where: { id: sourceId },
      include: {
        _count: { select: { equipment: true } },
      },
    });

    if (!source) {
      console.warn(`\n⚠️  Source distributor not found: ${sourceId}`);
      continue;
    }

    console.log(
      `\nMerging from: ${source.name} (${source.id}) - ${source._count.equipment} equipment items`,
    );

    // Reassign equipment
    const updatedEquipment = await prisma.equipment.updateMany({
      where: { distributorId: source.id },
      data: { distributorId: target.id },
    });
    console.log(
      `   → Reassigned ${updatedEquipment.count} equipment items to target`,
    );

    // Reassign scrape history
    const updatedScrapes = await prisma.scrapeHistory.updateMany({
      where: { distributorId: source.id },
      data: { distributorId: target.id },
    });
    console.log(
      `   → Reassigned ${updatedScrapes.count} scrape history rows to target`,
    );

    // Reassign crawl jobs
    const updatedJobs = await prisma.crawlJob.updateMany({
      where: { distributorId: source.id },
      data: { distributorId: target.id },
    });
    console.log(
      `   → Reassigned ${updatedJobs.count} crawl jobs to target`,
    );

    // Reassign equipment catalogs (if any)
    const updatedCatalogs = await prisma.equipmentCatalog.updateMany({
      where: { distributorId: source.id },
      data: { distributorId: target.id },
    });
    console.log(
      `   → Reassigned ${updatedCatalogs.count} equipment catalogs to target`,
    );

    // Finally, delete the now-empty source distributor
    await prisma.distributor.delete({
      where: { id: source.id },
    });
    console.log(`   → Deleted source distributor ${source.id}`);
  }

  const finalTarget = await prisma.distributor.findUnique({
    where: { id: target.id },
    include: {
      _count: { select: { equipment: true } },
    },
  });

  console.log("\n✅ Merge complete.");
  if (finalTarget) {
    console.log(
      `Final target state: ${finalTarget.name} (${finalTarget.id}) - ${finalTarget._count.equipment} equipment items`,
    );
  }
}

const [, , targetId, ...sourceIds] = process.argv;

mergeDistributors(targetId, sourceIds)
  .catch((error) => {
    console.error("Error during merge:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


