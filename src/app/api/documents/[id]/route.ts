import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import path from "path";

/**
 * DELETE /api/documents/[id]
 * Delete a document
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const document = await prisma.planDocument.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      );
    }

    // Delete file from disk
    const filePath = path.join(process.cwd(), "public", document.filePath);
    try {
      await unlink(filePath);
    } catch (error) {
      console.warn("File not found on disk, continuing with database deletion");
    }

    // Delete from database
    await prisma.planDocument.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete document",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/documents/[id]
 * Update document metadata (type, category)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { type, category } = body;

    // Only update fields that exist in PlanDocument schema
    const updateData: any = {};
    if (type !== undefined) updateData.type = type;
    if (category !== undefined) updateData.category = category;

    const document = await prisma.planDocument.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error("Error updating document:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update document",
      },
      { status: 500 }
    );
  }
}

