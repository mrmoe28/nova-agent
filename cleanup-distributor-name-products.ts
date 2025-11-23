#!/usr/bin/env tsx
/**
 * Clean up products that have distributor names instead of product names
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
config({ path: resolve(__dirname, ".env.local") });

import { prisma } from "./src/lib/prisma";

async function cleanupDistributorNameProducts() {
  try {
    console.log("🧹 Cleaning up products with distributor names...\n");

    // Get all distributors
    const distributors = await prisma.distributor.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    let totalFixed = 0;
    let totalMarkedInactive = 0;
    let totalDeleted = 0;

    for (const distributor of distributors) {
      const distributorNameLower = distributor.name.toLowerCase().trim();
      
      console.log(`\n📦 Processing: ${distributor.name}`);

      // Find equipment where name matches distributor name
      const problematicEquipment = await prisma.equipment.findMany({
        where: {
          distributorId: distributor.id,
          name: {
            equals: distributor.name,
            mode: "insensitive",
          },
        },
      });

      if (problematicEquipment.length === 0) {
        console.log(`   ✅ No problematic products found`);
        continue;
      }

      console.log(`   Found ${problematicEquipment.length} products with distributor name`);

      for (const equipment of problematicEquipment) {
        let newName: string | null = null;
        let shouldUpdate = false;
        let shouldMarkInactive = false;
        let shouldDelete = false;

        // Strategy 1: Try to extract name from modelNumber
        if (equipment.modelNumber && equipment.modelNumber !== equipment.name) {
          const modelLower = equipment.modelNumber.toLowerCase();
          const distNameLower = distributorNameLower;
          
          // If modelNumber doesn't contain distributor name, use it
          if (!modelLower.includes(distNameLower) && modelLower.length > 3) {
            newName = equipment.modelNumber;
            shouldUpdate = true;
            console.log(`   ✏️  ${equipment.id}: Using modelNumber "${newName}"`);
          }
        }

        // Strategy 2: Try to extract from description
        if (!newName && equipment.description) {
          // Look for product name patterns in description
          const desc = equipment.description;
          // Try to find first sentence or line that might be a product name
          const firstLine = desc.split(/[.\n]/)[0].trim();
          if (
            firstLine.length > 5 &&
            firstLine.length < 100 &&
            !firstLine.toLowerCase().includes(distributorNameLower)
          ) {
            newName = firstLine;
            shouldUpdate = true;
            console.log(`   ✏️  ${equipment.id}: Using description excerpt "${newName}"`);
          }
        }

        // Strategy 3: Try to extract from sourceUrl
        if (!newName && equipment.sourceUrl) {
          try {
            const url = new URL(equipment.sourceUrl);
            const pathParts = url.pathname.split("/").filter(Boolean);
            
            // Look for product slug in URL (usually last meaningful part)
            for (let i = pathParts.length - 1; i >= 0; i--) {
              const part = pathParts[i];
              // Skip common URL parts
              if (
                !["product", "products", "item", "p", "shop", "store"].includes(
                  part.toLowerCase(),
                ) &&
                part.length > 3 &&
                part.length < 50
              ) {
                // Decode URL and format as title
                const decoded = decodeURIComponent(part)
                  .replace(/[-_]/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase());
                newName = decoded;
                shouldUpdate = true;
                console.log(`   ✏️  ${equipment.id}: Using URL slug "${newName}"`);
                break;
              }
            }
          } catch {
            // Invalid URL, skip
          }
        }

        // Strategy 4: Use modelNumber with category prefix
        if (!newName && equipment.modelNumber && equipment.category) {
          const categoryName = equipment.category.replace(/_/g, " ");
          newName = `${categoryName} - ${equipment.modelNumber}`;
          shouldUpdate = true;
          console.log(`   ✏️  ${equipment.id}: Using category + modelNumber "${newName}"`);
        }

        // Strategy 5: Use generic name with category
        if (!newName && equipment.category) {
          const categoryName = equipment.category.replace(/_/g, " ");
          newName = `${categoryName} Product`;
          shouldUpdate = true;
          console.log(`   ✏️  ${equipment.id}: Using generic category name "${newName}"`);
        }

        // Apply fixes
        if (shouldUpdate && newName) {
          try {
            await prisma.equipment.update({
              where: { id: equipment.id },
              data: { name: newName },
            });
            totalFixed++;
            console.log(`   ✅ Updated: "${equipment.name}" → "${newName}"`);
          } catch (error) {
            console.error(`   ❌ Failed to update ${equipment.id}:`, error);
          }
        } else if (equipment.sourceUrl) {
          // If we have a sourceUrl but couldn't extract a name, mark as inactive
          // (might be a valid product but we can't determine the name)
          try {
            await prisma.equipment.update({
              where: { id: equipment.id },
              data: { isActive: false },
            });
            totalMarkedInactive++;
            console.log(`   ⚠️  Marked inactive: ${equipment.id} (has sourceUrl but no extractable name)`);
          } catch (error) {
            console.error(`   ❌ Failed to mark inactive ${equipment.id}:`, error);
          }
        } else {
          // No sourceUrl and no way to fix - likely invalid, delete it
          try {
            await prisma.equipment.delete({
              where: { id: equipment.id },
            });
            totalDeleted++;
            console.log(`   🗑️  Deleted: ${equipment.id} (no sourceUrl and no extractable name)`);
          } catch (error) {
            console.error(`   ❌ Failed to delete ${equipment.id}:`, error);
          }
        }
      }
    }

    console.log(`\n\n📊 CLEANUP SUMMARY`);
    console.log(`   ✅ Fixed (renamed): ${totalFixed}`);
    console.log(`   ⚠️  Marked inactive: ${totalMarkedInactive}`);
    console.log(`   🗑️  Deleted: ${totalDeleted}`);
    console.log(`   📦 Total processed: ${totalFixed + totalMarkedInactive + totalDeleted}`);
  } catch (error) {
    console.error("Error cleaning up products:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDistributorNameProducts();


