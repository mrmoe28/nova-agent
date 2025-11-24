import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { performMindeeOCR } from "@/lib/ocr-mindee";
import { performOCR as performMicroserviceOCR } from "@/lib/ocr-microservice";
import { performOCR as performFallbackOCR } from "@/lib/ocr";
import { parseBillText, validateRenewableSource } from "@/lib/ocr";
import { generateErrorMessage } from "@/lib/ocr-utils";

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
        {
          success: false,
          error: "Project ID and file are required",
          message: "Please provide both a project ID and a file to upload. Make sure you're uploading from within a project.",
        },
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
          error: "Invalid file type",
          message:
            `File type "${file.type}" is not supported. Please upload a PDF, image (JPG, PNG), or CSV file. Supported types: PDF, JPEG, PNG, CSV.`,
          supportedTypes: ["application/pdf", "image/jpeg", "image/png", "text/csv"],
        },
        { status: 400 },
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return NextResponse.json(
        {
          success: false,
          error: "File size exceeds limit",
          message: `File size (${sizeMB} MB) exceeds the maximum allowed size of 10 MB. Please compress or split the file and try again.`,
          maxSize: "10 MB",
          actualSize: `${sizeMB} MB`,
        },
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

    // Store file as base64 for persistent storage (files in /tmp are ephemeral)
    const fileDataBase64 = buffer.toString('base64');

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
      let parsedData: any;

      try {
        // Tier 1: Attempt Mindee OCR
        const mindeeResult = await performMindeeOCR(filePath, fileType);
        console.log("Used Mindee OCR for extraction");
        ocrText = mindeeResult.text;
        ocrConfidence = mindeeResult.confidence;
        // Use the structured data directly from Mindee
        parsedData = mindeeResult.data;
      } catch (mindeeError) {
        const mindeeErrorMessage = mindeeError instanceof Error ? mindeeError.message : String(mindeeError);
        console.warn("Mindee OCR failed, falling back.", mindeeErrorMessage);
        
        // If Mindee fails, proceed with the existing fallback logic
        let fallbackResult;
        try {
          // Tier 2: Attempt OCR Microservice
          fallbackResult = await performMicroserviceOCR(filePath, fileType);
          console.log("Used OCR microservice for extraction");
        } catch (microserviceError) {
          const microserviceErrorMessage = microserviceError instanceof Error ? microserviceError.message : String(microserviceError);
          // Tier 3: Attempt Fallback OCR
          console.warn("OCR microservice unavailable, using final fallback OCR", microserviceErrorMessage);
          try {
            fallbackResult = await performFallbackOCR(filePath, fileType);
            console.log("Used final fallback OCR for extraction");
          } catch (fallbackError) {
            // All OCR methods failed
            const errorMessage = generateErrorMessage(fallbackError, "OCR processing");
            console.error("All OCR methods failed:", errorMessage);
            throw new Error(`OCR processing failed: ${errorMessage}`);
          }
        }
        
        ocrText = fallbackResult.text;
        ocrConfidence = fallbackResult.confidence || 0;

        // Only parse bill data if we have actual OCR text from fallbacks
        if (ocrText && ocrText.trim().length > 0) {
          parsedData = parseBillText(ocrText);
        }
      }

      // If any OCR method produced data, stringify and validate it
      if (parsedData) {
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
        console.log("All OCR methods failed or returned empty text, no data to parse");
      }
    } catch (ocrError) {
      const errorMessage = generateErrorMessage(ocrError, "OCR processing");
      console.error("Overall OCR processing failed:", errorMessage);
      // Do not set fake data - leave ocrText and extractedData as null
      // File will still be saved but without OCR data
      console.log("File will be saved without OCR data due to processing failure");
      // Log the error but don't throw - allow file to be saved for manual review
    }

    // Save to database with URL path and file data for persistent storage
    const bill = await prisma.bill.create({
      data: {
        projectId,
        fileName: file.name,
        fileType,
        filePath: urlPath, // Store URL path for reference
        fileData: fileDataBase64, // Store base64-encoded file for persistent access
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
    const errorMessage = generateErrorMessage(error, "file upload");
    console.error("Error uploading file:", errorMessage);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to upload file",
        message: errorMessage,
        troubleshooting: [
          "Check that your file is a valid PDF, image, or CSV file",
          "Ensure the file size is under 10 MB",
          "Verify your internet connection is stable",
          "Try uploading again in a few moments",
        ],
      },
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
