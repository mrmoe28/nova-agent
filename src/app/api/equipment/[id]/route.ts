import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/equipment/[id] - Get single equipment item
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: {
        distributor: true,
      },
    });

    if (!equipment) {
      return NextResponse.json(
        { success: false, error: "Equipment not found" },
        { status: 404 },
      );
    }

    // Parse specifications if present
    const equipmentData = {
      ...equipment,
      specifications: equipment.specifications
        ? JSON.parse(equipment.specifications)
        : null,
    };

    return NextResponse.json({ success: true, equipment: equipmentData });
  } catch (error) {
    console.error("Error fetching equipment:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch equipment" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/equipment/[id] - Update equipment
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Convert specifications to JSON string if present
    if (body.specifications && typeof body.specifications !== "string") {
      body.specifications = JSON.stringify(body.specifications);
    }

    // Convert numeric fields
    if (body.unitPrice) body.unitPrice = parseFloat(body.unitPrice);
    if (body.leadTimeDays) body.leadTimeDays = parseInt(body.leadTimeDays);

    const equipment = await prisma.equipment.update({
      where: { id },
      data: body,
      include: {
        distributor: true,
      },
    });

    return NextResponse.json({ success: true, equipment });
  } catch (error) {
    console.error("Error updating equipment:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update equipment" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/equipment/[id] - Delete equipment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    await prisma.equipment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting equipment:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete equipment" },
      { status: 500 },
    );
  }
}
