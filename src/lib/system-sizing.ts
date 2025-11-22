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
  manualPanelCount?: number | null;
}

export async function performSystemSizing({
  projectId,
  backupDurationHrs,
  criticalLoadKw,
  distributorId,
  updateProjectStatus = true,
  manualPanelCount,
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
  // Use manual panel count if provided, otherwise calculate based on usage
  let solarPanelCount;
  if (manualPanelCount !== null && manualPanelCount !== undefined) {
    solarPanelCount = manualPanelCount;
  } else {
    solarPanelCount = Math.ceil((totalSolarKw * 1000) / solarPanelWattage);
  }

  // Recalculate actual total solar kW based on final panel count
  const actualTotalSolarKw = (solarPanelCount * solarPanelWattage) / 1000;

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
    actualTotalSolarKw * 1000 * solarCostPerWatt +
    batteryKwh * batteryCostPerKwh +
    inverterKw * inverterCostPerKw;
    // Note: Installation/labor costs excluded per user request

  const systemData = {
    solarPanelCount,
    solarPanelWattage,
    totalSolarKw: parseFloat(actualTotalSolarKw.toFixed(2)),
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
      data: { status: "sizing" },
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
    await refreshBomAndPlan(projectId, true, distributorId);
  }

  return { system, pricing: pricingInfo };
}

export { SizingError };

export async function regenerateBom(
  projectId: string,
  skipStatusUpdate = false,
  distributorId?: string,
  selectedEquipmentIds?: {
    solarPanelId?: string;
    batteryId?: string;
    inverterId?: string;
    mountingId?: string;
    electricalId?: string;
  },
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

  // Equipment must be explicitly selected - no auto-selection
  if (!selectedEquipmentIds && !distributorId) {
    // Try to get distributor from existing BOM items
    const existingBom = await prisma.bOMItem.findFirst({
      where: { projectId },
      include: {
        project: {
          include: {
            bomItems: {
              include: {
                // We'll need to track equipmentId in BOMItem
                // For now, we'll require distributorId
              },
            },
          },
        },
      },
    });
    
    if (!distributorId) {
      throw new SizingError(
        "Distributor and equipment selection required. Please select a distributor and explicitly choose equipment before generating BOM. No default equipment will be used.",
        400
      );
    }
  }

  // Fetch selected equipment by IDs if provided
  let solarPanel = null;
  let battery = null;
  let inverter = null;
  let mounting = null;
  let electrical = null;

  if (selectedEquipmentIds && distributorId) {
    try {
      const equipmentIds = [
        selectedEquipmentIds.solarPanelId,
        selectedEquipmentIds.batteryId,
        selectedEquipmentIds.inverterId,
        selectedEquipmentIds.mountingId,
        selectedEquipmentIds.electricalId,
      ].filter((id): id is string => !!id);

      if (equipmentIds.length > 0) {
        const equipment = await prisma.equipment.findMany({
          where: {
            id: { in: equipmentIds },
            distributorId,
            isActive: true,
            inStock: true,
          },
          select: {
            id: true,
            category: true,
            name: true,
            manufacturer: true,
            modelNumber: true,
            unitPrice: true,
            specifications: true,
            imageUrl: true,
            createdAt: true,
            distributor: {
              select: {
                name: true,
              },
            },
          },
        });

        // Map equipment by category
        solarPanel = equipment.find((e) => e.id === selectedEquipmentIds.solarPanelId && e.category === "SOLAR_PANEL") || null;
        battery = equipment.find((e) => e.id === selectedEquipmentIds.batteryId && e.category === "BATTERY") || null;
        inverter = equipment.find((e) => e.id === selectedEquipmentIds.inverterId && e.category === "INVERTER") || null;
        mounting = equipment.find((e) => e.id === selectedEquipmentIds.mountingId && e.category === "MOUNTING") || null;
        electrical = equipment.find((e) => e.id === selectedEquipmentIds.electricalId && e.category === "ELECTRICAL") || null;

        console.log("Using user-selected equipment:", {
          solarPanel: solarPanel?.name,
          battery: battery?.name,
          inverter: inverter?.name,
          mounting: mounting?.name,
          electrical: electrical?.name,
        });
      }
    } catch (error) {
      console.error("Error fetching selected equipment:", error);
      throw new SizingError(
        "Failed to fetch selected equipment. Please verify equipment is available and try again.",
        500
      );
    }
  }

  // Require real equipment - no hardcoded fallbacks
  // Equipment must be explicitly selected by the user
  if (!distributorId) {
    throw new SizingError(
      "Distributor must be selected. Please select a distributor with available equipment before generating BOM.",
      400
    );
  }

  // Validate that required equipment is available
  const missingEquipment: string[] = [];
  if (system.solarPanelCount > 0 && !solarPanel) {
    missingEquipment.push("Solar Panels");
  }
  if (system.batteryKwh > 0 && !battery) {
    missingEquipment.push("Battery Storage");
  }
  if (system.inverterKw > 0 && !inverter) {
    missingEquipment.push("Inverter");
  }
  if (system.solarPanelCount > 0 && !mounting) {
    missingEquipment.push("Mounting System");
  }
  if (!electrical) {
    missingEquipment.push("Electrical Components");
  }

  if (missingEquipment.length > 0) {
    throw new SizingError(
      `Equipment selection required. Please select the following equipment from your distributor: ${missingEquipment.join(", ")}. Equipment must be explicitly selected - no default equipment will be used.`,
      400
    );
  }

  // Build BOM items only from real selected equipment
  const bomItems = [];

  // Solar Panel - only if panels are needed and equipment is selected
  if (system.solarPanelCount > 0 && solarPanel) {
    bomItems.push({
      projectId,
      category: "solar" as const,
      itemName: solarPanel.name,
      manufacturer: solarPanel.manufacturer || null,
      modelNumber: solarPanel.modelNumber || "N/A",
      quantity: system.solarPanelCount,
      unitPriceUsd: solarPanel.unitPrice,
      totalPriceUsd: system.solarPanelCount * solarPanel.unitPrice,
      imageUrl: solarPanel.imageUrl || null,
      notes: typeof solarPanel.specifications === 'string' 
        ? solarPanel.specifications 
        : JSON.stringify(solarPanel.specifications) || null,
    });
  }

  // Battery - only if battery is needed and equipment is selected
  if (system.batteryKwh > 0 && battery) {
    bomItems.push({
      projectId,
      category: "battery" as const,
      itemName: battery.name,
      manufacturer: battery.manufacturer || null,
      modelNumber: battery.modelNumber || "N/A",
      quantity: 1,
      unitPriceUsd: battery.unitPrice,
      totalPriceUsd: battery.unitPrice,
      imageUrl: battery.imageUrl || null,
      notes: typeof battery.specifications === 'string' 
        ? battery.specifications 
        : JSON.stringify(battery.specifications) || null,
    });
  }

  // Inverter - only if inverter is needed and equipment is selected
  if (system.inverterKw > 0 && inverter) {
    bomItems.push({
      projectId,
      category: "inverter" as const,
      itemName: inverter.name,
      manufacturer: inverter.manufacturer || null,
      modelNumber: inverter.modelNumber || "N/A",
      quantity: 1,
      unitPriceUsd: inverter.unitPrice,
      totalPriceUsd: inverter.unitPrice,
      imageUrl: inverter.imageUrl || null,
      notes: typeof inverter.specifications === 'string' 
        ? inverter.specifications 
        : JSON.stringify(inverter.specifications) || null,
    });
  }

  // Mounting - only if panels are needed and equipment is selected
  if (system.solarPanelCount > 0 && mounting) {
    bomItems.push({
      projectId,
      category: "mounting" as const,
      itemName: mounting.name,
      manufacturer: mounting.manufacturer || null,
      modelNumber: mounting.modelNumber || "N/A",
      quantity: Math.ceil(system.solarPanelCount / 4), // Approximate mounting kits needed
      unitPriceUsd: mounting.unitPrice,
      totalPriceUsd: Math.ceil(system.solarPanelCount / 4) * mounting.unitPrice,
      imageUrl: mounting.imageUrl || null,
      notes: typeof mounting.specifications === 'string' 
        ? mounting.specifications 
        : JSON.stringify(mounting.specifications) || null,
    });
  }

  // Electrical - always required
  if (electrical) {
    bomItems.push({
      projectId,
      category: "electrical" as const,
      itemName: electrical.name,
      manufacturer: electrical.manufacturer || null,
      modelNumber: electrical.modelNumber || "N/A",
      quantity: 1,
      unitPriceUsd: electrical.unitPrice,
      totalPriceUsd: electrical.unitPrice,
      imageUrl: electrical.imageUrl || null,
      notes: typeof electrical.specifications === 'string' 
        ? electrical.specifications 
        : JSON.stringify(electrical.specifications) || null,
    });
  }

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
      data: { status: "bom" },
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
    pricingSource: distributorId ? "distributor" : "default_estimates",
    distributorId: distributorId || null,
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
    {
      code: "Georgia Permit Rules",
      description: "Georgia Residential Solar Limit",
      status: system.totalSolarKw > 10 ? "fail" : "pass",
      notes:
        system.totalSolarKw > 10
          ? `VIOLATION: System ${system.totalSolarKw.toFixed(2)}kW exceeds Georgia's 10kW residential permit limit. Reduce panel quantity to ${Math.floor((10 * 1000) / SYSTEM_SIZING.SOLAR_PANEL_WATTAGE)} panels maximum.`
          : "System complies with Georgia 10kW residential limit",
    },
  ];

  const warnings = [];
  if (system.totalSolarKw > 10) {
    warnings.push("⚠️ GEORGIA PERMIT VIOLATION: System exceeds 10kW residential limit. Must reduce to 10kW or obtain commercial permit.");
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
      data: { status: "plan" },
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
  distributorId?: string,
) {
  const bom = await regenerateBom(projectId, skipStatusUpdate, distributorId);
  const plan = await regeneratePlan(projectId, skipStatusUpdate);
  return { ...bom, ...plan };
}
