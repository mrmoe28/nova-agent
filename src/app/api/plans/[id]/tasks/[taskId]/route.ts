import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Get a specific task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
  ) {
  try {
    const { id, taskId } = await params;
    const task = await prisma.planTask.findUnique({
      where: { id: taskId },
    });

    if (!task || task.planId !== id) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      task: {
        ...task,
        dependencies: task.dependencies ? JSON.parse(task.dependencies) : [],
      },
    });
  } catch (error) {
    console.error("Error fetching task:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch task",
      },
      { status: 500 }
    );
  }
}

// PATCH - Update a task
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id, taskId } = await params;
    const body = await request.json();
    const {
      title,
      description,
      phase,
      status,
      priority,
      assignee,
      dueDate,
      dependencies,
      estimatedHours,
      actualHours,
      notes,
    } = body;

    // Verify task belongs to plan
    const existingTask = await prisma.planTask.findUnique({
      where: { id: taskId },
    });

    if (!existingTask || existingTask.planId !== id) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (phase !== undefined) updateData.phase = phase;
    if (status !== undefined) {
      updateData.status = status;
      // Auto-set completed date if status is completed
      if (status === "completed" && !existingTask.completedDate) {
        updateData.completedDate = new Date();
      }
      // Clear completed date if status changes from completed
      if (status !== "completed" && existingTask.completedDate) {
        updateData.completedDate = null;
      }
    }
    if (priority !== undefined) updateData.priority = priority;
    if (assignee !== undefined) updateData.assignee = assignee;
    if (dueDate !== undefined)
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (dependencies !== undefined)
      updateData.dependencies = JSON.stringify(dependencies);
    if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours;
    if (actualHours !== undefined) updateData.actualHours = actualHours;
    if (notes !== undefined) updateData.notes = notes;

    const task = await prisma.planTask.update({
      where: { id: taskId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      task: {
        ...task,
        dependencies: task.dependencies ? JSON.parse(task.dependencies) : [],
      },
    });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update task",
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    // Verify task belongs to plan
    const existingTask = await prisma.planTask.findUnique({
      where: { id: taskId },
    });

    if (!existingTask || existingTask.planId !== id) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    await prisma.planTask.delete({
      where: { id: taskId },
    });

    return NextResponse.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete task",
      },
      { status: 500 }
    );
  }
}

