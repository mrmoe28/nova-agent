import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Get risks and contingencies
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const plan = await prisma.plan.findUnique({
      where: { projectId: params.id },
      select: {
        risks: true,
        contingencies: true,
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
      risks: plan.risks ? JSON.parse(plan.risks) : [],
      contingencies: plan.contingencies ? JSON.parse(plan.contingencies) : [],
    });
  } catch (error) {
    console.error("Error fetching risks:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch risks",
      },
      { status: 500 }
    );
  }
}

// PATCH - Update risks and contingencies
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { risks, contingencies } = body;

    const updateData: any = {};

    if (risks !== undefined) {
      updateData.risks = JSON.stringify(risks);
    }
    if (contingencies !== undefined) {
      updateData.contingencies = JSON.stringify(contingencies);
    }

    const plan = await prisma.plan.update({
      where: { projectId: params.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      risks: plan.risks ? JSON.parse(plan.risks) : [],
      contingencies: plan.contingencies ? JSON.parse(plan.contingencies) : [],
    });
  } catch (error) {
    console.error("Error updating risks:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update risks",
      },
      { status: 500 }
    );
  }
}

// POST - Add a new risk
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { title, severity, probability, impact, mitigation } = body;

    if (!title || !severity || !probability || !impact) {
      return NextResponse.json(
        {
          success: false,
          error: "Title, severity, probability, and impact are required",
        },
        { status: 400 }
      );
    }

    const plan = await prisma.plan.findUnique({
      where: { projectId: params.id },
    });

    if (!plan) {
      return NextResponse.json(
        { success: false, error: "Plan not found" },
        { status: 404 }
      );
    }

    const existingRisks = plan.risks ? JSON.parse(plan.risks) : [];

    const newRisk = {
      id: `risk-${Date.now()}`,
      title,
      severity,
      probability,
      impact,
      mitigation: mitigation || "",
      createdAt: new Date().toISOString(),
    };

    existingRisks.push(newRisk);

    const updatedPlan = await prisma.plan.update({
      where: { projectId: params.id },
      data: {
        risks: JSON.stringify(existingRisks),
      },
    });

    return NextResponse.json({
      success: true,
      risks: JSON.parse(updatedPlan.risks || "[]"),
    });
  } catch (error) {
    console.error("Error adding risk:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to add risk",
      },
      { status: 500 }
    );
  }
}

