import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Get all inspections for a plan
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
  ) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    const where: any = { planId: id };
    if (type) where.type = type;
    if (status) where.status = status;

    const inspections = await prisma.planInspection.findMany({
      where,
      orderBy: { scheduledDate: "asc" },
    });

    // Parse JSON fields
    const inspectionsWithParsed = inspections.map((inspection) => ({
      ...inspection,
      findings: inspection.findings ? JSON.parse(inspection.findings) : [],
      photos: inspection.photos ? JSON.parse(inspection.photos) : [],
    }));

    return NextResponse.json({
      success: true,
      inspections: inspectionsWithParsed,
    });
  } catch (error) {
    console.error("Error fetching inspections:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch inspections",
      },
      { status: 500 }
    );
  }
}

// POST - Create a new inspection
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const {
      type,
      scheduledDate,
      inspector,
      notes,
      findings = [],
      photos = [],
    } = body;

    if (!type) {
      return NextResponse.json(
        { success: false, error: "Inspection type is required" },
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

    const inspection = await prisma.planInspection.create({
      data: {
        planId: id,
        type,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        inspector: inspector || null,
        status: scheduledDate ? "scheduled" : "pending",
        notes: notes || null,
        findings: JSON.stringify(findings),
        photos: JSON.stringify(photos),
      },
    });

    // Update plan inspection status if this is the first inspection
    if (!plan.inspections) {
      await prisma.plan.update({
        where: { projectId: id },
        data: { inspectionStatus: "pending" },
      });
    }

    return NextResponse.json({
      success: true,
      inspection: {
        ...inspection,
        findings: inspection.findings ? JSON.parse(inspection.findings) : [],
        photos: inspection.photos ? JSON.parse(inspection.photos) : [],
      },
    });
  } catch (error) {
    console.error("Error creating inspection:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create inspection",
      },
      { status: 500 }
    );
  }
}

