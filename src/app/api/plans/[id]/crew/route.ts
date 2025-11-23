import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Get crew assignments
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const plan = await prisma.plan.findUnique({
      where: { projectId: params.id },
      select: {
        crewAssignments: true,
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
      crew: plan.crewAssignments
        ? JSON.parse(plan.crewAssignments)
        : [],
    });
  } catch (error) {
    console.error("Error fetching crew assignments:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch crew assignments",
      },
      { status: 500 }
    );
  }
}

// PATCH - Update crew assignments
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { crewAssignments } = body;

    if (!crewAssignments || !Array.isArray(crewAssignments)) {
      return NextResponse.json(
        { success: false, error: "crewAssignments must be an array" },
        { status: 400 }
      );
    }

    const plan = await prisma.plan.update({
      where: { projectId: params.id },
      data: {
        crewAssignments: JSON.stringify(crewAssignments),
      },
    });

    return NextResponse.json({
      success: true,
      crew: JSON.parse(plan.crewAssignments || "[]"),
    });
  } catch (error) {
    console.error("Error updating crew assignments:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update crew assignments",
      },
      { status: 500 }
    );
  }
}

// POST - Add crew member
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, role, email, phone, assignedTasks, schedule } = body;

    if (!name || !role) {
      return NextResponse.json(
        { success: false, error: "Name and role are required" },
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

    const existingCrew = plan.crewAssignments
      ? JSON.parse(plan.crewAssignments)
      : [];

    const newMember = {
      id: `crew-${Date.now()}`,
      name,
      role,
      email: email || null,
      phone: phone || null,
      assignedTasks: assignedTasks || [],
      schedule: schedule || null,
      createdAt: new Date().toISOString(),
    };

    existingCrew.push(newMember);

    const updatedPlan = await prisma.plan.update({
      where: { projectId: params.id },
      data: {
        crewAssignments: JSON.stringify(existingCrew),
      },
    });

    return NextResponse.json({
      success: true,
      crew: JSON.parse(updatedPlan.crewAssignments || "[]"),
    });
  } catch (error) {
    console.error("Error adding crew member:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to add crew member",
      },
      { status: 500 }
    );
  }
}

