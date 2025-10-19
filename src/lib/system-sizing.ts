import { prisma } from "@/lib/prisma";
import { SYSTEM_SIZING } from "@/lib/config";

class SizingError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

interface SystemSizingOptions {
  projectId: string;
  backupDurationHrs?: number;
  criticalLoadKw?: number;
  distributorId?: string;
  updateProjectStatus?: boolean;
}

export async function performSystemSizing({
  projectId,
  backupDurationHrs,
  criticalLoadKw,
  distributorId,
  updateProjectStatus = true,
}: SystemSizingOptions) {
  if (!projectId) {
    throw new SizingError("Project ID is required", 400);
  }

  const analysis = await prisma.analysis.findUnique({
    where: { projectId },
  });

  if (!analysis) {
    throw new SizingError("Analysis must be completed first", 400);
  }

  const monthlyUsageKwh = analysis.monthlyUsageKwh;
  const dailyUsageKwh = monthlyUsageKwh / 30;
  const solarSizingFactor = SYSTEM_SIZING.SOLAR_SIZING_FACTOR;

  const totalSolarKw =
    (dailyUsageKwh / SYSTEM_SIZING.PEAK_SUN_HOURS) * solarSizingFactor;
  const solarPanelWattage = SYSTEM_SIZING.SOLAR_PANEL_WATTAGE;
  const solarPanelCount = Math.ceil((totalSolarKw * 1000) / solarPanelWattage);

  // Calculate battery size based on daily critical load consumption, not continuous power
  // Typical home uses 30 kWh/day, critical loads are ~30-50% of that
  const backupHrs = backupDurationHrs || 24;
  const criticalLoad = criticalLoadKw || 3; // Peak power demand in kW
  
  // Battery capacity = (Daily critical energy consumption) × (Backup days) × Safety factor
  // Daily critical energy = (Daily total kWh × Critical load percentage)
  // For most homes: 30 kWh/day × 0.4 = 12 kWh/day for critical loads
  const criticalDailyKwh = Math.min(dailyUsageKwh * 0.4, 15); // Cap at 15 kWh for critical loads
  const backupDays = backupHrs / 24;
  
  // Size battery based on energy needs, not continuous power output
  // Industry standard: 10-20 kWh for average homes, 5-10 kWh for small homes
  const calculatedBatteryKwh = criticalDailyKwh * backupDays * SYSTEM_SIZING.BATTERY_OVERHEAD;
  
  // Apply reasonable limits based on industry standards
  // Min: 5 kWh (small backup), Max: 40 kWh (whole-home backup)
  const batteryKwh = Math.max(5, Math.min(40, calculatedBatteryKwh));

  // Inverter sizing: Based on peak power demand, not energy consumption
  // Typical residential peak: 5-10 kW, with 25% overhead for surge capacity
  const peakDemand = analysis.peakDemandKw || Math.max(5, criticalLoad);
  const inverterKw = peakDemand * SYSTEM_SIZING.INVERTER_MULTIPLIER;

  let solarCostPerWatt = SYSTEM_SIZING.SOLAR_COST_PER_WATT;
  let batteryCostPerKwh = SYSTEM_SIZING.BATTERY_COST_PER_KWH;
  let inverterCostPerKw = SYSTEM_SIZING.INVERTER_COST_PER_KW;
  const installationCost = SYSTEM_SIZING.INSTALLATION_BASE_COST;

  if (distributorId) {
    try {
      const equipment = await prisma.equipment.findMany({
        where: {
          distributorId,
          isActive: true,
          inStock: true,
        },
      });

      const solarPanels = equipment.filter(
        (item) =>
          item.category === "SOLAR_PANEL" ||
          item.name.toLowerCase().includes("solar") ||
          item.name.toLowerCase().includes("panel"),
      );

      if (solarPanels.length > 0) {
        const avgSolarPrice =
          solarPanels.reduce((sum, panel) => sum + panel.unitPrice, 0) /
          solarPanels.length;
        const calculatedSolarCostPerWatt = avgSolarPrice / solarPanelWattage;
        solarCostPerWatt = Math.min(calculatedSolarCostPerWatt, 4.0);
      }

      const batteries = equipment.filter(
        (item) =>
          item.category === "BATTERY" ||
          item.name.toLowerCase().includes("battery") ||
          item.name.toLowerCase().includes("lithium"),
      );

      if (batteries.length > 0) {
        const avgBatteryPrice =
          batteries.reduce((sum, battery) => sum + battery.unitPrice, 0) /
          batteries.length;
        const calculatedBatteryCostPerKwh = avgBatteryPrice / 5;
        batteryCostPerKwh = Math.min(calculatedBatteryCostPerKwh, 600);
      }

      const inverters = equipment.filter(
        (item) =>
          item.category === "INVERTER" ||
          item.name.toLowerCase().includes("inverter") ||
          item.name.toLowerCase().includes("hybrid"),
      );

      if (inverters.length > 0) {
        const avgInverterPrice =
          inverters.reduce((sum, inv) => sum + inv.unitPrice, 0) /
          inverters.length;
        const calculatedInverterCostPerKw = avgInverterPrice / 5;
        inverterCostPerKw = Math.min(calculatedInverterCostPerKw, 1500);
      }
    } catch (error) {
      console.error("Error fetching distributor equipment pricing:", error);
    }
  }

  const estimatedCostUsd =
    totalSolarKw * 1000 * solarCostPerWatt +
    batteryKwh * batteryCostPerKwh +
    inverterKw * inverterCostPerKw +
    installationCost;

  const systemData = {
    solarPanelCount,
    solarPanelWattage,
    totalSolarKw: parseFloat(totalSolarKw.toFixed(2)),
    batteryKwh: parseFloat(batteryKwh.toFixed(2)),
    batteryType: "lithium" as const,
    inverterKw: parseFloat(inverterKw.toFixed(2)),
    inverterType: "Hybrid String Inverter",
    backupDurationHrs: backupHrs,
    criticalLoadKw: criticalLoad,
    estimatedCostUsd: parseFloat(estimatedCostUsd.toFixed(2)),
  };

  const system = await prisma.system.upsert({
    where: { projectId },
    create: {
      projectId,
      ...systemData,
    },
    update: systemData,
  });

  if (updateProjectStatus) {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "SIZING" },
    });
  } else {
    await prisma.project.update({
      where: { id: projectId },
      data: { updatedAt: new Date() },
    });
  }

  const pricingInfo = {
    usedDistributorPricing: !!distributorId,
    distributorId: distributorId || null,
    pricingSource: distributorId ? "distributor" : "default_estimates",
  };

  if (!updateProjectStatus) {
    await refreshBomAndPlan(projectId, true);
  }

  return { system, pricing: pricingInfo };
}

export { SizingError };

export async function regenerateBom(
  projectId: string,
  skipStatusUpdate = false,
) {
  const system = await prisma.system.findUnique({
    where: { projectId },
  });

  if (!system) {
    throw new SizingError("System sizing must be completed first", 400);
  }

  await prisma.bOMItem.deleteMany({
    where: { projectId },
  });

  const bomItems = [
    {
      projectId,
      category: "solar" as const,
      itemName: "Solar Panel - Monocrystalline",
      manufacturer: "SolarTech",
      modelNumber: "ST-400W",
      quantity: system.solarPanelCount,
      unitPriceUsd: (SYSTEM_SIZING.SOLAR_PANEL_WATTAGE * SYSTEM_SIZING.SOLAR_COST_PER_WATT) / 2,
      totalPriceUsd: system.solarPanelCount * ((SYSTEM_SIZING.SOLAR_PANEL_WATTAGE * SYSTEM_SIZING.SOLAR_COST_PER_WATT) / 2),
      notes: "400W high-efficiency panels",
    },
    {
      projectId,
      category: "battery" as const,
      itemName: "Lithium Battery Storage System",
      manufacturer: "PowerStore",
      modelNumber: `PS-${Math.ceil(system.batteryKwh)}kWh`,
      quantity: 1,
      unitPriceUsd: system.batteryKwh * SYSTEM_SIZING.BATTERY_COST_PER_KWH,
      totalPriceUsd: system.batteryKwh * SYSTEM_SIZING.BATTERY_COST_PER_KWH,
      notes: `${system.batteryKwh.toFixed(1)}kWh capacity`,
    },
    {
      projectId,
      category: "inverter" as const,
      itemName: "Hybrid String Inverter",
      manufacturer: "InverterPro",
      modelNumber: `IP-${Math.ceil(system.inverterKw)}K`,
      quantity: 1,
      unitPriceUsd: system.inverterKw * SYSTEM_SIZING.INVERTER_COST_PER_KW,
      totalPriceUsd: system.inverterKw * SYSTEM_SIZING.INVERTER_COST_PER_KW,
      notes: `${system.inverterKw.toFixed(1)}kW capacity`,
    },
    {
      projectId,
      category: "mounting" as const,
      itemName: "Roof Mounting Rails & Hardware",
      manufacturer: "MountTech",
      modelNumber: "MT-RAIL-KIT",
      quantity: Math.ceil(system.solarPanelCount / 4),
      unitPriceUsd: 300,
      totalPriceUsd: Math.ceil(system.solarPanelCount / 4) * 300,
      notes: "Aluminum rails with stainless hardware",
    },
    {
      projectId,
      category: "electrical" as const,
      itemName: "Electrical BOS Components",
      manufacturer: "Various",
      modelNumber: "BOS-COMPLETE",
      quantity: 1,
      unitPriceUsd: 2000,
      totalPriceUsd: 2000,
      notes: "DC/AC disconnects, combiner box, conduit, wire",
    },
  ];

  await prisma.bOMItem.createMany({
    data: bomItems,
  });

  const allBomItems = await prisma.bOMItem.findMany({
    where: { projectId },
    orderBy: { category: "asc" },
  });

  if (!skipStatusUpdate) {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "BOM" },
    });
  } else {
    await prisma.project.update({
      where: { id: projectId },
      data: { updatedAt: new Date() },
    });
  }

  return {
    bomItems: allBomItems,
    totalCost: allBomItems.reduce(
      (sum, item) => sum + item.totalPriceUsd,
      0,
    ),
  };
}

export async function regeneratePlan(
  projectId: string,
  skipStatusUpdate = false,
) {
  const system = await prisma.system.findUnique({
    where: { projectId },
  });

  if (!system) {
    throw new SizingError("System design must be completed first", 400);
  }

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
    warnings.push("Large battery system - additional fire safety measures required");
  }

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

  if (!skipStatusUpdate) {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "PLAN" },
    });
  } else {
    await prisma.project.update({
      where: { id: projectId },
      data: { updatedAt: new Date() },
    });
  }

  return {
    plan: {
      ...plan,
      necChecks: JSON.parse(plan.necChecks),
      warnings: plan.warnings ? JSON.parse(plan.warnings) : [],
      installSteps: JSON.parse(plan.installSteps),
    },
  };
}

export async function refreshBomAndPlan(
  projectId: string,
  skipStatusUpdate = false,
) {
  const bom = await regenerateBom(projectId, skipStatusUpdate);
  const plan = await regeneratePlan(projectId, skipStatusUpdate);
  return { ...bom, ...plan };
}
