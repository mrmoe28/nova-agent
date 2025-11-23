import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Get change orders
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const plan = await prisma.plan.findUnique({
      where: { projectId: id },
      select: {
        changeOrders: true,
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
      changeOrders: plan.changeOrders ? JSON.parse(plan.changeOrders) : [],
    });
  } catch (error) {
    console.error("Error fetching change orders:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch change orders",
      },
      { status: 500 }
    );
  }
}

// POST - Create a new change order
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      description,
      reason,
      costChange,
      scheduleImpact,
      status = "pending",
      approvedBy,
      approvedDate,
    } = body;

    if (!description || !reason || costChange === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "Description, reason, and cost change are required",
        },
        { status: 400 }
      );
    }

    const plan = await prisma.plan.findUnique({
      where: { projectId: id },
    });

    if (!plan) {
      return NextResponse.json(
        { success: false, error: "Plan not found" },
        { status: 404 }
      );
    }

    const existingChangeOrders = plan.changeOrders
      ? JSON.parse(plan.changeOrders)
      : [];

    const newChangeOrder = {
      id: `co-${Date.now()}`,
      description,
      reason,
      costChange,
      scheduleImpact: scheduleImpact || 0, // days
      status,
      approvedBy: approvedBy || null,
      approvedDate: approvedDate ? new Date(approvedDate).toISOString() : null,
      createdAt: new Date().toISOString(),
    };

    existingChangeOrders.push(newChangeOrder);

    // Update cost breakdown if change order is approved
    let updatedCostBreakdown = plan.costBreakdown
      ? JSON.parse(plan.costBreakdown)
      : null;

    if (status === "approved" && updatedCostBreakdown) {
      updatedCostBreakdown.total =
        (updatedCostBreakdown.total || 0) + costChange;
      updatedCostBreakdown.changeOrders =
        (updatedCostBreakdown.changeOrders || 0) + costChange;
    }

    const updateData: any = {
      changeOrders: JSON.stringify(existingChangeOrders),
    };

    if (updatedCostBreakdown) {
      updateData.costBreakdown = JSON.stringify(updatedCostBreakdown);
    }

    const updatedPlan = await prisma.plan.update({
      where: { projectId: id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      changeOrders: JSON.parse(updatedPlan.changeOrders || "[]"),
    });
  } catch (error) {
    console.error("Error creating change order:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create change order",
      },
      { status: 500 }
    );
  }
}

// PATCH - Update change order status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { changeOrderId, status, approvedBy } = body;

    if (!changeOrderId || !status) {
      return NextResponse.json(
        {
          success: false,
          error: "Change order ID and status are required",
        },
        { status: 400 }
      );
    }

    const plan = await prisma.plan.findUnique({
      where: { projectId: id },
    });

    if (!plan) {
      return NextResponse.json(
        { success: false, error: "Plan not found" },
        { status: 404 }
      );
    }

    const changeOrders = plan.changeOrders
      ? JSON.parse(plan.changeOrders)
      : [];

    const changeOrderIndex = changeOrders.findIndex(
      (co: any) => co.id === changeOrderId
    );

    if (changeOrderIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Change order not found" },
        { status: 404 }
      );
    }

    const changeOrder = changeOrders[changeOrderIndex];
    const wasApproved = changeOrder.status === "approved";
    const isNowApproved = status === "approved";

    changeOrders[changeOrderIndex] = {
      ...changeOrder,
      status,
      approvedBy: isNowApproved ? approvedBy || changeOrder.approvedBy : null,
      approvedDate:
        isNowApproved && !changeOrder.approvedDate
          ? new Date().toISOString()
          : changeOrder.approvedDate,
    };

    // Update cost breakdown if approval status changed
    let updatedCostBreakdown = plan.costBreakdown
      ? JSON.parse(plan.costBreakdown)
      : null;

    if (updatedCostBreakdown) {
      if (!wasApproved && isNowApproved) {
        // Adding cost
        updatedCostBreakdown.total =
          (updatedCostBreakdown.total || 0) + changeOrder.costChange;
        updatedCostBreakdown.changeOrders =
          (updatedCostBreakdown.changeOrders || 0) + changeOrder.costChange;
      } else if (wasApproved && !isNowApproved) {
        // Removing cost
        updatedCostBreakdown.total =
          (updatedCostBreakdown.total || 0) - changeOrder.costChange;
        updatedCostBreakdown.changeOrders =
          (updatedCostBreakdown.changeOrders || 0) - changeOrder.costChange;
      }
    }

    const updateData: any = {
      changeOrders: JSON.stringify(changeOrders),
    };

    if (updatedCostBreakdown) {
      updateData.costBreakdown = JSON.stringify(updatedCostBreakdown);
    }

    const updatedPlan = await prisma.plan.update({
      where: { projectId: id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      changeOrders: JSON.parse(updatedPlan.changeOrders || "[]"),
    });
  } catch (error) {
    console.error("Error updating change order:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update change order",
      },
      { status: 500 }
    );
  }
}

