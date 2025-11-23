import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Get cost breakdown
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
  ) {
  try {
    const { id } = await params;
    const plan = await prisma.plan.findUnique({
      where: { projectId: id },
      select: {
        costBreakdown: true,
        budgetVariance: true,
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
      costBreakdown: plan.costBreakdown
        ? JSON.parse(plan.costBreakdown)
        : null,
      budgetVariance: plan.budgetVariance,
    });
  } catch (error) {
    console.error("Error fetching cost breakdown:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch cost breakdown",
      },
      { status: 500 }
    );
  }
}

// PATCH - Update cost breakdown
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { costBreakdown, budgetVariance } = body;

    const updateData: any = {};

    if (costBreakdown !== undefined) {
      updateData.costBreakdown = JSON.stringify(costBreakdown);
    }
    if (budgetVariance !== undefined) {
      updateData.budgetVariance = budgetVariance;
    }

    const plan = await prisma.plan.update({
      where: { projectId: id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      costBreakdown: plan.costBreakdown
        ? JSON.parse(plan.costBreakdown)
        : null,
      budgetVariance: plan.budgetVariance,
    });
  } catch (error) {
    console.error("Error updating cost breakdown:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update cost breakdown",
      },
      { status: 500 }
    );
  }
}

