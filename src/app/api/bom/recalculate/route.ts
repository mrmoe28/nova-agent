import { NextRequest, NextResponse } from "next/server";
import { recalculateSystemFromBOM } from "@/lib/bom-calculations";
import { updateAnalysisFromBOM } from "@/lib/energy-calculations";

/**
 * POST /api/bom/recalculate - Recalculate system specs and energy from actual BOM equipment
 * This ensures calculations reflect the actual equipment selected, not defaults
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, updateAnalysis = true } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "Project ID is required" },
        { status: 400 }
      );
    }

    // Recalculate system specs from BOM
    const systemResult = await recalculateSystemFromBOM(projectId);

    if (!systemResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: systemResult.error || "Failed to recalculate system from BOM",
        },
        { status: 400 }
      );
    }

    // Update energy calculations if requested
    let analysisResult = null;
    if (updateAnalysis) {
      analysisResult = await updateAnalysisFromBOM(projectId);
    }

    return NextResponse.json({
      success: true,
      systemUpdated: systemResult.updated,
      systemSpecs: systemResult.systemSpecs,
      analysisUpdated: analysisResult?.updated || false,
      message: "System and energy calculations updated from BOM equipment",
    });
  } catch (error) {
    console.error("Error recalculating from BOM:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to recalculate from BOM",
      },
      { status: 500 }
    );
  }
}

