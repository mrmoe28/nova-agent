import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { EquipmentCategory } from "@prisma/client";

/**
 * GET /api/equipment - List equipment with filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const distributorId = searchParams.get("distributorId");
    const category = searchParams.get("category");

    const where: {
      distributorId?: string;
      category?: EquipmentCategory;
      isActive?: boolean;
    } = {};

    if (distributorId) where.distributorId = distributorId;
    if (category) where.category = category as EquipmentCategory;
    where.isActive = true;

    const equipment = await prisma.equipment.findMany({
      where,
      include: {
        distributor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, equipment });
  } catch (error) {
    console.error("Error fetching equipment:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch equipment" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/equipment - Create new equipment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      distributorId,
      category,
      name,
      manufacturer,
      modelNumber,
      description,
      specifications,
      unitPrice,
      imageUrl,
      dataSheetUrl,
      inStock,
      leadTimeDays,
    } = body;

    if (
      !distributorId ||
      !category ||
      !name ||
      !modelNumber ||
      unitPrice == null
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Required fields: distributorId, category, name, modelNumber, unitPrice",
        },
        { status: 400 },
      );
    }

    const equipment = await prisma.equipment.create({
      data: {
        distributorId,
        category,
        name,
        manufacturer,
        modelNumber,
        description,
        specifications: specifications ? JSON.stringify(specifications) : null,
        unitPrice: parseFloat(unitPrice),
        imageUrl,
        dataSheetUrl,
        inStock: inStock !== undefined ? inStock : true,
        leadTimeDays: leadTimeDays ? parseInt(leadTimeDays) : null,
      },
      include: {
        distributor: true,
      },
    });

    return NextResponse.json({ success: true, equipment });
  } catch (error) {
    console.error("Error creating equipment:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create equipment" },
      { status: 500 },
    );
  }
}
