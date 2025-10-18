import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SYSTEM_SIZING } from "@/lib/config";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, backupDurationHrs, criticalLoadKw, distributorId } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "Project ID is required" },
        { status: 400 },
      );
    }

    // Get analysis data
    const analysis = await prisma.analysis.findUnique({
      where: { projectId },
    });

    if (!analysis) {
      return NextResponse.json(
        { success: false, error: "Analysis must be completed first" },
        { status: 400 },
      );
    }

    // Calculate system sizing
    const monthlyUsageKwh = analysis.monthlyUsageKwh;
    const dailyUsageKwh = monthlyUsageKwh / 30;
    const solarSizingFactor = SYSTEM_SIZING.SOLAR_SIZING_FACTOR;

    const totalSolarKw =
      (dailyUsageKwh / SYSTEM_SIZING.PEAK_SUN_HOURS) * solarSizingFactor;
    const solarPanelWattage = SYSTEM_SIZING.SOLAR_PANEL_WATTAGE;
    const solarPanelCount = Math.ceil(
      (totalSolarKw * 1000) / solarPanelWattage,
    );

    // Battery sizing
    const backupHrs = backupDurationHrs || 24;
    const criticalLoad = criticalLoadKw || 3;
    const batteryKwh =
      criticalLoad * backupHrs * SYSTEM_SIZING.BATTERY_OVERHEAD;

    const inverterKw =
      Math.max(analysis.peakDemandKw || 5, criticalLoad) *
      SYSTEM_SIZING.INVERTER_MULTIPLIER;

    // Get actual equipment pricing from distributor
    let solarCostPerWatt = SYSTEM_SIZING.SOLAR_COST_PER_WATT;
    let batteryCostPerKwh = SYSTEM_SIZING.BATTERY_COST_PER_KWH;
    let inverterCostPerKw = SYSTEM_SIZING.INVERTER_COST_PER_KW;
    let installationCost = SYSTEM_SIZING.INSTALLATION_BASE_COST;

    if (distributorId) {
      try {
        // Fetch equipment from the selected distributor
        const equipment = await prisma.equipment.findMany({
          where: {
            distributorId,
            isActive: true,
            inStock: true,
          },
        });

        // Find solar panels (look for SOLAR category equipment)
        const solarPanels = equipment.filter(
          (item) => item.category === "SOLAR" || 
                   item.name.toLowerCase().includes("solar") ||
                   item.name.toLowerCase().includes("panel")
        );
        
        if (solarPanels.length > 0) {
          // Use average price of available solar panels
          const avgSolarPrice = solarPanels.reduce((sum, panel) => sum + panel.unitPrice, 0) / solarPanels.length;
          // Convert to cost per watt (assuming panels are ~400W)
          solarCostPerWatt = avgSolarPrice / solarPanelWattage;
        }

        // Find batteries
        const batteries = equipment.filter(
          (item) => item.category === "BATTERY" || 
                   item.name.toLowerCase().includes("battery") ||
                   item.name.toLowerCase().includes("lithium")
        );
        
        if (batteries.length > 0) {
          // Use average battery price - assuming typical 5kWh battery for cost/kWh calculation
          const avgBatteryPrice = batteries.reduce((sum, battery) => sum + battery.unitPrice, 0) / batteries.length;
          batteryCostPerKwh = avgBatteryPrice / 5; // Assume 5kWh per battery unit
        }

        // Find inverters
        const inverters = equipment.filter(
          (item) => item.category === "INVERTER" || 
                   item.name.toLowerCase().includes("inverter") ||
                   item.name.toLowerCase().includes("hybrid")
        );
        
        if (inverters.length > 0) {
          // Use average inverter price - assuming typical 5kW inverter for cost/kW calculation
          const avgInverterPrice = inverters.reduce((sum, inv) => sum + inv.unitPrice, 0) / inverters.length;
          inverterCostPerKw = avgInverterPrice / 5; // Assume 5kW per inverter unit
        }

      } catch (error) {
        console.error("Error fetching distributor equipment pricing:", error);
        // Fall back to default pricing if distributor lookup fails
      }
    }

    // Cost estimation using distributor pricing or fallback defaults

    const estimatedCostUsd =
      totalSolarKw * 1000 * solarCostPerWatt +
      batteryKwh * batteryCostPerKwh +
      inverterKw * inverterCostPerKw +
      installationCost;

    // Save system design
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

    // Update project status
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "sizing" },
    });

    // Include pricing source information in response
    const pricingInfo = {
      usedDistributorPricing: !!distributorId,
      distributorId: distributorId || null,
      pricingSource: distributorId ? "distributor" : "default_estimates",
    };

    return NextResponse.json({ 
      success: true, 
      system,
      pricing: pricingInfo
    });
  } catch (error) {
    console.error("Error sizing system:", error);
    return NextResponse.json(
      { success: false, error: "Failed to size system" },
      { status: 500 },
    );
  }
}
