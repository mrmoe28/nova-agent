/**
 * Quick Estimate API Route
 * POST /api/quick-estimate
 * Provides instant solar system estimates without full project creation
 */

import { NextRequest, NextResponse } from 'next/server';
import { SYSTEM_SIZING, FINANCIAL_PARAMETERS } from '@/lib/config';
import { productionModelingService } from '@/lib/production-model';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, monthlyBill, monthlyUsageKwh } = body;

    if (!address || !monthlyBill || !monthlyUsageKwh) {
      return NextResponse.json(
        { error: 'Address, monthly bill, and monthly usage are required' },
        { status: 400 }
      );
    }

    // Parse location from address (simplified - in production would use geocoding)
    const location = {
      latitude: 33.7490, // Default to Atlanta, GA
      longitude: -84.3880,
    };

    // Calculate system sizing
    const dailyUsageKwh = monthlyUsageKwh / 30;
    const annualUsageKwh = monthlyUsageKwh * 12;
    const totalSolarKw = (dailyUsageKwh / SYSTEM_SIZING.PEAK_SUN_HOURS) * SYSTEM_SIZING.SOLAR_SIZING_FACTOR;

    // Apply 10kW residential limit
    const MAX_ROOF_CAPACITY_KW = 10;
    const solarSizeKw = Math.min(totalSolarKw, MAX_ROOF_CAPACITY_KW);

    const panelWattage = SYSTEM_SIZING.SOLAR_PANEL_WATTAGE;
    const panelCount = Math.ceil((solarSizeKw * 1000) / panelWattage);
    const actualSolarKw = (panelCount * panelWattage) / 1000;

    // Battery sizing
    const batterySizeKwh = Math.max(5, Math.min(40, dailyUsageKwh * 0.4 * SYSTEM_SIZING.BATTERY_OVERHEAD));

    // Inverter sizing
    const inverterSizeKw = actualSolarKw * SYSTEM_SIZING.INVERTER_MULTIPLIER;

    // Get production estimate
    const systemConfiguration = {
      tilt: location.latitude,
      azimuth: 180,
      trackingType: 'fixed' as const,
      moduleType: 'standard' as const,
      installationType: 'roof_mount' as const,
      shadingLoss: 3,
      soilingLoss: 2,
      dcLosses: 3,
      acLosses: 3,
      inverterEfficiency: 96, // Modern inverters are typically 96-98% efficient
    };

    const productionEstimate = await productionModelingService.calculateProductionEstimate(
      'quick-estimate', // temporary projectId for quick estimates
      actualSolarKw,
      systemConfiguration,
      location.latitude,
      location.longitude,
      'pvwatts'
    );

    const annualProductionKwh = productionEstimate.annualProduction;
    const offsetPercentage = (annualProductionKwh / annualUsageKwh) * 100;

    // Financial calculations
    const systemCost = calculateSystemCost(actualSolarKw, batterySizeKwh, inverterSizeKw);
    const netCostAfterTaxCredit = systemCost * (1 - FINANCIAL_PARAMETERS.federalTaxCredit);

    const annualBill = monthlyBill * 12;
    const averageRate = annualBill / annualUsageKwh;
    const annualSavings = Math.min(annualProductionKwh * averageRate, annualBill);

    const paybackPeriod = netCostAfterTaxCredit / annualSavings;

    // Calculate 25-year savings
    let totalSavings25Year = 0;
    for (let year = 1; year <= 25; year++) {
      const degradationFactor = Math.pow(1 - productionEstimate.annualDegradation, year - 1);
      const yearSavings = annualSavings * degradationFactor *
        Math.pow(1 + FINANCIAL_PARAMETERS.utilityEscalation, year - 1);
      totalSavings25Year += yearSavings;
    }

    const roi25Year = ((totalSavings25Year - netCostAfterTaxCredit) / netCostAfterTaxCredit) * 100;

    return NextResponse.json({
      success: true,
      estimate: {
        address,
        systemSizeKw: actualSolarKw,
        panelCount,
        batterySizeKwh: Math.round(batterySizeKwh),
        inverterSizeKw,
        annualProductionKwh: Math.round(annualProductionKwh),
        offsetPercentage: Math.round(offsetPercentage),
        systemCost: Math.round(systemCost),
        netCostAfterTaxCredit: Math.round(netCostAfterTaxCredit),
        annualSavings: Math.round(annualSavings),
        paybackPeriod,
        roi25Year,
        totalSavings25Year: Math.round(totalSavings25Year),
      },
    });
  } catch (error) {
    console.error('Quick estimate error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate estimate',
      },
      { status: 500 }
    );
  }
}

function calculateSystemCost(solarKw: number, batteryKwh: number, inverterKw: number): number {
  const solarCost = solarKw * 1000 * SYSTEM_SIZING.SOLAR_COST_PER_WATT;
  const batteryCost = batteryKwh * SYSTEM_SIZING.BATTERY_COST_PER_KWH;
  const inverterCost = inverterKw * SYSTEM_SIZING.INVERTER_COST_PER_KW;
  const installationCost = SYSTEM_SIZING.INSTALLATION_BASE_COST;

  return solarCost + batteryCost + inverterCost + installationCost;
}
