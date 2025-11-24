/**
 * BOM Calculation Utilities
 * Ensures subtotals are correct and calculations reflect actual equipment
 */

import { prisma } from "@/lib/prisma";

export interface BOMItemValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  correctedItems: Array<{
    id: string;
    originalTotal: number;
    correctedTotal: number;
  }>;
}

export interface BOMSystemSpecs {
  totalSolarKw: number;
  totalBatteryKwh: number;
  totalInverterKw: number;
  solarPanelCount: number;
  actualEquipmentSpecs: {
    solarPanels: Array<{
      wattage: number;
      efficiency?: number;
      quantity: number;
    }>;
    batteries: Array<{
      capacityKwh: number;
      quantity: number;
    }>;
    inverters: Array<{
      capacityKw: number;
      efficiency?: number;
      quantity: number;
    }>;
  };
}

/**
 * Validate BOM item subtotals
 * Ensures totalPriceUsd = quantity × unitPriceUsd for each item
 */
export async function validateBOMSubtotals(
  projectId: string
): Promise<BOMItemValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const correctedItems: Array<{
    id: string;
    originalTotal: number;
    correctedTotal: number;
  }> = [];

  const bomItems = await prisma.bOMItem.findMany({
    where: { projectId },
  });

  for (const item of bomItems) {
    const expectedTotal = item.quantity * item.unitPriceUsd;
    const difference = Math.abs(item.totalPriceUsd - expectedTotal);

    // Allow small floating point differences (0.01)
    if (difference > 0.01) {
      errors.push(
        `Item "${item.itemName}": Total mismatch. Expected $${expectedTotal.toFixed(2)}, got $${item.totalPriceUsd.toFixed(2)}`
      );

      // Auto-correct the total
      await prisma.bOMItem.update({
        where: { id: item.id },
        data: { totalPriceUsd: expectedTotal },
      });

      correctedItems.push({
        id: item.id,
        originalTotal: item.totalPriceUsd,
        correctedTotal: expectedTotal,
      });
    }

    // Validate quantity
    if (item.quantity <= 0) {
      errors.push(`Item "${item.itemName}": Invalid quantity ${item.quantity}`);
    }

    // Validate prices
    if (item.unitPriceUsd < 0) {
      errors.push(`Item "${item.itemName}": Negative unit price`);
    }

    if (item.unitPriceUsd > 100000) {
      warnings.push(
        `Item "${item.itemName}": Unusually high unit price ($${item.unitPriceUsd.toFixed(2)})`
      );
    }
  }

  // Validate total cost
  const calculatedTotal = bomItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceUsd,
    0
  );

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    correctedItems,
  };
}

/**
 * Calculate actual system specifications from BOM items
 * Extracts real equipment specs and calculates actual system capacity
 */
export async function calculateSystemSpecsFromBOM(
  projectId: string
): Promise<BOMSystemSpecs | null> {
  const bomItems = await prisma.bOMItem.findMany({
    where: { projectId },
    orderBy: { category: "asc" },
  });

  if (bomItems.length === 0) {
    return null;
  }

  // Extract equipment by category
  const solarPanels = bomItems.filter(
    (item) =>
      item.category.toLowerCase().includes("solar") ||
      item.category === "SOLAR_PANEL"
  );

  const batteries = bomItems.filter(
    (item) =>
      item.category.toLowerCase().includes("battery") ||
      item.category === "BATTERY"
  );

  const inverters = bomItems.filter(
    (item) =>
      item.category.toLowerCase().includes("inverter") ||
      item.category === "INVERTER"
  );

  // Parse solar panel specs
  const solarSpecs = solarPanels.map((panel) => {
    // Try to extract wattage from model number, name, or notes
    const searchText = `${panel.modelNumber} ${panel.itemName} ${panel.notes || ""}`;
    
    // Pattern: "400W", "400 W", "400 watts"
    const wattageMatch = searchText.match(/(\d+)\s*w/i);
    const wattage = wattageMatch ? parseInt(wattageMatch[1]) : 400; // Default 400W

    // Try to extract efficiency
    const efficiencyMatch = searchText.match(/(\d+\.?\d*)%\s*efficiency/i);
    const efficiency = efficiencyMatch ? parseFloat(efficiencyMatch[1]) : undefined;

    return {
      wattage,
      efficiency,
      quantity: panel.quantity,
    };
  });

  // Parse battery specs
  const batterySpecs = batteries.map((battery) => {
    const searchText = `${battery.modelNumber} ${battery.itemName} ${battery.notes || ""}`;
    
    // Pattern: "10kWh", "10 kWh", "10 kilowatt-hours"
    const kwhMatch = searchText.match(/(\d+\.?\d*)\s*kwh/i);
    const capacityKwh = kwhMatch ? parseFloat(kwhMatch[1]) : 10; // Default 10kWh

    return {
      capacityKwh,
      quantity: battery.quantity,
    };
  });

  // Parse inverter specs
  const inverterSpecs = inverters.map((inverter) => {
    const searchText = `${inverter.modelNumber} ${inverter.itemName} ${inverter.notes || ""}`;
    
    // Pattern: "5kW", "5 kW", "5000W"
    const kwMatch = searchText.match(/(\d+\.?\d*)\s*kw/i);
    const capacityKw = kwMatch ? parseFloat(kwMatch[1]) : 5; // Default 5kW

    // Try to extract efficiency
    const efficiencyMatch = searchText.match(/(\d+\.?\d*)%\s*efficiency/i);
    const efficiency = efficiencyMatch ? parseFloat(efficiencyMatch[1]) : undefined;

    return {
      capacityKw,
      efficiency,
      quantity: inverter.quantity,
    };
  });

  // Calculate totals
  const totalSolarKw = solarSpecs.reduce(
    (sum, spec) => sum + (spec.wattage * spec.quantity) / 1000,
    0
  );

  const totalBatteryKwh = batterySpecs.reduce(
    (sum, spec) => sum + spec.capacityKwh * spec.quantity,
    0
  );

  const totalInverterKw = inverterSpecs.reduce(
    (sum, spec) => sum + spec.capacityKw * spec.quantity,
    0
  );

  const solarPanelCount = solarSpecs.reduce(
    (sum, spec) => sum + spec.quantity,
    0
  );

  return {
    totalSolarKw: parseFloat(totalSolarKw.toFixed(2)),
    totalBatteryKwh: parseFloat(totalBatteryKwh.toFixed(2)),
    totalInverterKw: parseFloat(totalInverterKw.toFixed(2)),
    solarPanelCount,
    actualEquipmentSpecs: {
      solarPanels: solarSpecs,
      batteries: batterySpecs,
      inverters: inverterSpecs,
    },
  };
}

/**
 * Recalculate and update System record based on actual BOM equipment
 * This ensures energy calculations reflect the actual equipment selected
 */
export async function recalculateSystemFromBOM(
  projectId: string
): Promise<{
  success: boolean;
  updated: boolean;
  systemSpecs: BOMSystemSpecs | null;
  error?: string;
}> {
  try {
    // Calculate actual specs from BOM
    const systemSpecs = await calculateSystemSpecsFromBOM(projectId);

    if (!systemSpecs) {
      return {
        success: false,
        updated: false,
        systemSpecs: null,
        error: "No BOM items found",
      };
    }

    // Update System record with actual BOM specs
    const system = await prisma.system.findUnique({
      where: { projectId },
    });

    if (!system) {
      return {
        success: false,
        updated: false,
        systemSpecs,
        error: "System record not found. Complete system sizing first.",
      };
    }

    // Calculate average panel wattage
    const totalWattage = systemSpecs.actualEquipmentSpecs.solarPanels.reduce(
      (sum, panel) => sum + panel.wattage * panel.quantity,
      0
    );
    const avgPanelWattage = systemSpecs.solarPanelCount > 0
      ? Math.round(totalWattage / systemSpecs.solarPanelCount)
      : 400;

    // Enforce 10kW limit when updating system from BOM
    const MAX_ROOF_CAPACITY_KW = 10;
    let finalPanelCount = systemSpecs.solarPanelCount;
    let finalTotalKw = systemSpecs.totalSolarKw;
    
    if (finalTotalKw > MAX_ROOF_CAPACITY_KW) {
      finalTotalKw = MAX_ROOF_CAPACITY_KW;
      finalPanelCount = Math.floor((MAX_ROOF_CAPACITY_KW * 1000) / avgPanelWattage);
      console.log(`System panel count adjusted from ${systemSpecs.solarPanelCount} to ${finalPanelCount} to comply with 10kW roof capacity limit`);
    }

    // Update System record
    await prisma.system.update({
      where: { projectId },
      data: {
        totalSolarKw: finalTotalKw,
        batteryKwh: systemSpecs.totalBatteryKwh,
        inverterKw: systemSpecs.totalInverterKw,
        solarPanelCount: finalPanelCount,
        solarPanelWattage: avgPanelWattage,
      },
    });

    return {
      success: true,
      updated: true,
      systemSpecs,
    };
  } catch (error) {
    console.error("Error recalculating system from BOM:", error);
    return {
      success: false,
      updated: false,
      systemSpecs: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get total BOM cost with validation
 */
export async function getBOMTotalCost(projectId: string): Promise<{
  totalCost: number;
  itemCount: number;
  isValid: boolean;
  validation: BOMItemValidation;
}> {
  const validation = await validateBOMSubtotals(projectId);

  const bomItems = await prisma.bOMItem.findMany({
    where: { projectId },
  });

  const totalCost = bomItems.reduce(
    (sum, item) => sum + item.totalPriceUsd,
    0
  );

  return {
    totalCost: parseFloat(totalCost.toFixed(2)),
    itemCount: bomItems.length,
    isValid: validation.isValid,
    validation,
  };
}


