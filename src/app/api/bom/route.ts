import { NextRequest, NextResponse } from "next/server";
import { regenerateBom, SizingError } from "@/lib/system-sizing";
import { prisma } from "@/lib/prisma";
import { validateBOMSubtotals, getBOMTotalCost } from "@/lib/bom-calculations";

/**
 * GET /api/bom?projectId=X - Fetch existing BOM items without regenerating
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  console.log(`[API] GET /api/bom - Project ID: ${projectId}`);

  try {
    if (!projectId || projectId === "undefined" || projectId === "null") {
      console.warn(`[API] GET /api/bom - Invalid Project ID: ${projectId}`);
      return NextResponse.json(
        { success: false, error: "Project ID is required" },
        { status: 400 }
      );
    }

    // Fetch existing BOM items
    const bomItems = await prisma.bOMItem.findMany({
      where: { projectId },
      orderBy: { category: "asc" },
    });

    // Validate and get total cost with validation
    const costData = await getBOMTotalCost(projectId);

    return NextResponse.json({
      success: true,
      bomItems,
      totalCost: costData.totalCost,
      itemCount: costData.itemCount,
      validation: costData.validation,
      distributorId: null, // Distributor ID is managed separately in page state
    });
  } catch (error) {
    console.error("Error fetching BOM items:", error);
    // Log the full stack trace if available
    if (error instanceof Error) {
      console.error(error.stack);
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch BOM items",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bom - Generate/regenerate BOM
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, skipStatusUpdate = false, distributorId } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "Project ID is required" },
        { status: 400 },
      );
    }

    const result = await regenerateBom(projectId, skipStatusUpdate, distributorId);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error generating BOM:", error);
    if (error instanceof SizingError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to generate BOM" },
      { status: 500 },
    );
  }
}
