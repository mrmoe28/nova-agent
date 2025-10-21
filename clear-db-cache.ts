import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function clearCache() {
  try {
    console.log("Clearing PostgreSQL prepared statement cache...");
    
    // Execute DISCARD ALL to clear cached plans
    await prisma.$executeRaw`DISCARD ALL;`;
    
    console.log("✓ Cache cleared");
    
    // Test query
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        clientName: true,
        status: true,
      },
    });
    
    console.log(`✓ Successfully fetched ${projects.length} project(s)`);
    projects.forEach((p) => {
      console.log(`  - ${p.clientName}: ${p.status}`);
    });
    
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearCache();


