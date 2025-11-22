import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/distributors/[id] - Get single distributor with equipment
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const distributor = await prisma.distributor.findUnique({
      where: { id },
      include: {
        equipment: {
          where: {
            isActive: true,
          },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!distributor) {
      return NextResponse.json(
        { success: false, error: "Distributor not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, distributor });
  } catch (error) {
    console.error("Error fetching distributor:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch distributor" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/distributors/[id] - Update distributor
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const distributor = await prisma.distributor.update({
      where: { id },
      data: body,
    });

    return NextResponse.json({ success: true, distributor });
  } catch (error) {
    console.error("Error updating distributor:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update distributor" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/distributors/[id] - Delete distributor
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    await prisma.distributor.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting distributor:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete distributor" },
      { status: 500 },
    );
  }
}
