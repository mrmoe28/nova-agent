import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, forceRegenerate = false } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "Project ID is required" },
        { status: 400 },
      );
    }

    // Get system design
    const system = await prisma.system.findUnique({
      where: { projectId },
    });

    if (!system) {
      return NextResponse.json(
        { success: false, error: "System sizing must be completed first" },
        { status: 400 },
      );
    }

    // Check for existing BOM items
    const existingItems = await prisma.bOMItem.findMany({
      where: { projectId },
    });

    // If items exist and not forcing regeneration, return existing items
    if (existingItems.length > 0 && !forceRegenerate) {
      const totalCost = existingItems.reduce((sum, item) => sum + item.totalPriceUsd, 0);
      return NextResponse.json({
        success: true,
        bomItems: existingItems,
        totalCost,
        message: "Using existing BOM items. Use forceRegenerate=true to recreate.",
      });
    }

    // Clear existing BOM items only if regenerating
    if (existingItems.length > 0) {
      await prisma.bOMItem.deleteMany({
        where: { projectId },
      });
    }

    // Generate BOM items based on system design
    const bomItems = [
      {
        projectId,
        category: "solar" as const,
        itemName: "Solar Panel - Monocrystalline",
        manufacturer: "SolarTech",
        modelNumber: "ST-400W",
        quantity: system.solarPanelCount,
        unitPriceUsd: 200,
        totalPriceUsd: system.solarPanelCount * 200,
        notes: "400W high-efficiency panels",
      },
      {
        projectId,
        category: "battery" as const,
        itemName: "Lithium Battery Storage System",
        manufacturer: "PowerStore",
        modelNumber: `PS-${Math.ceil(system.batteryKwh)}kWh`,
        quantity: 1,
        unitPriceUsd: system.batteryKwh * 800,
        totalPriceUsd: system.batteryKwh * 800,
        notes: `${system.batteryKwh.toFixed(1)}kWh capacity`,
      },
      {
        projectId,
        category: "inverter" as const,
        itemName: "Hybrid String Inverter",
        manufacturer: "InverterPro",
        modelNumber: `IP-${Math.ceil(system.inverterKw)}K`,
        quantity: 1,
        unitPriceUsd: system.inverterKw * 1200,
        totalPriceUsd: system.inverterKw * 1200,
        notes: `${system.inverterKw.toFixed(1)}kW capacity`,
      },
      {
        projectId,
        category: "mounting" as const,
        itemName: "Roof Mounting Rails & Hardware",
        manufacturer: "MountTech",
        modelNumber: "MT-RAIL-KIT",
        quantity: Math.ceil(system.solarPanelCount / 4),
        unitPriceUsd: 300,
        totalPriceUsd: Math.ceil(system.solarPanelCount / 4) * 300,
        notes: "Aluminum rails with stainless hardware",
      },
      {
        projectId,
        category: "electrical" as const,
        itemName: "Basic Electrical Components",
        manufacturer: "Various",
        modelNumber: "BASIC-ELEC",
        quantity: 1,
        unitPriceUsd: 500,
        totalPriceUsd: 500,
        notes: "Basic wiring and safety equipment only",
      },
    ];

    // Create BOM items
    await prisma.bOMItem.createMany({
      data: bomItems,
    });

    // Fetch created items to return
    const allBomItems = await prisma.bOMItem.findMany({
      where: { projectId },
    });

    // Update project status
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "bom" },
    });

    return NextResponse.json({
      success: true,
      bomItems: allBomItems,
      totalCost: allBomItems.reduce((sum, item) => sum + item.totalPriceUsd, 0),
    });
  } catch (error) {
    console.error("Error generating BOM:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate BOM" },
      { status: 500 },
    );
  }
}
