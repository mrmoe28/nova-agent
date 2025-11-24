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

    // Get the item first to check if it's a solar panel
    const existingItem = await prisma.bOMItem.findUnique({
      where: { id: itemId },
      include: { project: true },
    });

    if (!existingItem) {
      return NextResponse.json(
        { success: false, error: "BOM item not found" },
        { status: 404 }
      );
    }

    let finalQuantity = parseInt(quantity);
    const isSolarPanel = existingItem.category === "solar";

    // Enforce 10kW limit for solar panels
    if (isSolarPanel) {
      const MAX_ROOF_CAPACITY_KW = 10;
      
      // Get actual panel wattage from system record
      const system = await prisma.system.findUnique({
        where: { projectId: existingItem.projectId },
      });
      
      const actualPanelWattage = system?.solarPanelWattage || 400;
      const maxPanels = Math.floor((MAX_ROOF_CAPACITY_KW * 1000) / actualPanelWattage);
      
      if (finalQuantity > maxPanels) {
        finalQuantity = maxPanels;
        // Return a warning that the quantity was adjusted
        const updatedItem = await prisma.bOMItem.update({
          where: { id: itemId },
          data: {
            quantity: finalQuantity,
            unitPriceUsd: parseFloat(unitPriceUsd),
            totalPriceUsd: finalQuantity * parseFloat(unitPriceUsd),
          },
        });

        // Update system record with adjusted panel count
        if (system) {
          const newTotalKw = (finalQuantity * actualPanelWattage) / 1000;
          await prisma.system.update({
            where: { projectId: existingItem.projectId },
            data: {
              solarPanelCount: finalQuantity,
              totalSolarKw: newTotalKw,
            },
          });
        }

        return NextResponse.json({
          success: true,
          item: updatedItem,
          warning: `Panel count adjusted to ${finalQuantity} to comply with 10kW roof capacity limit (${maxPanels} panels max for ${actualPanelWattage}W panels)`,
        });
      }

      // Update system record with new panel count
      if (system) {
        const newTotalKw = (finalQuantity * actualPanelWattage) / 1000;
        await prisma.system.update({
          where: { projectId: existingItem.projectId },
          data: {
            solarPanelCount: finalQuantity,
            totalSolarKw: newTotalKw,
          },
        });
      }
    }

    const updatedItem = await prisma.bOMItem.update({
      where: { id: itemId },
      data: {
        quantity: finalQuantity,
        unitPriceUsd: parseFloat(unitPriceUsd),
        totalPriceUsd: finalQuantity * parseFloat(unitPriceUsd),
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
