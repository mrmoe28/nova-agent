/**
 * Energy Calculations from BOM Equipment
 * Recalculates energy production based on actual BOM equipment specs
 */

import { prisma } from "@/lib/prisma";
import { calculateSystemSpecsFromBOM } from "./bom-calculations";

/**
 * Calculate annual energy production from actual BOM equipment
 * Uses actual panel wattage, efficiency, and system configuration
 */
export async function calculateEnergyProductionFromBOM(
  projectId: string
): Promise<{
  annualProductionKwh: number;
  monthlyProductionKwh: number;
  dailyProductionKwh: number;
  systemCapacityKw: number;
  capacityFactor: number;
  error?: string;
}> {
  try {
    // Get actual system specs from BOM
    const systemSpecs = await calculateSystemSpecsFromBOM(projectId);

    if (!systemSpecs) {
      return {
        annualProductionKwh: 0,
        monthlyProductionKwh: 0,
        dailyProductionKwh: 0,
        systemCapacityKw: 0,
        capacityFactor: 0,
        error: "No BOM items found",
      };
    }

    const systemCapacityKw = systemSpecs.totalSolarKw;

    // Get project location for solar irradiance
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { analysis: true },
    });

    // Default capacity factor (20% for solar)
    // This can be improved with location-based calculations
    let capacityFactor = 0.20;

    // Adjust capacity factor based on average panel efficiency if available
    const solarPanels = systemSpecs.actualEquipmentSpecs.solarPanels;
    if (solarPanels.length > 0) {
      const panelsWithEfficiency = solarPanels.filter((p) => p.efficiency !== undefined);
      if (panelsWithEfficiency.length > 0) {
        const avgEfficiency = panelsWithEfficiency.reduce(
          (sum, p) => sum + (p.efficiency || 0),
          0
        ) / panelsWithEfficiency.length;
        
        // Higher efficiency panels typically have better capacity factors
        // Adjust: 20% base + (efficiency - 20%) * 0.1
        if (avgEfficiency > 20) {
          capacityFactor = 0.20 + (avgEfficiency - 20) * 0.001;
          capacityFactor = Math.min(capacityFactor, 0.25); // Cap at 25%
        }
      }
    }

    // Calculate annual production
    // Annual kWh = System Capacity (kW) × Capacity Factor × Hours per Year (8760)
    const annualProductionKwh = systemCapacityKw * capacityFactor * 8760;
    const monthlyProductionKwh = annualProductionKwh / 12;
    const dailyProductionKwh = annualProductionKwh / 365;

    return {
      annualProductionKwh: parseFloat(annualProductionKwh.toFixed(2)),
      monthlyProductionKwh: parseFloat(monthlyProductionKwh.toFixed(2)),
      dailyProductionKwh: parseFloat(dailyProductionKwh.toFixed(2)),
      systemCapacityKw,
      capacityFactor: parseFloat(capacityFactor.toFixed(3)),
    };
  } catch (error) {
    console.error("Error calculating energy production from BOM:", error);
    return {
      annualProductionKwh: 0,
      monthlyProductionKwh: 0,
      dailyProductionKwh: 0,
      systemCapacityKw: 0,
      capacityFactor: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Calculate energy savings based on actual BOM equipment
 * Compares actual production to current usage
 */
export async function calculateEnergySavingsFromBOM(
  projectId: string
): Promise<{
  annualSavingsUsd: number;
  monthlySavingsUsd: number;
  energyOffsetPercentage: number;
  paybackPeriodYears: number;
  error?: string;
}> {
  try {
    // Get energy production from BOM
    const production = await calculateEnergyProductionFromBOM(projectId);

    if (production.error) {
      return {
        annualSavingsUsd: 0,
        monthlySavingsUsd: 0,
        energyOffsetPercentage: 0,
        paybackPeriodYears: 0,
        error: production.error,
      };
    }

    // Get current usage and costs
    const analysis = await prisma.analysis.findUnique({
      where: { projectId },
    });

    if (!analysis) {
      return {
        annualSavingsUsd: 0,
        monthlySavingsUsd: 0,
        energyOffsetPercentage: 0,
        paybackPeriodYears: 0,
        error: "Analysis not found",
      };
    }

    // Get system cost
    const bomItems = await prisma.bOMItem.findMany({
      where: { projectId },
    });
    const systemCost = bomItems.reduce(
      (sum, item) => sum + item.totalPriceUsd,
      0
    );

    // Calculate energy offset
    const annualUsageKwh = analysis.monthlyUsageKwh * 12;
    const energyOffsetPercentage =
      annualUsageKwh > 0
        ? (production.annualProductionKwh / annualUsageKwh) * 100
        : 0;

    // Calculate savings
    // Savings = (Production × Cost per kWh) - (Excess Production × Export Rate)
    // Simplified: Production × Cost per kWh (assuming net metering)
    const annualSavingsUsd =
      production.annualProductionKwh * analysis.averageCostPerKwh;
    const monthlySavingsUsd = annualSavingsUsd / 12;

    // Calculate payback period
    // Net cost after 30% federal tax credit
    const netSystemCost = systemCost * 0.7;
    const paybackPeriodYears =
      annualSavingsUsd > 0 ? netSystemCost / annualSavingsUsd : 0;

    return {
      annualSavingsUsd: parseFloat(annualSavingsUsd.toFixed(2)),
      monthlySavingsUsd: parseFloat(monthlySavingsUsd.toFixed(2)),
      energyOffsetPercentage: parseFloat(energyOffsetPercentage.toFixed(1)),
      paybackPeriodYears: parseFloat(paybackPeriodYears.toFixed(1)),
    };
  } catch (error) {
    console.error("Error calculating energy savings from BOM:", error);
    return {
      annualSavingsUsd: 0,
      monthlySavingsUsd: 0,
      energyOffsetPercentage: 0,
      paybackPeriodYears: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update Analysis record with recalculated energy production
 */
export async function updateAnalysisFromBOM(projectId: string): Promise<{
  success: boolean;
  updated: boolean;
  error?: string;
}> {
  try {
    const production = await calculateEnergyProductionFromBOM(projectId);

    if (production.error) {
      return {
        success: false,
        updated: false,
        error: production.error,
      };
    }

    const analysis = await prisma.analysis.findUnique({
      where: { projectId },
    });

    if (!analysis) {
      return {
        success: false,
        updated: false,
        error: "Analysis not found",
      };
    }

    // Calculate energy offset
    const annualUsageKwh = analysis.monthlyUsageKwh * 12;
    const energyOffsetPercentage =
      annualUsageKwh > 0
        ? (production.annualProductionKwh / annualUsageKwh) * 100
        : 0;

    // Calculate estimated savings
    const estimatedAnnualSavingsUsd =
      production.annualProductionKwh * analysis.averageCostPerKwh;

    // Update Analysis record
    await prisma.analysis.update({
      where: { projectId },
      data: {
        annualSolarProductionKwh: production.annualProductionKwh,
        energyOffsetPercentage: parseFloat(energyOffsetPercentage.toFixed(1)),
        estimatedAnnualSavingsUsd: parseFloat(estimatedAnnualSavingsUsd.toFixed(2)),
      },
    });

    return {
      success: true,
      updated: true,
    };
  } catch (error) {
    console.error("Error updating analysis from BOM:", error);
    return {
      success: false,
      updated: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

