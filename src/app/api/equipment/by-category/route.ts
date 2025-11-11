import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Get equipment by category and distributor
 * URL: /api/equipment/by-category?distributorId=X&category=INVERTER
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const distributorId = searchParams.get("distributorId");
    const category = searchParams.get("category");

    if (!distributorId || !category) {
      return NextResponse.json(
        { success: false, error: "distributorId and category are required" },
        { status: 400 }
      );
    }

    const equipment = await prisma.equipment.findMany({
      where: {
        distributorId,
        category: category as
          | "SOLAR_PANEL"
          | "BATTERY"
          | "INVERTER"
          | "CHARGE_CONTROLLER"
          | "MOUNTING"
          | "WIRING"
          | "ELECTRICAL"
          | "MONITORING"
          | "ACCESSORIES"
          | "OTHER",
        isActive: true,
        inStock: true,
      },
      select: {
        id: true,
        name: true,
        manufacturer: true,
        modelNumber: true,
        unitPrice: true,
        specifications: true,
        imageUrl: true,
      },
      orderBy: {
        unitPrice: "asc", // Cheapest first
      },
    });

    return NextResponse.json({
      success: true,
      equipment,
    });
  } catch (error) {
    console.error("Error fetching equipment:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch equipment" },
      { status: 500 }
    );
  }
}
