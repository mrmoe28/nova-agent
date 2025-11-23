import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// GET - Get all documents for a plan
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
  ) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const type = searchParams.get("type");

    const where: any = { planId: id };
    if (category) where.category = category;
    if (type) where.type = type;

    const documents = await prisma.planDocument.findMany({
      where,
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      documents,
    });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch documents",
      },
      { status: 500 }
    );
  }
}

// POST - Upload a document
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string;
    const category = formData.get("category") as string;
    const uploadedBy = formData.get("uploadedBy") as string;

    if (!file || !type || !category) {
      return NextResponse.json(
        {
          success: false,
          error: "File, type, and category are required",
        },
        { status: 400 }
      );
    }

    // Verify plan exists
    const plan = await prisma.plan.findUnique({
      where: { projectId: id },
    });

    if (!plan) {
      return NextResponse.json(
        { success: false, error: "Plan not found" },
        { status: 404 }
      );
    }

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), "uploads", "plans", id);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const filePath = join(uploadDir, fileName);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Save document record
    const document = await prisma.planDocument.create({
      data: {
        planId: id,
        type,
        category,
        fileName: file.name,
        filePath: `/uploads/plans/${params.id}/${fileName}`,
        uploadedBy: uploadedBy || null,
      },
    });

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to upload document",
      },
      { status: 500 }
    );
  }
}

