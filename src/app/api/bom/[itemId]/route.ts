import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/bom/[itemId] - Delete a specific BOM item
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;

    await prisma.bOMItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting BOM item:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete BOM item" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/bom/[itemId] - Update a specific BOM item
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const body = await request.json();
    const { quantity, unitPriceUsd } = body;

    if (!quantity || !unitPriceUsd) {
      return NextResponse.json(
        { success: false, error: "Quantity and unit price are required" },
        { status: 400 }
      );
    }

    const updatedItem = await prisma.bOMItem.update({
      where: { id: itemId },
      data: {
        quantity: parseInt(quantity),
        unitPriceUsd: parseFloat(unitPriceUsd),
        totalPriceUsd: parseInt(quantity) * parseFloat(unitPriceUsd),
      },
    });

    return NextResponse.json({ success: true, item: updatedItem });
  } catch (error) {
    console.error("Error updating BOM item:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update BOM item" },
      { status: 500 }
    );
  }
}
