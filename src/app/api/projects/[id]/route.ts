import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recalculateSystemFromBOM } from "@/lib/bom-calculations";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        bills: true,
        analysis: true,
        system: true,
        bomItems: true,
        plan: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 },
      );
    }

    // If BOM items exist, ensure system record is synced with actual BOM
    if (project.bomItems && project.bomItems.length > 0 && project.system) {
      try {
        const systemResult = await recalculateSystemFromBOM(id);
        if (systemResult.success && systemResult.updated) {
          // Refetch project to get updated system data
          const updatedProject = await prisma.project.findUnique({
            where: { id },
            include: {
              bills: true,
              analysis: true,
              system: true,
              bomItems: true,
              plan: true,
            },
          });
          if (updatedProject) {
            return NextResponse.json({ success: true, project: updatedProject });
          }
        }
      } catch (error) {
        console.error("Error recalculating system from BOM:", error);
        // Continue with original project data if recalculation fails
      }
    }

    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch project" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, clientName, address, phone, email } = body;

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(clientName && { clientName }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
      },
    });

    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update project" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete project" },
      { status: 500 },
    );
  }
}
