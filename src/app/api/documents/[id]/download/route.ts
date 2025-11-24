import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import path from "path";

/**
 * GET /api/documents/[id]/download
 * Download or view a document
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const download = searchParams.get("download") === "true";

    const document = await prisma.planDocument.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      );
    }

    // Read file from disk
    const filePath = path.join(process.cwd(), "public", document.filePath);
    
    try {
      const fileBuffer = await readFile(filePath);

      const headers = new Headers();
      headers.set("Content-Type", "application/pdf");
      
      if (download) {
        headers.set(
          "Content-Disposition",
          `attachment; filename="${encodeURIComponent(document.title)}"`
        );
      } else {
        headers.set(
          "Content-Disposition",
          `inline; filename="${encodeURIComponent(document.title)}"`
        );
      }

      return new NextResponse(fileBuffer, {
        status: 200,
        headers,
      });
    } catch (error) {
      console.error("Error reading file:", error);
      return NextResponse.json(
        { success: false, error: "File not found on server" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error in download route:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to download document",
      },
      { status: 500 }
    );
  }
}

