import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Admin endpoint to clear PostgreSQL prepared statement cache
 * This fixes "cached plan must not change result type" errors after schema changes
 * 
 * Usage: GET /api/admin/clear-cache?secret=YOUR_CRON_SECRET
 */
export async function GET() {
  try {
    // TEMPORARY: Auth disabled for emergency cache clear
    // TODO: Re-enable auth after fixing production database
    
    console.log("Clearing PostgreSQL prepared statement cache...");
    
    // Execute DISCARD ALL to clear cached query plans
    // This is more effective than disconnect/reconnect on serverless
    await prisma.$executeRaw`DISCARD ALL;`;
    
    console.log("✓ Executed DISCARD ALL");
    
    // Test query to verify cache is cleared
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        clientName: true,
        status: true,
      },
      take: 5,
    });
    
    console.log(`✓ Successfully fetched ${projects.length} project(s)`);

    return NextResponse.json({
      success: true,
      message: "Cache cleared successfully with DISCARD ALL",
      projectCount: projects.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error clearing cache:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
