import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Emergency endpoint to manually run the ProjectStatus enum migration
 * This creates the enum type if it doesn't exist
 */
export async function GET() {
  try {
    console.log("Running ProjectStatus enum migration...");
    
    // Check if enum already exists
    const enumExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'ProjectStatus'
      ) as exists;
    `;
    
    console.log("Enum exists check:", enumExists);
    
    // If enum doesn't exist, create it
    if (!enumExists || !(enumExists as { exists: boolean }[])[0]?.exists) {
      console.log("Creating ProjectStatus enum...");
      
      await prisma.$executeRaw`
        CREATE TYPE "ProjectStatus" AS ENUM ('intake', 'analysis', 'sizing', 'bom', 'plan', 'review', 'complete');
      `;
      
      console.log("✓ ProjectStatus enum created");
      
      // Normalize existing status values
      await prisma.$executeRaw`
        UPDATE "Project"
        SET status = lower(status)
        WHERE status IS NOT NULL;
      `;
      
      console.log("✓ Normalized existing status values");
      
      // Drop the default first
      await prisma.$executeRaw`
        ALTER TABLE "Project" 
        ALTER COLUMN "status" DROP DEFAULT;
      `;
      
      console.log("✓ Dropped default value");
      
      // Convert column to use enum
      await prisma.$executeRaw`
        ALTER TABLE "Project" 
        ALTER COLUMN "status" TYPE "ProjectStatus" 
        USING status::"ProjectStatus";
      `;
      
      console.log("✓ Converted status column to enum type");
      
      // Re-add the default with enum type
      await prisma.$executeRaw`
        ALTER TABLE "Project" 
        ALTER COLUMN "status" SET DEFAULT 'intake'::"ProjectStatus";
      `;
      
      console.log("✓ Re-added default value with enum type");
    } else {
      console.log("Enum already exists, skipping creation");
    }
    
    // Test query
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        clientName: true,
        status: true,
      },
      take: 3,
    });
    
    console.log(`✓ Successfully queried ${projects.length} project(s)`);

    return NextResponse.json({
      success: true,
      message: "Migration completed successfully",
      enumExists: true,
      projectCount: projects.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Migration error:", error);
    
    const errorDetails = {
      success: false,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : "Unknown",
      errorStack: error instanceof Error ? error.stack?.split('\n').slice(0, 10).join('\n') : undefined,
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json(errorDetails, { status: 500 });
  }
}
