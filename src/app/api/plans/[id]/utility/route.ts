import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Get utility interconnection status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
  ) {
  try {
    const { id } = await params;
    const plan = await prisma.plan.findUnique({
      where: { projectId: id },
      select: {
        utilityStatus: true,
        utilityName: true,
        utilityAccount: true,
        interconnectionLimit: true,
        applicationDate: true,
        approvalDate: true,
        ptoDate: true,
        netMeteringType: true,
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
      utility: plan,
    });
  } catch (error) {
    console.error("Error fetching utility data:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch utility data",
      },
      { status: 500 }
    );
  }
}

// PATCH - Update utility interconnection status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
  ) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      utilityStatus,
      utilityName,
      utilityAccount,
      interconnectionLimit,
      applicationDate,
      approvalDate,
      ptoDate,
      netMeteringType,
    } = body;

    const updateData: any = {};

    if (utilityStatus !== undefined) updateData.utilityStatus = utilityStatus;
    if (utilityName !== undefined) updateData.utilityName = utilityName;
    if (utilityAccount !== undefined)
      updateData.utilityAccount = utilityAccount;
    if (interconnectionLimit !== undefined)
      updateData.interconnectionLimit = interconnectionLimit;
    if (applicationDate !== undefined)
      updateData.applicationDate = new Date(applicationDate);
    if (approvalDate !== undefined)
      updateData.approvalDate = new Date(approvalDate);
    if (ptoDate !== undefined) updateData.ptoDate = new Date(ptoDate);
    if (netMeteringType !== undefined)
      updateData.netMeteringType = netMeteringType;

    const plan = await prisma.plan.update({
      where: { projectId: id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      utility: {
        utilityStatus: plan.utilityStatus,
        utilityName: plan.utilityName,
        utilityAccount: plan.utilityAccount,
        interconnectionLimit: plan.interconnectionLimit,
        applicationDate: plan.applicationDate,
        approvalDate: plan.approvalDate,
        ptoDate: plan.ptoDate,
        netMeteringType: plan.netMeteringType,
      },
    });
  } catch (error) {
    console.error("Error updating utility data:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update utility data",
      },
      { status: 500 }
    );
  }
}

// POST - Submit utility interconnection application
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
  ) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { utilityName, utilityAccount, interconnectionLimit, netMeteringType } =
      body;

    const plan = await prisma.plan.update({
      where: { projectId: id },
      data: {
        utilityStatus: "application_submitted",
        applicationDate: new Date(),
        utilityName: utilityName || undefined,
        utilityAccount: utilityAccount || undefined,
        interconnectionLimit: interconnectionLimit || undefined,
        netMeteringType: netMeteringType || "net_metering",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Utility interconnection application submitted",
      utility: {
        utilityStatus: plan.utilityStatus,
        utilityName: plan.utilityName,
        utilityAccount: plan.utilityAccount,
        interconnectionLimit: plan.interconnectionLimit,
        applicationDate: plan.applicationDate,
        netMeteringType: plan.netMeteringType,
      },
    });
  } catch (error) {
    console.error("Error submitting utility application:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to submit utility application",
      },
      { status: 500 }
    );
  }
}

