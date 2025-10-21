import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { prisma } from "@/lib/prisma";

/**
 * Serve uploaded bill files
 * URL: /api/bills/[id]/file
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: billId } = await params;

    // Get bill from database
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        filePath: true,
      },
    });

    if (!bill) {
      return NextResponse.json(
        { success: false, error: "Bill not found" },
        { status: 404 }
      );
    }

    // Try to read file
    try {
      const fileBuffer = await readFile(bill.filePath);

      // Determine content type
      let contentType = "application/octet-stream";
      if (bill.fileType === "pdf") {
        contentType = "application/pdf";
      } else if (bill.fileType === "image") {
        const lower = bill.fileName.toLowerCase();
        if (lower.endsWith(".png")) {
          contentType = "image/png";
        } else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
          contentType = "image/jpeg";
        }
      } else if (bill.fileType === "csv") {
        contentType = "text/csv";
      }

      // Return file (convert Buffer to Uint8Array for NextResponse)
      return new NextResponse(new Uint8Array(fileBuffer), {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="${bill.fileName}"`,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch (fileError) {
      console.error(`File not found at ${bill.filePath}:`, fileError);
      
      // File was deleted or /tmp was cleared
      return NextResponse.json(
        {
          success: false,
          error: "File no longer available. Files in /tmp are ephemeral on serverless platforms.",
          suggestion: "Please re-upload the bill file.",
        },
        { status: 410 }
      );
    }
  } catch (error) {
    console.error("Error serving file:", error);
    return NextResponse.json(
      { success: false, error: "Failed to serve file" },
      { status: 500 }
    );
  }
}
