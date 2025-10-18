import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
      criticalLoadKw: parseFloat(inverterKw) || 0, // Default critical load to inverter capacity
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

    // Update project status if needed
    await prisma.project.update({
      where: { id: projectId },
      data: { 
        status: "sizing",
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      system,
      message: "System updated successfully",
    });
  } catch (error) {
    console.error("Error updating system:", error);
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

    const system = await prisma.system.findUnique({
      where: { projectId },
    });

    if (!system) {
      return NextResponse.json(
        { success: false, error: "System not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      system,
    });
  } catch (error) {
    console.error("Error fetching system:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch system" },
      { status: 500 }
    );
  }
}
