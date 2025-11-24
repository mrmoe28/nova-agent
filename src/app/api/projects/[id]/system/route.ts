import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { refreshBomAndPlan, SizingError } from "@/lib/system-sizing";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    
    const {
      solarPanelCount,
      solarPanelWattage,
      totalSolarKw,
      batteryKwh,
      inverterKw,
      backupDurationHrs,
      estimatedCostUsd,
      batteryType = "lithium",
      inverterType = "Hybrid String Inverter",
      criticalLoadKw,
    } = body;

    // Validate required fields
    if (projectId == null) {
      return NextResponse.json(
        { success: false, error: "Project ID is required" },
        { status: 400 }
      );
    }

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    const existingSystem = await prisma.system.findUnique({
      where: { projectId },
    });

    // Update or create system
    const systemData = {
      solarPanelCount: parseInt(solarPanelCount) || 0,
      solarPanelWattage: parseInt(solarPanelWattage) || 0,
      totalSolarKw: parseFloat(totalSolarKw) || 0,
      batteryKwh: parseFloat(batteryKwh) || 0,
      batteryType,
      inverterKw: parseFloat(inverterKw) || 0,
      inverterType,
      backupDurationHrs: parseInt(backupDurationHrs) || 0,
      criticalLoadKw:
        criticalLoadKw !== undefined
          ? parseFloat(criticalLoadKw) || 0
          : ((existingSystem?.criticalLoadKw ?? parseFloat(inverterKw)) || 0),
      estimatedCostUsd: parseFloat(estimatedCostUsd) || 0,
    };

    const system = await prisma.system.upsert({
      where: { projectId },
      create: {
        projectId,
        ...systemData,
      },
      update: systemData,
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { updatedAt: new Date() },
    });

    await refreshBomAndPlan(projectId, true);

    return NextResponse.json({
      success: true,
      system,
      message: "System updated successfully",
    });
  } catch (error) {
    console.error("Error updating system:", error);
    if (error instanceof SizingError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to update system" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Fetch both system and analysis data
    const [system, analysis] = await Promise.all([
      prisma.system.findUnique({
        where: { projectId },
      }),
      prisma.analysis.findUnique({
        where: { projectId },
      }),
    ]);

    // If no analysis exists, return error
    if (!analysis) {
      return NextResponse.json(
        { 
          success: false, 
          error: "No energy analysis found. Please upload and analyze bills first." 
        },
        { status: 404 }
      );
    }

    // If system exists, return both. Otherwise, return analysis for calculation
    return NextResponse.json({
      success: true,
      system: system || null,
      analysis: {
        monthlyUsageKwh: analysis.monthlyUsageKwh,
        peakDemandKw: analysis.peakDemandKw,
      },
    });
  } catch (error) {
    console.error("Error fetching system:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch system" },
      { status: 500 }
    );
  }
}
