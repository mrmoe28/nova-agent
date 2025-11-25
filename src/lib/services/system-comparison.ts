/**
 * System Comparison Service
 * Generates multiple system sizing options (small/medium/large) with ROI comparison
 */

import { SizingRecommendation, ProductionEstimate, ParsedBillData } from '@/types/energy';
import { productionModelingService } from '@/lib/production-model';
import { SYSTEM_SIZING, FINANCIAL_PARAMETERS } from '@/lib/config';
import { prisma } from '@/lib/prisma';

export interface SystemComparisonOption {
  size: 'small' | 'medium' | 'large';
  label: string;
  description: string;
  solarSizeKw: number;
  panelCount: number;
  batterySizeKwh: number;
  inverterSizeKw: number;

  // Production estimates
  annualProductionKwh: number;
  offsetPercentage: number;

  // Financial analysis
  systemCost: number;
  netCostAfterTaxCredit: number;
  annualSavings: number;
  paybackPeriod: number;
  roi25Year: number;
  netPresentValue: number;

  // Monthly analysis
  monthlyProduction: number[];
  newMonthlyBills: number[];

  // Comparative metrics
  costPerWatt: number;
  savingsPerDollarInvested: number;
  yearlyRoi: number;
}

export interface SystemComparisonResult {
  projectId: string;
  options: [SystemComparisonOption, SystemComparisonOption, SystemComparisonOption];
  recommendedOption: 'small' | 'medium' | 'large';
  comparisonMetrics: {
    annualUsageKwh: number;
    currentAnnualBillCost: number;
    averageElectricityRate: number;
    location: { latitude: number; longitude: number };
  };
  generatedAt: Date;
}

class SystemComparisonService {
  /**
   * Generate three system size options with comprehensive comparison
   */
  async generateComparison(projectId: string): Promise<SystemComparisonResult> {
    // Get project data
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        analysis: true,
        bills: true,
      },
    });

    if (!project || !project.analysis) {
      throw new Error('Project analysis not found');
    }

    const { analysis } = project;
    const location = {
      latitude: analysis.latitude || 33.7490, // Default to Atlanta
      longitude: analysis.longitude || -84.3880,
    };

    // Calculate base metrics
    const annualUsageKwh = analysis.monthlyUsageKwh * 12;
    const currentAnnualBillCost = analysis.annualCostUsd;
    const averageElectricityRate = currentAnnualBillCost / annualUsageKwh;

    // Generate three sizing scenarios
    const scenarios = [
      { size: 'small' as const, offsetTarget: 0.75, label: '75% Offset', description: 'Budget-friendly option with faster payback' },
      { size: 'medium' as const, offsetTarget: 1.0, label: '100% Offset', description: 'Eliminate your electric bill entirely' },
      { size: 'large' as const, offsetTarget: 1.25, label: '125% Offset', description: 'Maximum production with net metering credits' },
    ];

    const options = await Promise.all(
      scenarios.map(scenario => this.generateSizingOption(
        projectId,
        scenario.size,
        scenario.label,
        scenario.description,
        scenario.offsetTarget,
        annualUsageKwh,
        currentAnnualBillCost,
        averageElectricityRate,
        location
      ))
    );

    // Determine recommended option based on best ROI
    const recommendedOption = this.determineRecommendedOption(options);

    return {
      projectId,
      options: options as [SystemComparisonOption, SystemComparisonOption, SystemComparisonOption],
      recommendedOption,
      comparisonMetrics: {
        annualUsageKwh,
        currentAnnualBillCost,
        averageElectricityRate,
        location,
      },
      generatedAt: new Date(),
    };
  }

  /**
   * Generate a single sizing option
   */
  private async generateSizingOption(
    projectId: string,
    size: 'small' | 'medium' | 'large',
    label: string,
    description: string,
    offsetTarget: number,
    annualUsageKwh: number,
    currentAnnualBillCost: number,
    averageElectricityRate: number,
    location: { latitude: number; longitude: number }
  ): Promise<SystemComparisonOption> {
    // Calculate system size
    const dailyUsageKwh = annualUsageKwh / 365;
    const targetSolarKw = (dailyUsageKwh / SYSTEM_SIZING.PEAK_SUN_HOURS) * offsetTarget;

    // Apply 10kW residential limit
    const MAX_ROOF_CAPACITY_KW = 10;
    const solarSizeKw = Math.min(targetSolarKw, MAX_ROOF_CAPACITY_KW);

    const panelWattage = SYSTEM_SIZING.SOLAR_PANEL_WATTAGE;
    const panelCount = Math.ceil((solarSizeKw * 1000) / panelWattage);
    const actualSolarKw = (panelCount * panelWattage) / 1000;

    // Battery sizing based on system size
    const batterySizeKwh = this.calculateBatterySize(size, dailyUsageKwh);

    // Inverter sizing
    const inverterKw = actualSolarKw * SYSTEM_SIZING.INVERTER_MULTIPLIER;

    // Get production estimate from PVWatts
    const systemConfiguration = {
      tilt: location.latitude,
      azimuth: 180, // South-facing
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
      projectId,
      actualSolarKw,
      systemConfiguration,
      location.latitude,
      location.longitude,
      'pvwatts'
    );

    const annualProductionKwh = productionEstimate.annualProduction;
    const offsetPercentage = (annualProductionKwh / annualUsageKwh) * 100;

    // Financial calculations
    const systemCost = this.calculateSystemCost(actualSolarKw, batterySizeKwh, inverterKw);
    const netCostAfterTaxCredit = systemCost * (1 - FINANCIAL_PARAMETERS.federalTaxCredit);

    const annualSavings = this.calculateAnnualSavings(
      annualProductionKwh,
      annualUsageKwh,
      currentAnnualBillCost,
      averageElectricityRate
    );

    const paybackPeriod = netCostAfterTaxCredit / annualSavings;
    const roi25Year = this.calculate25YearROI(
      netCostAfterTaxCredit,
      annualSavings,
      productionEstimate.annualDegradation
    );
    const netPresentValue = this.calculateNPV(
      netCostAfterTaxCredit,
      annualSavings,
      FINANCIAL_PARAMETERS.discountRate,
      25
    );

    // Monthly analysis
    const newMonthlyBills = this.calculateNewMonthlyBills(
      productionEstimate.monthlyProduction,
      annualUsageKwh,
      currentAnnualBillCost
    );

    // Comparative metrics
    const costPerWatt = systemCost / (actualSolarKw * 1000);
    const savingsPerDollarInvested = (annualSavings * 25) / netCostAfterTaxCredit;
    const yearlyRoi = (roi25Year / 25) / 100;

    return {
      size,
      label,
      description,
      solarSizeKw: actualSolarKw,
      panelCount,
      batterySizeKwh,
      inverterSizeKw: inverterKw,
      annualProductionKwh,
      offsetPercentage,
      systemCost,
      netCostAfterTaxCredit,
      annualSavings,
      paybackPeriod,
      roi25Year,
      netPresentValue,
      monthlyProduction: productionEstimate.monthlyProduction,
      newMonthlyBills,
      costPerWatt,
      savingsPerDollarInvested,
      yearlyRoi,
    };
  }

  /**
   * Calculate battery size based on system option
   */
  private calculateBatterySize(size: 'small' | 'medium' | 'large', dailyUsageKwh: number): number {
    const criticalDailyKwh = dailyUsageKwh * 0.4; // 40% for critical loads

    switch (size) {
      case 'small':
        return Math.max(5, criticalDailyKwh * 0.5 * SYSTEM_SIZING.BATTERY_OVERHEAD); // Half-day backup
      case 'medium':
        return Math.max(10, criticalDailyKwh * 1.0 * SYSTEM_SIZING.BATTERY_OVERHEAD); // Full-day backup
      case 'large':
        return Math.min(40, criticalDailyKwh * 2.0 * SYSTEM_SIZING.BATTERY_OVERHEAD); // Two-day backup
    }
  }

  /**
   * Calculate total system cost
   */
  private calculateSystemCost(solarKw: number, batteryKwh: number, inverterKw: number): number {
    const solarCost = solarKw * 1000 * SYSTEM_SIZING.SOLAR_COST_PER_WATT;
    const batteryCost = batteryKwh * SYSTEM_SIZING.BATTERY_COST_PER_KWH;
    const inverterCost = inverterKw * SYSTEM_SIZING.INVERTER_COST_PER_KW;
    const installationCost = SYSTEM_SIZING.INSTALLATION_BASE_COST;

    return solarCost + batteryCost + inverterCost + installationCost;
  }

  /**
   * Calculate annual savings with net metering
   */
  private calculateAnnualSavings(
    annualProductionKwh: number,
    annualUsageKwh: number,
    currentAnnualBillCost: number,
    averageElectricityRate: number
  ): number {
    if (annualProductionKwh >= annualUsageKwh) {
      // Full offset - save entire bill plus net metering credits
      const excessKwh = annualProductionKwh - annualUsageKwh;
      const netMeteringCredit = excessKwh * averageElectricityRate * 0.7; // 70% credit for excess
      return currentAnnualBillCost + netMeteringCredit;
    } else {
      // Partial offset
      const offsetPercentage = annualProductionKwh / annualUsageKwh;
      return currentAnnualBillCost * offsetPercentage;
    }
  }

  /**
   * Calculate 25-year ROI with degradation
   */
  private calculate25YearROI(
    netCost: number,
    annualSavings: number,
    annualDegradation: number
  ): number {
    let totalSavings = 0;
    for (let year = 1; year <= 25; year++) {
      const degradationFactor = Math.pow(1 - annualDegradation, year - 1);
      const yearSavings = annualSavings * degradationFactor * Math.pow(1 + FINANCIAL_PARAMETERS.utilityEscalation, year - 1);
      totalSavings += yearSavings;
    }

    return ((totalSavings - netCost) / netCost) * 100;
  }

  /**
   * Calculate Net Present Value
   */
  private calculateNPV(
    initialInvestment: number,
    annualSavings: number,
    discountRate: number,
    years: number
  ): number {
    let npv = -initialInvestment;

    for (let year = 1; year <= years; year++) {
      const yearSavings = annualSavings * Math.pow(1 + FINANCIAL_PARAMETERS.utilityEscalation, year - 1);
      npv += yearSavings / Math.pow(1 + discountRate, year);
    }

    return npv;
  }

  /**
   * Calculate new monthly bills after solar
   */
  private calculateNewMonthlyBills(
    monthlyProduction: number[],
    annualUsageKwh: number,
    currentAnnualBillCost: number
  ): number[] {
    const monthlyUsageKwh = annualUsageKwh / 12;
    const averageRate = currentAnnualBillCost / annualUsageKwh;
    const fixedCharge = 12; // Typical utility fixed charge

    return monthlyProduction.map(production => {
      const netUsage = Math.max(0, monthlyUsageKwh - production);
      return netUsage * averageRate + fixedCharge;
    });
  }

  /**
   * Determine recommended option based on best overall value
   */
  private determineRecommendedOption(
    options: SystemComparisonOption[]
  ): 'small' | 'medium' | 'large' {
    // Score each option based on multiple factors
    const scores = options.map(option => {
      const paybackScore = Math.max(0, 100 - (option.paybackPeriod * 5)); // Lower is better
      const roiScore = Math.min(100, option.roi25Year / 2); // Higher is better
      const offsetScore = Math.min(100, option.offsetPercentage); // Prefer 100% offset

      return {
        size: option.size,
        totalScore: (paybackScore * 0.3) + (roiScore * 0.4) + (offsetScore * 0.3),
      };
    });

    const bestOption = scores.reduce((best, current) =>
      current.totalScore > best.totalScore ? current : best
    );

    return bestOption.size;
  }
}

export const systemComparisonService = new SystemComparisonService();
