import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Get site survey data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
  ) {
  try {
    const { id } = await params;
    const plan = await prisma.plan.findUnique({
      where: { projectId: id },
      select: {
        siteSurvey: true,
        roofType: true,
        roofPitch: true,
        availableArea: true,
        shadingAnalysis: true,
        structuralNotes: true,
      },
    });

    if (!plan) {
      return NextResponse.json(
        { success: false, error: "Plan not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      siteSurvey: {
        ...(plan.siteSurvey ? JSON.parse(plan.siteSurvey) : {}),
        roofType: plan.roofType,
        roofPitch: plan.roofPitch,
        availableArea: plan.availableArea,
        shadingAnalysis: plan.shadingAnalysis
          ? JSON.parse(plan.shadingAnalysis)
          : null,
        structuralNotes: plan.structuralNotes,
      },
    });
  } catch (error) {
    console.error("Error fetching site survey:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch site survey",
      },
      { status: 500 }
    );
  }
}

// PATCH - Update site survey data
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const {
      siteSurvey,
      roofType,
      roofPitch,
      availableArea,
      shadingAnalysis,
      structuralNotes,
    } = body;

    const updateData: any = {};

    if (siteSurvey !== undefined)
      updateData.siteSurvey = JSON.stringify(siteSurvey);
    if (roofType !== undefined) updateData.roofType = roofType;
    if (roofPitch !== undefined) updateData.roofPitch = roofPitch;
    if (availableArea !== undefined) updateData.availableArea = availableArea;
    if (shadingAnalysis !== undefined)
      updateData.shadingAnalysis = JSON.stringify(shadingAnalysis);
    if (structuralNotes !== undefined)
      updateData.structuralNotes = structuralNotes;

    const plan = await prisma.plan.update({
      where: { projectId: id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      siteSurvey: {
        ...(plan.siteSurvey ? JSON.parse(plan.siteSurvey) : {}),
        roofType: plan.roofType,
        roofPitch: plan.roofPitch,
        availableArea: plan.availableArea,
        shadingAnalysis: plan.shadingAnalysis
          ? JSON.parse(plan.shadingAnalysis)
          : null,
        structuralNotes: plan.structuralNotes,
      },
    });
  } catch (error) {
    console.error("Error updating site survey:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update site survey",
      },
      { status: 500 }
    );
  }
}

