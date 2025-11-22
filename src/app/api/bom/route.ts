import { NextRequest, NextResponse } from "next/server";
import { regenerateBom, SizingError } from "@/lib/system-sizing";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/bom?projectId=X - Fetch existing BOM items without regenerating
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
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

    // Calculate total cost
    const totalCost = bomItems.reduce((sum, item) => sum + item.totalPriceUsd, 0);

    return NextResponse.json({
      success: true,
      bomItems,
      totalCost,
      distributorId: null, // Distributor ID is managed separately in page state
    });
  } catch (error) {
    console.error("Error fetching BOM items:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch BOM items" },
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
    const { projectId, skipStatusUpdate = false, distributorId, selectedEquipmentIds } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "Project ID is required" },
        { status: 400 },
      );
    }

    const result = await regenerateBom(projectId, skipStatusUpdate, distributorId, selectedEquipmentIds);

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
