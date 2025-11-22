import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, ".env.local") });

import { prisma } from "./src/lib/prisma";

async function cleanup() {
  console.log("🧹 Cleaning up bad equipment data...\n");

  // Delete equipment with $0 price (likely category pages scraped as products)
  const deleted = await prisma.equipment.deleteMany({
    where: {
      unitPrice: 0,
      name: {
        in: ["Solar Inverters", "Solar Panels", "Batteries", "Solar Racking"],
      },
    },
  });

  console.log(`✅ Deleted ${deleted.count} bad equipment record(s)`);

  // Also delete orphaned price snapshots
  const deletedSnapshots = await prisma.priceSnapshot.deleteMany({
    where: {
      equipment: {
        is: null,
      },
    },
  });

  console.log(`✅ Deleted ${deletedSnapshots.count} orphaned price snapshot(s)`);
  console.log("\n✅ Cleanup complete!");
}

cleanup()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
