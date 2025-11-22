import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Bill ID is required" },
        { status: 400 },
      );
    }

    const bill = await prisma.bill.findUnique({
      where: { id },
    });

    if (!bill) {
      return NextResponse.json(
        { success: false, error: "Bill not found" },
        { status: 404 },
      );
    }

    await prisma.bill.delete({
      where: { id },
    });

    if (bill.filePath) {
      unlink(bill.filePath).catch(() => {
        // Ignore missing file cleanup errors since /tmp may have been cleared
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting bill:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete bill" },
      { status: 500 },
    );
  }
}
