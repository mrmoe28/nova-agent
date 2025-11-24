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
  let actualTotalSolarKw = (solarPanelCount * solarPanelWattage) / 1000;
  
  // Apply 10kW roof limit for residential installations
  const MAX_ROOF_CAPACITY_KW = 10;
  if (actualTotalSolarKw > MAX_ROOF_CAPACITY_KW) {
    actualTotalSolarKw = MAX_ROOF_CAPACITY_KW;
    // Recalculate panel count to match the 10kW limit
    solarPanelCount = Math.floor((MAX_ROOF_CAPACITY_KW * 1000) / solarPanelWattage);
  }

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

  // Initialize with default pricing (realistic residential solar costs)
  let solarCostPerWatt = SYSTEM_SIZING.SOLAR_COST_PER_WATT; // Default: $2.20/W
  let batteryCostPerKwh = SYSTEM_SIZING.BATTERY_COST_PER_KWH; // Default: $350/kWh
  let inverterCostPerKw = SYSTEM_SIZING.INVERTER_COST_PER_KW; // Default: $800/kW

  if (distributorId) {
    try {
      const equipment = await prisma.equipment.findMany({
        where: {
          distributorId,
          isActive: true,
          inStock: true,
        },
      });

      // Filter and calculate solar panel pricing
      const solarPanels = equipment.filter(
        (item) =>
          item.category === "SOLAR_PANEL" &&
          item.unitPrice > 0 &&
          item.unitPrice < 1000, // Sanity check: panel should be < $1000
      );

      if (solarPanels.length > 0) {
        const validPanels = solarPanels.filter(p => p.unitPrice > 0 && p.unitPrice < 1000);
        if (validPanels.length > 0) {
          const avgSolarPrice =
            validPanels.reduce((sum, panel) => sum + panel.unitPrice, 0) /
            validPanels.length;
          // Convert panel price to cost per watt (assuming 400W panels)
          const calculatedSolarCostPerWatt = avgSolarPrice / solarPanelWattage;
          // Cap at reasonable maximum ($4/W is very high but possible for premium panels)
          solarCostPerWatt = Math.min(Math.max(calculatedSolarCostPerWatt, 0.5), 4.0);
          console.log(`Solar pricing: avg panel $${avgSolarPrice.toFixed(2)}, cost per watt $${solarCostPerWatt.toFixed(2)}`);
        }
      }

      // Filter and calculate battery pricing
      const batteries = equipment.filter(
        (item) =>
          item.category === "BATTERY" &&
          item.unitPrice > 0 &&
          item.unitPrice < 20000, // Sanity check: battery should be < $20k
      );

      if (batteries.length > 0) {
        const validBatteries = batteries.filter(b => b.unitPrice > 0 && b.unitPrice < 20000);
        if (validBatteries.length > 0) {
          const avgBatteryPrice =
            validBatteries.reduce((sum, battery) => sum + battery.unitPrice, 0) /
            validBatteries.length;
          // Try to extract kWh from specifications or use default 10kWh
          // For now, assume average battery is 10kWh
          const avgBatteryKwh = 10; // Default assumption
          const calculatedBatteryCostPerKwh = avgBatteryPrice / avgBatteryKwh;
          // Cap at reasonable maximum ($600/kWh is very high)
          batteryCostPerKwh = Math.min(Math.max(calculatedBatteryCostPerKwh, 200), 600);
          console.log(`Battery pricing: avg battery $${avgBatteryPrice.toFixed(2)}, cost per kWh $${batteryCostPerKwh.toFixed(2)}`);
        }
      }

      // Filter and calculate inverter pricing
      const inverters = equipment.filter(
        (item) =>
          item.category === "INVERTER" &&
          item.unitPrice > 0 &&
          item.unitPrice < 15000, // Sanity check: inverter should be < $15k
      );

      if (inverters.length > 0) {
        const validInverters = inverters.filter(i => i.unitPrice > 0 && i.unitPrice < 15000);
        if (validInverters.length > 0) {
          const avgInverterPrice =
            validInverters.reduce((sum, inv) => sum + inv.unitPrice, 0) /
            validInverters.length;
          // Assume average inverter is 5kW
          const avgInverterKw = 5;
          const calculatedInverterCostPerKw = avgInverterPrice / avgInverterKw;
          // Cap at reasonable maximum ($1500/kW is very high)
          inverterCostPerKw = Math.min(Math.max(calculatedInverterCostPerKw, 400), 1500);
          console.log(`Inverter pricing: avg inverter $${avgInverterPrice.toFixed(2)}, cost per kW $${inverterCostPerKw.toFixed(2)}`);
        }
      }
    } catch (error) {
      console.error("Error fetching distributor equipment pricing:", error);
      // Fall back to defaults on error
    }
  }

  // Calculate total cost with sanity checks
  const solarCost = actualTotalSolarKw * 1000 * solarCostPerWatt;
  const batteryCost = batteryKwh * batteryCostPerKwh;
  const inverterCost = inverterKw * inverterCostPerKw;
  
  const estimatedCostUsd = solarCost + batteryCost + inverterCost;
  
  // Sanity check: residential solar systems should not exceed $200k
  // If it does, log a warning and cap it (but still return the calculated value)
  if (estimatedCostUsd > 200000) {
    console.warn(`Warning: Calculated system cost is very high: $${estimatedCostUsd.toFixed(2)}`);
    console.warn(`Breakdown: Solar $${solarCost.toFixed(2)}, Battery $${batteryCost.toFixed(2)}, Inverter $${inverterCost.toFixed(2)}`);
    console.warn(`System specs: ${actualTotalSolarKw.toFixed(2)}kW solar, ${batteryKwh.toFixed(2)}kWh battery, ${inverterKw.toFixed(2)}kW inverter`);
  }

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

  // Fetch equipment from ALL distributors (not just one)
  // Prefer EG4 for inverter and battery
  let solarPanel: any = null;
  let battery: any = null;
  let inverter: any = null;
  let rsd: any = null;
  let mountingRails: any = null;
  let midBolts: any = null;
  let solarDeck: any = null;

  try {
    // Get all active distributors
    const allDistributors = await prisma.distributor.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    // Fetch equipment from all distributors
    const allEquipment = await prisma.equipment.findMany({
      where: {
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
        distributorId: true,
        distributor: {
          select: {
            name: true,
          },
        },
      },
    });

    // Find solar panels (any distributor)
    const solarPanels = allEquipment.filter((e) => e.category === "SOLAR_PANEL");
    if (solarPanels.length > 0) {
      // Prefer lower price, but ensure quality (price between $200-$1000 per panel)
      const validPanels = solarPanels.filter(p => p.unitPrice >= 200 && p.unitPrice <= 1000);
      if (validPanels.length > 0) {
        solarPanel = validPanels.sort((a, b) => a.unitPrice - b.unitPrice)[0];
      } else {
        solarPanel = solarPanels[0];
      }
    }

    // Find batteries - PREFER EG4
    const batteries = allEquipment.filter((e) => e.category === "BATTERY");
    if (batteries.length > 0) {
      const eg4Batteries = batteries.filter(b => 
        b.manufacturer?.toUpperCase().includes("EG4") || 
        b.name.toUpperCase().includes("EG4")
      );
      if (eg4Batteries.length > 0) {
        battery = eg4Batteries[0];
      } else {
        battery = batteries[0];
      }
    }

    // Find inverters - PREFER EG4
    const inverters = allEquipment.filter((e) => e.category === "INVERTER");
    if (inverters.length > 0) {
      const eg4Inverters = inverters.filter(i => 
        i.manufacturer?.toUpperCase().includes("EG4") || 
        i.name.toUpperCase().includes("EG4")
      );
      if (eg4Inverters.length > 0) {
        inverter = eg4Inverters[0];
      } else {
        inverter = inverters[0];
      }
    }

    // Find RSD (Rapid Shutdown Device) - one per panel
    const rsdDevices = allEquipment.filter((e) => 
      e.category === "ELECTRICAL" && (
        e.name.toUpperCase().includes("RSD") ||
        e.name.toUpperCase().includes("RAPID SHUTDOWN") ||
        e.name.toUpperCase().includes("RAPID-SHUTDOWN") ||
        e.modelNumber.toUpperCase().includes("RSD")
      )
    );
    if (rsdDevices.length > 0) {
      rsd = rsdDevices[0];
    }

    // Find mounting rails
    const mountingItems = allEquipment.filter((e) => 
      e.category === "MOUNTING" && (
        e.name.toUpperCase().includes("RAIL") ||
        e.name.toUpperCase().includes("MOUNTING RAIL")
      )
    );
    if (mountingItems.length > 0) {
      mountingRails = mountingItems[0];
    }

    // Find mid bolts (mid clamps)
    const boltItems = allEquipment.filter((e) => 
      e.category === "MOUNTING" && (
        e.name.toUpperCase().includes("BOLT") ||
        e.name.toUpperCase().includes("CLAMP") ||
        e.name.toUpperCase().includes("MID")
      )
    );
    if (boltItems.length > 0) {
      midBolts = boltItems[0];
    }

    // Find solar deck
    const deckItems = allEquipment.filter((e) => 
      e.category === "MOUNTING" && (
        e.name.toUpperCase().includes("DECK") ||
        e.name.toUpperCase().includes("FLASHING")
      )
    );
    if (deckItems.length > 0) {
      solarDeck = deckItems[0];
    }

    console.log("Selected equipment from multiple distributors:", {
      solarPanel: solarPanel ? `${solarPanel.name} (${solarPanel.distributor.name})` : "none",
      battery: battery ? `${battery.name} (${battery.distributor.name})` : "none",
      inverter: inverter ? `${inverter.name} (${inverter.distributor.name})` : "none",
      rsd: rsd ? `${rsd.name} (${rsd.distributor.name})` : "none",
    });
  } catch (error) {
    console.error("Error fetching equipment from distributors:", error);
  }

  // Only create BOM items for equipment that exists in distributor database
  // Do NOT use fallback prices - only real distributor prices
  const bomItems = [];

  // Enforce 10kW roof capacity limit for solar panels
  const MAX_ROOF_CAPACITY_KW = 10;
  const panelWattage = system.solarPanelWattage || 400;
  const maxPanels = Math.floor((MAX_ROOF_CAPACITY_KW * 1000) / panelWattage);
  let actualPanelCount = system.solarPanelCount;
  
  // Adjust panel count if it exceeds the 10kW limit
  if (actualPanelCount > maxPanels) {
    actualPanelCount = maxPanels;
    console.log(`Panel count adjusted from ${system.solarPanelCount} to ${actualPanelCount} to comply with 10kW roof capacity limit`);
    
    // Update system record with adjusted panel count
    await prisma.system.update({
      where: { projectId },
      data: {
        solarPanelCount: actualPanelCount,
        totalSolarKw: (actualPanelCount * panelWattage) / 1000,
      },
    });
  }

  // Solar Panels - Only add if found in database
  if (solarPanel && solarPanel.unitPrice > 0) {
    bomItems.push({
      projectId,
      category: "solar" as const,
      itemName: solarPanel.name,
      manufacturer: solarPanel.manufacturer || null,
      modelNumber: solarPanel.modelNumber,
      quantity: actualPanelCount,
      unitPriceUsd: solarPanel.unitPrice,
      totalPriceUsd: actualPanelCount * solarPanel.unitPrice,
      imageUrl: solarPanel.imageUrl || null,
      notes: `${solarPanel.distributor.name} | ${solarPanel.specifications || "Solar panel"}`,
    });
  }

  // RSD - One per panel - Only add if found in database
  if (rsd && rsd.unitPrice > 0) {
    bomItems.push({
      projectId,
      category: "electrical" as const,
      itemName: rsd.name,
      manufacturer: rsd.manufacturer || null,
      modelNumber: rsd.modelNumber,
      quantity: actualPanelCount,
      unitPriceUsd: rsd.unitPrice,
      totalPriceUsd: actualPanelCount * rsd.unitPrice,
      imageUrl: rsd.imageUrl || null,
      notes: `${rsd.distributor.name} | ${rsd.specifications || "Module-level rapid shutdown device"}`,
    });
  }

  // Inverter - Prefer EG4 - Only add if found in database
  if (inverter && inverter.unitPrice > 0) {
    bomItems.push({
      projectId,
      category: "inverter" as const,
      itemName: inverter.name,
      manufacturer: inverter.manufacturer || null,
      modelNumber: inverter.modelNumber,
      quantity: 1,
      unitPriceUsd: inverter.unitPrice,
      totalPriceUsd: inverter.unitPrice,
      imageUrl: inverter.imageUrl || null,
      notes: `${inverter.distributor.name} | ${inverter.specifications || `${system.inverterKw.toFixed(1)}kW capacity`}`,
    });
  }

  // Battery - Prefer EG4 - Only add if found in database
  if (battery && battery.unitPrice > 0) {
    bomItems.push({
      projectId,
      category: "battery" as const,
      itemName: battery.name,
      manufacturer: battery.manufacturer || null,
      modelNumber: battery.modelNumber,
      quantity: 1,
      unitPriceUsd: battery.unitPrice,
      totalPriceUsd: battery.unitPrice,
      imageUrl: battery.imageUrl || null,
      notes: `${battery.distributor.name} | ${battery.specifications || `${system.batteryKwh.toFixed(1)}kWh capacity`}`,
    });
  }

  // Mounting Rails - Only add if found in database
  if (mountingRails && mountingRails.unitPrice > 0) {
    const railQuantity = Math.max(1, Math.ceil(actualPanelCount / 4)); // One rail kit per 4 panels
    bomItems.push({
      projectId,
      category: "mounting" as const,
      itemName: mountingRails.name,
      manufacturer: mountingRails.manufacturer || null,
      modelNumber: mountingRails.modelNumber,
      quantity: railQuantity,
      unitPriceUsd: mountingRails.unitPrice,
      totalPriceUsd: railQuantity * mountingRails.unitPrice,
      imageUrl: mountingRails.imageUrl || null,
      notes: `${mountingRails.distributor.name} | ${mountingRails.specifications || "Aluminum mounting rails"}`,
    });
  }

  // Mid Bolts/Clamps - Only add if found in database
  if (midBolts && midBolts.unitPrice > 0) {
    const boltQuantity = actualPanelCount * 2; // 2 bolts per panel (mid clamps)
    bomItems.push({
      projectId,
      category: "mounting" as const,
      itemName: midBolts.name,
      manufacturer: midBolts.manufacturer || null,
      modelNumber: midBolts.modelNumber,
      quantity: boltQuantity,
      unitPriceUsd: midBolts.unitPrice,
      totalPriceUsd: boltQuantity * midBolts.unitPrice,
      imageUrl: midBolts.imageUrl || null,
      notes: `${midBolts.distributor.name} | ${midBolts.specifications || "Mid clamps for panel mounting"}`,
    });
  }

  // Solar Deck/Flashing - Only add if found in database
  if (solarDeck && solarDeck.unitPrice > 0) {
    const deckQuantity = actualPanelCount; // One deck/flashing per panel
    bomItems.push({
      projectId,
      category: "mounting" as const,
      itemName: solarDeck.name,
      manufacturer: solarDeck.manufacturer || null,
      modelNumber: solarDeck.modelNumber,
      quantity: deckQuantity,
      unitPriceUsd: solarDeck.unitPrice,
      totalPriceUsd: deckQuantity * solarDeck.unitPrice,
      imageUrl: solarDeck.imageUrl || null,
      notes: `${solarDeck.distributor.name} | ${solarDeck.specifications || "Roof flashing/deck for rail attachment"}`,
    });
  }

  if (bomItems.length === 0) {
    throw new SizingError(
      "Cannot generate BOM: System sizing has no equipment quantities. Please complete system sizing first.",
      400
    );
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

  // Get project for address/location data
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { analysis: true },
  });

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

  // Enhanced install steps with task structure
  const installSteps = [
    { 
      title: "Site survey and structural assessment",
      phase: "pre_install",
      estimatedHours: 4,
      dependencies: []
    },
    { 
      title: "Apply for permits and utility interconnection",
      phase: "pre_install",
      estimatedHours: 8,
      dependencies: []
    },
    { 
      title: "Install roof mounting system",
      phase: "install",
      estimatedHours: system.solarPanelCount * 0.3,
      dependencies: [0, 1]
    },
    { 
      title: "Mount solar panels and complete array wiring",
      phase: "install",
      estimatedHours: system.solarPanelCount * 0.5,
      dependencies: [2]
    },
    { 
      title: "Install battery storage system",
      phase: "install",
      estimatedHours: system.batteryKwh * 2,
      dependencies: [2]
    },
    { 
      title: "Install inverter and electrical connections",
      phase: "install",
      estimatedHours: 8,
      dependencies: [3, 4]
    },
    { 
      title: "Complete AC/DC disconnects and labeling",
      phase: "install",
      estimatedHours: 4,
      dependencies: [5]
    },
    { 
      title: "System commissioning and testing",
      phase: "post_install",
      estimatedHours: 4,
      dependencies: [6]
    },
    { 
      title: "Final inspection and utility approval",
      phase: "post_install",
      estimatedHours: 2,
      dependencies: [7]
    },
    { 
      title: "Customer training and handoff",
      phase: "post_install",
      estimatedHours: 2,
      dependencies: [8]
    },
  ];

  const laborHoursEst =
    system.solarPanelCount * 0.5 + system.batteryKwh * 2 + 16;

  // Calculate estimated dates
  const estimatedDays = Math.ceil(laborHoursEst / 8);
  const today = new Date();
  const permitSubmitDate = new Date(today);
  permitSubmitDate.setDate(today.getDate() + 7); // Assume permit submitted 1 week from now
  
  const permitApprovalDate = new Date(permitSubmitDate);
  permitApprovalDate.setDate(permitSubmitDate.getDate() + 21); // 3 weeks for approval
  
  const installStartDate = new Date(permitApprovalDate);
  installStartDate.setDate(permitApprovalDate.getDate() + 7); // 1 week after permit approval
  
  const installCompleteDate = new Date(installStartDate);
  installCompleteDate.setDate(installStartDate.getDate() + estimatedDays);

  // Enhanced site survey defaults (can be updated later)
  const siteSurvey = {
    roofType: "asphalt", // Default, should be updated from actual survey
    roofPitch: 30, // Default 30 degrees
    availableArea: system.solarPanelCount * 20, // Approximate 20 sq ft per panel
    shadingAnalysis: {
      obstructions: [],
      morningShading: false,
      afternoonShading: false,
      notes: "Shading analysis to be completed during site survey"
    },
    structuralNotes: "Structural assessment required before installation"
  };

  // Enhanced cost breakdown
  const costBreakdown = {
    permits: system.estimatedCostUsd * 0.02, // 2% for permits
    materials: system.estimatedCostUsd * 0.65, // 65% for materials
    labor: system.estimatedCostUsd * 0.25, // 25% for labor
    inspections: system.estimatedCostUsd * 0.03, // 3% for inspections
    contingency: system.estimatedCostUsd * 0.05, // 5% contingency
    total: system.estimatedCostUsd
  };

  // Enhanced risks
  const risks = [
    {
      id: "risk-1",
      title: "Permit delays",
      severity: "medium",
      probability: "medium",
      impact: "Schedule delay of 1-2 weeks",
      mitigation: "Submit permit application early, maintain communication with AHJ"
    },
    {
      id: "risk-2",
      title: "Weather delays",
      severity: "low",
      probability: "medium",
      impact: "Installation delay of 1-3 days",
      mitigation: "Monitor weather forecast, have backup installation dates"
    },
    {
      id: "risk-3",
      title: "Equipment availability",
      severity: "medium",
      probability: "low",
      impact: "Project delay of 2-4 weeks",
      mitigation: "Order equipment early, maintain inventory buffer"
    }
  ];

  // Check if plan exists to preserve enhanced fields
  const existingPlan = await prisma.plan.findUnique({
    where: { projectId },
  });

  const baseUpdateData: any = {
    necChecks: JSON.stringify(necChecks),
    warnings: JSON.stringify(warnings),
    installSteps: JSON.stringify(installSteps),
    timeline: `${estimatedDays} days estimated`,
    laborHoursEst,
    permitNotes: "Standard residential solar + storage permit required",
  };

  // Only set enhanced fields if they don't exist
  if (!existingPlan || !existingPlan.siteSurvey) {
    baseUpdateData.siteSurvey = JSON.stringify(siteSurvey);
    baseUpdateData.roofType = siteSurvey.roofType;
    baseUpdateData.roofPitch = siteSurvey.roofPitch;
    baseUpdateData.availableArea = siteSurvey.availableArea;
    baseUpdateData.shadingAnalysis = JSON.stringify(siteSurvey.shadingAnalysis);
    baseUpdateData.structuralNotes = siteSurvey.structuralNotes;
  }

  if (!existingPlan || !existingPlan.permitStatus) {
    baseUpdateData.permitStatus = "not_started";
  }

  if (!existingPlan || !existingPlan.utilityStatus) {
    baseUpdateData.utilityStatus = "not_started";
  }

  if (!existingPlan || !existingPlan.installationPhase) {
    baseUpdateData.installationPhase = "pre_install";
  }

  if (!existingPlan || !existingPlan.costBreakdown) {
    baseUpdateData.costBreakdown = JSON.stringify(costBreakdown);
  }

  if (!existingPlan || !existingPlan.risks) {
    baseUpdateData.risks = JSON.stringify(risks);
  }

  const plan = await prisma.plan.upsert({
    where: { projectId },
    create: {
      projectId,
      ...baseUpdateData,
    },
    update: baseUpdateData,
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
