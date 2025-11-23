import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Get a specific inspection
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; inspectionId: string }> }
  ) {
  try {
    const { id, inspectionId } = await params;
    const inspection = await prisma.planInspection.findUnique({
      where: { id: inspectionId },
    });

    if (!inspection || inspection.planId !== id) {
      return NextResponse.json(
        { success: false, error: "Inspection not found" },
        { status: 404 }
      );
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
    console.error("Error fetching inspection:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch inspection",
      },
      { status: 500 }
    );
  }
}

// PATCH - Update an inspection
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; inspectionId: string }> }
) {
  try {
    const { id, inspectionId } = await params;
    const body = await request.json();
    const {
      type,
      scheduledDate,
      actualDate,
      inspector,
      status,
      notes,
      findings,
      photos,
    } = body;

    // Verify inspection belongs to plan
    const existingInspection = await prisma.planInspection.findUnique({
      where: { id: inspectionId },
    });

    if (!existingInspection || existingInspection.planId !== id) {
      return NextResponse.json(
        { success: false, error: "Inspection not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (type !== undefined) updateData.type = type;
    if (scheduledDate !== undefined)
      updateData.scheduledDate = scheduledDate ? new Date(scheduledDate) : null;
    if (actualDate !== undefined)
      updateData.actualDate = actualDate ? new Date(actualDate) : null;
    if (inspector !== undefined) updateData.inspector = inspector;
    if (status !== undefined) {
      updateData.status = status;
      // Auto-set actual date if status is passed/failed and no actual date set
      if (
        (status === "passed" || status === "failed") &&
        !existingInspection.actualDate &&
        !actualDate
      ) {
        updateData.actualDate = new Date();
      }
    }
    if (notes !== undefined) updateData.notes = notes;
    if (findings !== undefined) updateData.findings = JSON.stringify(findings);
    if (photos !== undefined) updateData.photos = JSON.stringify(photos);

    const inspection = await prisma.planInspection.update({
      where: { id: inspectionId },
      data: updateData,
    });

    // Update plan inspection status based on all inspections
    const allInspections = await prisma.planInspection.findMany({
      where: { planId: id },
    });

    const hasFailed = allInspections.some((i) => i.status === "failed");
    const allPassed = allInspections.every(
      (i) => i.status === "passed" || i.status === "scheduled"
    );
    const hasScheduled = allInspections.some((i) => i.status === "scheduled");

    let planInspectionStatus = "pending";
    if (hasFailed) planInspectionStatus = "failed";
    else if (allPassed && !hasScheduled) planInspectionStatus = "passed";
    else if (hasScheduled) planInspectionStatus = "scheduled";

    await prisma.plan.update({
      where: { projectId: id },
      data: { inspectionStatus: planInspectionStatus },
    });

    return NextResponse.json({
      success: true,
      inspection: {
        ...inspection,
        findings: inspection.findings ? JSON.parse(inspection.findings) : [],
        photos: inspection.photos ? JSON.parse(inspection.photos) : [],
      },
    });
  } catch (error) {
    console.error("Error updating inspection:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update inspection",
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete an inspection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; inspectionId: string }> }
) {
  try {
    const { id, inspectionId } = await params;
    // Verify inspection belongs to plan
    const existingInspection = await prisma.planInspection.findUnique({
      where: { id: inspectionId },
    });

    if (!existingInspection || existingInspection.planId !== id) {
      return NextResponse.json(
        { success: false, error: "Inspection not found" },
        { status: 404 }
      );
    }

    await prisma.planInspection.delete({
      where: { id: inspectionId },
    });

    return NextResponse.json({
      success: true,
      message: "Inspection deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting inspection:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete inspection",
      },
      { status: 500 }
    );
  }
}

