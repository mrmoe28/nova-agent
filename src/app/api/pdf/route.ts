import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateNovaAgentPDF } from "@/lib/pdf-generator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "Project ID is required" },
        { status: 400 },
      );
    }

    // Fetch complete project data
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
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

    // Generate PDF
    const pdfBuffer = await generateNovaAgentPDF(
      project,
      project.analysis,
      project.system,
      project.bomItems,
      project.plan,
    );

    // Update project status and save PDF path
    const fileName = `${project.clientName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}_NovaAgent_Report.pdf`;

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "complete" },
    });

    if (project.plan) {
      await prisma.plan.update({
        where: { projectId },
        data: { finalPdfPath: `/reports/${fileName}` },
      });
    }

    // Return PDF as downloadable response
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : "";
    console.error("PDF Error Stack:", errorStack);

    return NextResponse.json(
      {
        success: false,
        error: `Failed to generate PDF: ${errorMessage}`,
        details:
          process.env.NODE_ENV === "development" ? errorStack : undefined,
      },
      { status: 500 },
    );
  }
}
