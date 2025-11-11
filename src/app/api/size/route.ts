import { NextRequest, NextResponse } from "next/server";
import { performSystemSizing, SizingError } from "@/lib/system-sizing";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, backupDurationHrs, criticalLoadKw, distributorId } =
      body;

    const result = await performSystemSizing({
      projectId,
      backupDurationHrs,
      criticalLoadKw,
      distributorId,
      updateProjectStatus: true,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error sizing system:", error);
    if (error instanceof SizingError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to size system" },
      { status: 500 },
    );
  }
}
