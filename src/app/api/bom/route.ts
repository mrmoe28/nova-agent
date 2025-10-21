import { NextRequest, NextResponse } from "next/server";
import { regenerateBom, SizingError } from "@/lib/system-sizing";

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
