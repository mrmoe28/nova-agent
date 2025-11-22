import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { prisma } from "@/lib/prisma";

/**
 * Serve uploaded bill files
 * This endpoint serves files from the database storage
 * 
 * URL: /api/files/bills/[billId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;

    // Expect format: /api/files/bills/[billId]
    if (path[0] !== "bills" || !path[1]) {
      return NextResponse.json(
        { success: false, error: "Invalid file path" },
        { status: 400 }
      );
    }

    const billId = path[1];

    // Get bill from database
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        filePath: true,
        projectId: true,
      },
    });

    if (!bill) {
      return NextResponse.json(
        { success: false, error: "Bill not found" },
        { status: 404 }
      );
    }

    // Check if file exists
    try {
      const fileBuffer = await readFile(bill.filePath);

      // Determine content type
      let contentType = "application/octet-stream";
      if (bill.fileType === "pdf") {
        contentType = "application/pdf";
      } else if (bill.fileType === "image") {
        if (bill.fileName.toLowerCase().endsWith(".png")) {
          contentType = "image/png";
        } else if (bill.fileName.toLowerCase().endsWith(".jpg") || bill.fileName.toLowerCase().endsWith(".jpeg")) {
          contentType = "image/jpeg";
        }
      } else if (bill.fileType === "csv") {
        contentType = "text/csv";
      }

      // Return file with appropriate headers (convert Buffer to Uint8Array)
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
      
      // File was deleted or /tmp was cleared (common on Vercel)
      return NextResponse.json(
        {
          success: false,
          error: "File no longer available. Files in /tmp are ephemeral on serverless platforms.",
          suggestion: "Please re-upload the bill file.",
        },
        { status: 410 } // 410 Gone
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
