import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { performOCR as performMicroserviceOCR } from "@/lib/ocr-microservice";
import { performOCR as performFallbackOCR } from "@/lib/ocr";
import { parseBillText, validateRenewableSource } from "@/lib/ocr";

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

    // Use /tmp directory for Vercel serverless compatibility
    // Note: /tmp is ephemeral and cleared after function execution
    // Files are only available during the current request
    const tmpDir = join("/tmp", "uploads", projectId);
    try {
      await mkdir(tmpDir, { recursive: true });
    } catch {
      // Directory might already exist, that's fine
    }

    // Generate unique filename
    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${timestamp}_${safeFileName}`;
    const filePath = join(tmpDir, fileName);

    // Store file path in database (used for immediate OCR processing)
    // Note: File will be deleted after serverless function completes
    const urlPath = `/tmp/uploads/${projectId}/${fileName}`;

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

    // Process OCR on the saved file
    let ocrText: string | null = null;
    let extractedData: string | null = null;
    let ocrConfidence = 0;

    console.log(`Processing OCR for ${fileName}...`);
    try {
      // Try microservice first, fall back to built-in OCR if unavailable
      let ocrResult;
      try {
        ocrResult = await performMicroserviceOCR(filePath, fileType);
        console.log("Used OCR microservice for extraction");
      } catch (microserviceError) {
        console.log("OCR microservice unavailable, using fallback OCR");
        ocrResult = await performFallbackOCR(filePath, fileType);
        console.log("Used fallback OCR for extraction");
      }
      ocrText = ocrResult.text;
      ocrConfidence = ocrResult.confidence || 0;

      // Only parse bill data if we have actual OCR text
      if (ocrText && ocrText.trim().length > 0) {
        const parsedData = parseBillText(ocrText);
        extractedData = JSON.stringify(parsedData);

        // Validate renewable source data if present
        if (parsedData.renewableSource) {
          const validation = validateRenewableSource(parsedData.renewableSource);

          if (!validation.isValid) {
            console.error("Renewable source validation errors:", validation.errors);
          }

          if (validation.warnings.length > 0) {
            console.warn("Renewable source validation warnings:", validation.warnings);
          }

          // Log validation results for monitoring
          console.log(
            `Renewable source validation: ${validation.isValid ? "PASS" : "FAIL"} ` +
            `(${validation.errors.length} errors, ${validation.warnings.length} warnings)`,
          );
        }

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
      
      // Check if it's an OCR service unavailable error
      if (ocrError instanceof Error && ocrError.message.includes("OCR microservice is not running")) {
        console.log("OCR service is not available - file will be saved without OCR processing");
      }
    }

    // Save to database with URL path for web access
    const bill = await prisma.bill.create({
      data: {
        projectId,
        fileName: file.name,
        fileType,
        filePath: urlPath, // Store URL path instead of filesystem path
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
