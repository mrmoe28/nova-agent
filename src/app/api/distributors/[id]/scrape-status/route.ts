import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/distributors/[id]/scrape-status
 * Check the status of an ongoing scrape job
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: distributorId } = await params;

    // Get the most recent crawl job for this distributor
    const latestJob = await prisma.crawlJob.findFirst({
      where: { distributorId },
      orderBy: { createdAt: "desc" },
    });

    if (!latestJob) {
      return NextResponse.json({
        status: "not_found",
        message: "No scrape jobs found for this distributor",
      });
    }

    // Get equipment count
    const equipmentCount = await prisma.equipment.count({
      where: { distributorId },
    });

    return NextResponse.json({
      jobId: latestJob.id,
      status: latestJob.status,
      type: latestJob.type,
      productsProcessed: latestJob.productsProcessed,
      productsUpdated: latestJob.productsUpdated,
      equipmentCount,
      startedAt: latestJob.startedAt,
      completedAt: latestJob.completedAt,
      errorMessage: latestJob.errorMessage,
      metadata: latestJob.metadata ? JSON.parse(latestJob.metadata) : null,
    });
  } catch (error) {
    console.error("Error checking scrape status:", error);
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to check status",
      },
      { status: 500 },
    );
  }
}
