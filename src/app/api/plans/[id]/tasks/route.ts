import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Get all tasks for a plan
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
  ) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const phase = searchParams.get("phase");
    const status = searchParams.get("status");

    const where: any = { planId: id };
    if (phase) where.phase = phase;
    if (status) where.status = status;

    const tasks = await prisma.planTask.findMany({
      where,
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    });

    // Parse dependencies JSON
    const tasksWithParsedDeps = tasks.map((task) => ({
      ...task,
      dependencies: task.dependencies
        ? JSON.parse(task.dependencies)
        : [],
    }));

    return NextResponse.json({
      success: true,
      tasks: tasksWithParsedDeps,
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch tasks",
      },
      { status: 500 }
    );
  }
}

// POST - Create a new task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      phase,
      status = "not_started",
      priority = "medium",
      assignee,
      dueDate,
      dependencies = [],
      estimatedHours,
      notes,
    } = body;

    if (!title || !phase) {
      return NextResponse.json(
        { success: false, error: "Title and phase are required" },
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

    const task = await prisma.planTask.create({
      data: {
        planId: id,
        title,
        description,
        phase,
        status,
        priority,
        assignee: assignee || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        dependencies: JSON.stringify(dependencies),
        estimatedHours: estimatedHours || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({
      success: true,
      task: {
        ...task,
        dependencies: task.dependencies ? JSON.parse(task.dependencies) : [],
      },
    });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create task",
      },
      { status: 500 }
    );
  }
}

