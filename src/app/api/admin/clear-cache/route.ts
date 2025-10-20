import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Admin endpoint to clear PostgreSQL prepared statement cache
 * This fixes "cached plan must not change result type" errors after schema changes
 * 
 * Usage: GET /api/admin/clear-cache?secret=YOUR_CRON_SECRET
 */
export async function GET(request: Request) {
  try {
    // Verify secret to prevent unauthorized access
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("Clearing PostgreSQL prepared statement cache...");
    
    // Execute DISCARD ALL to clear cached plans
    await prisma.$executeRaw`DISCARD ALL;`;
    
    console.log("✓ Cache cleared");
    
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
      message: "Cache cleared successfully",
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
