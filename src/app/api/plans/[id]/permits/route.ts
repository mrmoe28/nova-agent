import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Get permit status and details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const plan = await prisma.plan.findUnique({
      where: { projectId: params.id },
      select: {
        permitStatus: true,
        permitNumber: true,
        permitSubmitDate: true,
        permitApprovalDate: true,
        permitDocuments: true,
        ahjName: true,
        ahjContact: true,
        permitNotes: true,
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
      permit: {
        ...plan,
        permitDocuments: plan.permitDocuments
          ? JSON.parse(plan.permitDocuments)
          : [],
      },
    });
  } catch (error) {
    console.error("Error fetching permit data:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch permit data",
      },
      { status: 500 }
    );
  }
}

// PATCH - Update permit status and details
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      permitStatus,
      permitNumber,
      permitSubmitDate,
      permitApprovalDate,
      permitDocuments,
      ahjName,
      ahjContact,
      permitNotes,
    } = body;

    const updateData: any = {};

    if (permitStatus !== undefined) updateData.permitStatus = permitStatus;
    if (permitNumber !== undefined) updateData.permitNumber = permitNumber;
    if (permitSubmitDate !== undefined)
      updateData.permitSubmitDate = new Date(permitSubmitDate);
    if (permitApprovalDate !== undefined)
      updateData.permitApprovalDate = new Date(permitApprovalDate);
    if (permitDocuments !== undefined)
      updateData.permitDocuments = JSON.stringify(permitDocuments);
    if (ahjName !== undefined) updateData.ahjName = ahjName;
    if (ahjContact !== undefined) updateData.ahjContact = ahjContact;
    if (permitNotes !== undefined) updateData.permitNotes = permitNotes;

    const plan = await prisma.plan.update({
      where: { projectId: params.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      plan: {
        ...plan,
        permitDocuments: plan.permitDocuments
          ? JSON.parse(plan.permitDocuments)
          : [],
      },
    });
  } catch (error) {
    console.error("Error updating permit data:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update permit data",
      },
      { status: 500 }
    );
  }
}

// POST - Submit permit application
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { ahjName, ahjContact, permitDocuments } = body;

    const plan = await prisma.plan.update({
      where: { projectId: params.id },
      data: {
        permitStatus: "submitted",
        permitSubmitDate: new Date(),
        ahjName: ahjName || undefined,
        ahjContact: ahjContact || undefined,
        permitDocuments: permitDocuments
          ? JSON.stringify(permitDocuments)
          : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Permit application submitted",
      plan: {
        ...plan,
        permitDocuments: plan.permitDocuments
          ? JSON.parse(plan.permitDocuments)
          : [],
      },
    });
  } catch (error) {
    console.error("Error submitting permit:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to submit permit application",
      },
      { status: 500 }
    );
  }
}

