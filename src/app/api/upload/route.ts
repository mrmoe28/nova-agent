import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { performOCR, parseBillText } from "@/lib/ocr";

// Required for file uploads in Next.js 15
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const projectId = formData.get("projectId") as string;
    const file = formData.get("file") as File;

    if (!projectId || !file) {
      return NextResponse.json(
        { success: false, error: "Project ID and file are required" },
        { status: 400 },
      );
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
      "text/csv",
      "application/vnd.ms-excel",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid file type. Only PDF, images (JPG, PNG), and CSV are allowed.",
        },
        { status: 400 },
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: "File size must be less than 10MB" },
        { status: 400 },
      );
    }

    // Use /tmp directory for serverless environment (Vercel)
    // Note: Files in /tmp are ephemeral and will be deleted after function execution
    const uploadsDir = join("/tmp", "uploads", projectId);
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch {
      // Directory might already exist, that's fine
    }

    // Generate unique filename
    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${timestamp}_${safeFileName}`;
    const filePath = join(uploadsDir, fileName);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    console.log(`File saved to: ${filePath} (${buffer.length} bytes)`);

    // Determine file type category
    let fileType: "pdf" | "image" | "csv" = "pdf";
    if (file.type.startsWith("image/")) {
      fileType = "image";
    } else if (file.type.includes("csv") || file.type.includes("excel")) {
      fileType = "csv";
    }

    // Process OCR immediately while file is in /tmp
    let ocrText: string | null = null;
    let extractedData: string | null = null;
    let ocrConfidence = 0;

    console.log(`Processing OCR for ${fileName}...`);
    try {
      const ocrResult = await performOCR(filePath, fileType);
      ocrText = ocrResult.text;
      ocrConfidence = ocrResult.confidence || 0;

      // Only parse bill data if we have actual OCR text
      if (ocrText && ocrText.trim().length > 0) {
        const parsedData = parseBillText(ocrText);
        extractedData = JSON.stringify(parsedData);
        
        console.log(
          `OCR completed with ${ocrConfidence} confidence, extracted ${Object.keys(parsedData).length} fields`,
        );
      } else {
        console.log("OCR returned empty text, no data to parse");
      }
    } catch (ocrError) {
      console.error("OCR processing failed:", ocrError);
      // Do not set fake data - leave ocrText and extractedData as null
      // File will still be saved but without OCR data
      console.log("File will be saved without OCR data due to processing failure");
    }

    // Save to database with OCR data
    const bill = await prisma.bill.create({
      data: {
        projectId,
        fileName: file.name,
        fileType,
        filePath: filePath,
        ocrText,
        extractedData,
      },
    });

    console.log(`Bill record created: ${bill.id}`);

    return NextResponse.json({
      success: true,
      bill: {
        id: bill.id,
        fileName: bill.fileName,
        fileType: bill.fileType,
        uploadedAt: bill.uploadedAt,
        ocrProcessed: !!ocrText,
        extractedData: extractedData ? JSON.parse(extractedData) : null,
      },
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload file" },
      { status: 500 },
    );
  }
}

// Get uploaded bills for a project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "Project ID is required" },
        { status: 400 },
      );
    }

    const bills = await prisma.bill.findMany({
      where: { projectId },
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json({ success: true, bills });
  } catch (error) {
    console.error("Error fetching bills:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch bills" },
      { status: 500 },
    );
  }
}
