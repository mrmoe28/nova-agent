import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Update a BOM item with selected equipment
 * URL: /api/bom/[itemId]/update-equipment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId: bomItemId } = await params;
    const { equipmentId } = await request.json();

    if (!equipmentId) {
      return NextResponse.json(
        { success: false, error: "Equipment ID is required" },
        { status: 400 }
      );
    }

    // Fetch the selected equipment
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      select: {
        name: true,
        manufacturer: true,
        modelNumber: true,
        unitPrice: true,
        specifications: true,
        imageUrl: true,
      },
    });

    if (!equipment) {
      return NextResponse.json(
        { success: false, error: "Equipment not found" },
        { status: 404 }
      );
    }

    // Get the current BOM item to preserve quantity
    const bomItem = await prisma.bOMItem.findUnique({
      where: { id: bomItemId },
      select: { quantity: true },
    });

    if (!bomItem) {
      return NextResponse.json(
        { success: false, error: "BOM item not found" },
        { status: 404 }
      );
    }

    // Update BOM item with selected equipment
    const updatedItem = await prisma.bOMItem.update({
      where: { id: bomItemId },
      data: {
        itemName: equipment.name,
        manufacturer: equipment.manufacturer,
        modelNumber: equipment.modelNumber,
        unitPriceUsd: equipment.unitPrice,
        totalPriceUsd: equipment.unitPrice * bomItem.quantity,
        imageUrl: equipment.imageUrl || null,
        notes: equipment.specifications || null,
      },
    });

    return NextResponse.json({
      success: true,
      bomItem: updatedItem,
    });
  } catch (error) {
    console.error("Error updating BOM item:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update BOM item" },
      { status: 500 }
    );
  }
}
