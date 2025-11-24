import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const projectId = formData.get("projectId") as string;
    const documentType = formData.get("documentType") as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "Project ID is required" },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { success: false, error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    // Validate file size (25MB max)
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: "File size must be less than 25MB" },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "plansets");
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      console.log("Directory already exists or created");
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-z0-9.-]/gi, "_");
    const fileName = `${projectId}_${timestamp}_${sanitizedFileName}`;
    const filePath = path.join(uploadsDir, fileName);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Save document metadata to database
    const document = await prisma.planDocument.create({
      data: {
        planId: projectId, // Assuming planId matches projectId for now
        fileName: file.name,
        type: documentType || "planset",
        category: "permit", // Default category for plansets
        filePath: `/uploads/plansets/${fileName}`,
        uploadedBy: "System", // TODO: Replace with actual user
      },
    });

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: document.uploadedAt,
      },
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to upload document",
      },
      { status: 500 }
    );
  }
}

