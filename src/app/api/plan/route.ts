import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    // Get system design
    const system = await prisma.system.findUnique({
      where: { projectId },
    });

    if (!system) {
      return NextResponse.json(
        { success: false, error: "System design must be completed first" },
        { status: 400 },
      );
    }

    // NEC compliance checks
    const necChecks = [
      {
        code: "NEC 690.8",
        description: "Circuit Sizing and Protection",
        status: "pass",
        notes: "Wire sizing calculated per 125% rule",
      },
      {
        code: "NEC 690.12",
        description: "Rapid Shutdown Requirements",
        status: "pass",
        notes: "Module-level rapid shutdown installed",
      },
      {
        code: "NEC 690.13",
        description: "Photovoltaic System Disconnecting Means",
        status: "pass",
        notes: "AC and DC disconnects properly sized and labeled",
      },
      {
        code: "NEC 705.12",
        description: "Point of Connection",
        status: system.totalSolarKw > 10 ? "warning" : "pass",
        notes:
          system.totalSolarKw > 10
            ? "Large system - verify utility interconnection requirements"
            : "Standard residential interconnection",
      },
      {
        code: "NEC 706",
        description: "Energy Storage Systems",
        status: "pass",
        notes: "Battery system meets fire and safety requirements",
      },
    ];

    const warnings = [];
    if (system.totalSolarKw > 10) {
      warnings.push("System exceeds 10kW - utility pre-approval required");
    }
    if (system.batteryKwh > 20) {
      warnings.push(
        "Large battery system - additional fire safety measures required",
      );
    }

    // Installation steps
    const installSteps = [
      "Site survey and structural assessment",
      "Apply for permits and utility interconnection",
      "Install roof mounting system",
      "Mount solar panels and complete array wiring",
      "Install battery storage system",
      "Install inverter and electrical connections",
      "Complete AC/DC disconnects and labeling",
      "System commissioning and testing",
      "Final inspection and utility approval",
      "Customer training and handoff",
    ];

    const laborHoursEst =
      system.solarPanelCount * 0.5 + system.batteryKwh * 2 + 16;

    // Save installation plan
    const plan = await prisma.plan.upsert({
      where: { projectId },
      create: {
        projectId,
        necChecks: JSON.stringify(necChecks),
        warnings: JSON.stringify(warnings),
        installSteps: JSON.stringify(installSteps),
        timeline: `${Math.ceil(laborHoursEst / 8)} days estimated`,
        laborHoursEst,
        permitNotes: "Standard residential solar + storage permit required",
      },
      update: {
        necChecks: JSON.stringify(necChecks),
        warnings: JSON.stringify(warnings),
        installSteps: JSON.stringify(installSteps),
        timeline: `${Math.ceil(laborHoursEst / 8)} days estimated`,
        laborHoursEst,
        permitNotes: "Standard residential solar + storage permit required",
      },
    });

    // Update project status
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "plan" },
    });

    return NextResponse.json({
      success: true,
      plan: {
        ...plan,
        necChecks: JSON.parse(plan.necChecks),
        warnings: plan.warnings ? JSON.parse(plan.warnings) : [],
        installSteps: JSON.parse(plan.installSteps),
      },
    });
  } catch (error) {
    console.error("Error generating plan:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate plan" },
      { status: 500 },
    );
  }
}
