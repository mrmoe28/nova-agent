import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateNovaAgentPDF } from "@/lib/pdf-generator";
import { recalculateSystemFromBOM } from "@/lib/bom-calculations";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

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

    // Recalculate system from BOM to ensure accurate data
    if (project.bomItems && project.bomItems.length > 0) {
      await recalculateSystemFromBOM(projectId);
      // Refetch project with updated system data
      const updatedProject = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          analysis: true,
          system: true,
          bomItems: true,
          plan: true,
        },
      });
      if (updatedProject) {
        project.system = updatedProject.system;
      }
    }

    // Generate PDF
    const pdfBuffer = await generateNovaAgentPDF(
      project,
      project.analysis,
      project.system,
      project.bomItems,
      project.plan,
      projectId,
    );

    // Update project status and save PDF path
    const fileName = `${project.clientName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}_NovaAgent_Report.pdf`;

    // Save PDF to desktop folder (only in local/development environments)
    // Skip on Vercel/production as serverless functions don't have access to user's desktop
    if (process.env.NODE_ENV !== 'production' || process.env.ALLOW_DESKTOP_SAVE === 'true') {
      try {
        const desktopPath = join(homedir(), "Desktop", "NovaAgent");
        await mkdir(desktopPath, { recursive: true });
        const filePath = join(desktopPath, fileName);
        await writeFile(filePath, pdfBuffer);
        console.log(`PDF saved to desktop: ${filePath}`);
      } catch (error) {
        console.error("Failed to save PDF to desktop:", error);
        // Continue even if desktop save fails - still return PDF for download
      }
    }

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
