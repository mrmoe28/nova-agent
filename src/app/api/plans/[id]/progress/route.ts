import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Get installation progress summary
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const plan = await prisma.plan.findUnique({
      where: { projectId: id },
      select: {
        installationPhase: true,
        installStartDate: true,
        installCompleteDate: true,
        materialDeliveryDate: true,
      },
    });

    if (!plan) {
      return NextResponse.json(
        { success: false, error: "Plan not found" },
        { status: 404 }
      );
    }

    // Get task statistics
    const tasks = await prisma.planTask.findMany({
      where: { planId: id },
    });

    const taskStats = {
      total: tasks.length,
      completed: tasks.filter((t) => t.status === "completed").length,
      inProgress: tasks.filter((t) => t.status === "in_progress").length,
      blocked: tasks.filter((t) => t.status === "blocked").length,
      notStarted: tasks.filter((t) => t.status === "not_started").length,
    };

    const progressPercentage =
      taskStats.total > 0
        ? Math.round((taskStats.completed / taskStats.total) * 100)
        : 0;

    // Get inspection statistics
    const inspections = await prisma.planInspection.findMany({
      where: { planId: id },
    });

    const inspectionStats = {
      total: inspections.length,
      passed: inspections.filter((i) => i.status === "passed").length,
      failed: inspections.filter((i) => i.status === "failed").length,
      scheduled: inspections.filter((i) => i.status === "scheduled").length,
      pending: inspections.filter((i) => i.status === "pending").length,
    };

    return NextResponse.json({
      success: true,
      progress: {
        phase: plan.installationPhase || "pre_install",
        progressPercentage,
        taskStats,
        inspectionStats,
        dates: {
          materialDelivery: plan.materialDeliveryDate,
          installStart: plan.installStartDate,
          installComplete: plan.installCompleteDate,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching progress:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch progress",
      },
      { status: 500 }
    );
  }
}

