import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixFilePaths() {
  try {
    console.log("Fixing file paths in database...");
    
    // Get all bills with /tmp/uploads paths
    const bills = await prisma.bill.findMany({
      where: {
        filePath: {
          startsWith: "/tmp/uploads/",
        },
      },
    });
    
    console.log(`Found ${bills.length} bills with old /tmp/uploads paths`);
    
    // Update each bill path
    for (const bill of bills) {
      // Convert /tmp/uploads/PROJECT_ID/FILE to /uploads/PROJECT_ID/FILE
      const newPath = bill.filePath.replace("/tmp/uploads/", "/uploads/");
      
      await prisma.bill.update({
        where: { id: bill.id },
        data: { filePath: newPath },
      });
      
      console.log(`✓ Updated ${bill.id}: ${bill.filePath} → ${newPath}`);
    }
    
    console.log(`\n✅ Successfully updated ${bills.length} file paths`);
    
  } catch (error) {
    console.error("Error fixing file paths:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixFilePaths();
