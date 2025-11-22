import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        bills: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
            ocrText: true,
            extractedData: true,
            uploadedAt: true,
          },
        },
        analysis: true,
        system: true,
        bomItems: {
          orderBy: { category: "asc" },
        },
        plan: true,
        _count: {
          select: { bills: true, bomItems: true },
        },
      },
    });

    return NextResponse.json({ success: true, projects });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch projects" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientName, address, phone, email } = body;

    if (!clientName) {
      return NextResponse.json(
        { success: false, error: "Client name is required" },
        { status: 400 },
      );
    }

    const project = await prisma.project.create({
      data: {
        clientName,
        address,
        phone,
        email,
        status: "intake",
      },
    });

    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create project" },
      { status: 500 },
    );
  }
}
