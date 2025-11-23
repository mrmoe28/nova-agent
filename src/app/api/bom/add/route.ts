import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateBOMSubtotals } from "@/lib/bom-calculations";

/**
 * POST /api/bom/add - Add equipment to project BOM
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, equipmentId, quantity = 1 } = body;

    if (!projectId || !equipmentId) {
      return NextResponse.json(
        { success: false, error: "Project ID and Equipment ID are required" },
        { status: 400 }
      );
    }

    // Fetch equipment details
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      include: {
        distributor: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!equipment) {
      return NextResponse.json(
        { success: false, error: "Equipment not found" },
        { status: 404 }
      );
    }

    // Check if this equipment is already in the BOM
    const existingBOMItem = await prisma.bOMItem.findFirst({
      where: {
        projectId,
        modelNumber: equipment.modelNumber,
        manufacturer: equipment.manufacturer,
      },
    });

    if (existingBOMItem) {
      // Update quantity if item already exists
      const updatedItem = await prisma.bOMItem.update({
        where: { id: existingBOMItem.id },
        data: {
          quantity: existingBOMItem.quantity + quantity,
          totalPriceUsd: (existingBOMItem.quantity + quantity) * existingBOMItem.unitPriceUsd,
        },
      });

      // Validate subtotal after update
      const expectedTotal = updatedItem.quantity * updatedItem.unitPriceUsd;
      if (Math.abs(updatedItem.totalPriceUsd - expectedTotal) > 0.01) {
        // Auto-correct if mismatch
        const correctedItem = await prisma.bOMItem.update({
          where: { id: updatedItem.id },
          data: { totalPriceUsd: expectedTotal },
        });
        return NextResponse.json({ success: true, bomItem: correctedItem, action: 'updated', corrected: true });
      }

      return NextResponse.json({ success: true, bomItem: updatedItem, action: 'updated' });
    } else {
      // Create new BOM item
      const totalPriceUsd = quantity * equipment.unitPrice;
      
      const newBOMItem = await prisma.bOMItem.create({
        data: {
          projectId,
          category: equipment.category,
          itemName: equipment.name,
          manufacturer: equipment.manufacturer || "",
          modelNumber: equipment.modelNumber,
          quantity,
          unitPriceUsd: equipment.unitPrice,
          totalPriceUsd: totalPriceUsd, // Ensure correct calculation
          sourceUrl: equipment.sourceUrl || "",
          imageUrl: equipment.imageUrl || null,
          notes: `Added from ${equipment.distributor.name}${equipment.specifications ? ` | Specs: ${equipment.specifications}` : ''}`,
        },
      });

      return NextResponse.json({ success: true, bomItem: newBOMItem, action: 'created' });
    }
  } catch (error) {
    console.error("Error adding BOM item:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add BOM item" },
      { status: 500 }
    );
  }
}
