/**
 * Enhanced System Sizing Service
 * Integrates load profiles, production modeling, equipment catalogs, and financial analysis
 * for precision system sizing with comprehensive validation and optimization
 */

import {
  SizingInputs,
  SizingRecommendation,
  LoadProfile,
  ProductionEstimate,
  SystemConfiguration,
  EquipmentCatalogItem,
  CriticalLoadProfile,
  ParsedBillData,
  Tariff,
  EnergyAnalysisError
} from '@/types/energy';
import { logger } from './logger';
import { prisma } from './prisma';
import { Prisma } from '@prisma/client';
import { productionModelingService } from './production-model';
import { tariffService } from './tariff-service';
import { v4 as uuidv4 } from 'uuid';

// Configuration constants
const SIZING_CONSTRAINTS = {
  minSystemSizeKw: 1,
  maxSystemSizeKw: 100,
  minBatterySizeKwh: 5,
  maxBatterySizeKwh: 200,
  maxInverterSizeKw: 50,
  minSolarToInverterRatio: 1.1,
  maxSolarToInverterRatio: 1.5
};

const FINANCIAL_PARAMETERS = {
  federalTaxCredit: 0.30, // 30% ITC
  discountRate: 0.06, // 6% for NPV calculations
  systemLifeYears: 25,
  utilityEscalation: 0.025, // 2.5% annual utility rate increase
  oandmCostPerKw: 20 // Annual O&M cost per kW
};

/**
 * Load Profile Analysis Service
 */
class LoadProfileAnalyzer {
  /**
   * Create load profile from bill data
   */
  async createLoadProfileFromBills(
    projectId: string,
    bills: ParsedBillData[]
  ): Promise<LoadProfile> {
    try {
      // Sort bills by date
      const sortedBills = bills.sort((a, b) => a.billDate.getTime() - b.billDate.getTime());
      
      // Create monthly data points
      const dataPoints = sortedBills.map(bill => ({
        timestamp: bill.billDate,
        kwhUsage: bill.totalKwh,
        kwDemand: bill.peakKw || 0,
        temperature: undefined, // Would extract if available
        isEstimated: bill.billingPeriod.isEstimated
      }));

      // Calculate annual metrics
      const annualKwh = this.calculateAnnualUsage(sortedBills);
      const peakKw = Math.max(...sortedBills.map(bill => bill.peakKw || 0));
      const loadFactor = this.calculateLoadFactor(annualKwh, peakKw);

      // Calculate time-of-use breakdown if available
      const touBreakdown = this.analyzeTOUUsage(sortedBills);

      const loadProfile: LoadProfile = {
        id: uuidv4(),
        projectId,
        profileType: 'monthly',
        dataPoints,
        annualKwh,
        peakKw,
        loadFactor,
        onPeakKwh: touBreakdown.onPeak,
        midPeakKwh: touBreakdown.midPeak,
        offPeakKwh: touBreakdown.offPeak,
        dataCompleteness: sortedBills.length / 12,
        estimationMethod: 'bill_disaggregation',
        confidence: this.calculateProfileConfidence(sortedBills),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return loadProfile;

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId,
        billCount: bills.length
      }, 'Failed to create load profile from bills');
      throw error;
    }
  }

  /**
   * Calculate annualized usage from partial bill data
   */
  private calculateAnnualUsage(bills: ParsedBillData[]): number {
    if (bills.length === 0) return 0;

    const totalUsage = bills.reduce((sum, bill) => sum + bill.totalKwh, 0);
    const totalDays = bills.reduce((sum, bill) => sum + bill.billingPeriod.daysInPeriod, 0);
    const averageDailyUsage = totalUsage / totalDays;
    
    return averageDailyUsage * 365;
  }

  /**
   * Calculate load factor (average load / peak load)
   */
  private calculateLoadFactor(annualKwh: number, peakKw: number): number {
    if (peakKw === 0) return 0;
    
    const averageKw = annualKwh / 8760; // Annual kWh / hours per year
    return Math.min(averageKw / peakKw, 1);
  }

  /**
   * Analyze time-of-use patterns if available
   */
  private analyzeTOUUsage(bills: ParsedBillData[]): {
    onPeak?: number;
    midPeak?: number;
    offPeak?: number;
  } {
    const onPeakTotal = bills.reduce((sum, bill) => sum + (bill.onPeakKwh || 0), 0);
    const midPeakTotal = bills.reduce((sum, bill) => sum + (bill.midPeakKwh || 0), 0);
    const offPeakTotal = bills.reduce((sum, bill) => sum + (bill.offPeakKwh || 0), 0);

    return {
      onPeak: onPeakTotal > 0 ? onPeakTotal * (12 / bills.length) : undefined,
      midPeak: midPeakTotal > 0 ? midPeakTotal * (12 / bills.length) : undefined,
      offPeak: offPeakTotal > 0 ? offPeakTotal * (12 / bills.length) : undefined
    };
  }

  /**
   * Calculate confidence in load profile accuracy
   */
  private calculateProfileConfidence(bills: ParsedBillData[]): number {
    let confidence = 0.5; // Base confidence

    // More bills = higher confidence
    const completeness = bills.length / 12;
    confidence += completeness * 0.3;

    // Consistent usage patterns increase confidence
    const usageVariation = this.calculateUsageVariation(bills);
    if (usageVariation < 0.3) confidence += 0.1; // Low variation is good
    if (usageVariation > 0.7) confidence -= 0.1; // High variation reduces confidence

    // Estimated readings reduce confidence
    const estimatedCount = bills.filter(bill => bill.billingPeriod.isEstimated).length;
    confidence -= (estimatedCount / bills.length) * 0.1;

    return Math.max(0.2, Math.min(1, confidence));
  }

  /**
   * Calculate usage variation coefficient
   */
  private calculateUsageVariation(bills: ParsedBillData[]): number {
    if (bills.length < 2) return 0;

    const usages = bills.map(bill => bill.totalKwh);
    const mean = usages.reduce((sum, usage) => sum + usage, 0) / usages.length;
    const variance = usages.reduce((sum, usage) => sum + Math.pow(usage - mean, 2), 0) / usages.length;
    const stdDev = Math.sqrt(variance);

    return mean > 0 ? stdDev / mean : 0;
  }
}

/**
 * Equipment Selection Service
 */
class EquipmentSelector {
  /**
   * Select optimal solar panels for system size
   */
  async selectSolarPanels(
    systemSizeKw: number,
    preferences?: {
      manufacturer?: string;
      efficiency?: 'standard' | 'premium';
      budget?: number;
    }
  ): Promise<{
    equipment: EquipmentCatalogItem;
    panelCount: number;
    actualSystemSizeKw: number;
  }> {
    try {
      // Search for suitable solar panels
      const panels = await prisma.equipmentCatalog.findMany({
        where: {
          category: 'solar_panel',
          necCompliant: true,
          availability: { in: ['in_stock', 'limited'] },
          ...(preferences?.manufacturer && {
            manufacturer: { contains: preferences.manufacturer, mode: 'insensitive' }
          })
        },
        orderBy: [
          { currentPrice: 'asc' }, // Prefer lower cost
          { specifications: 'desc' } // Prefer higher efficiency (simplified)
        ],
        take: 10
      });

      if (panels.length === 0) {
        throw new Error('No suitable solar panels found in catalog');
      }

      // Select best panel based on criteria
      let selectedPanel = panels[0];
      
      if (preferences?.efficiency === 'premium') {
        // Find highest efficiency panel
        selectedPanel = panels.reduce((best, current) => {
          const bestEff = this.extractPanelWattage(best.specifications as Record<string, unknown>);
          const currentEff = this.extractPanelWattage(current.specifications as Record<string, unknown>);
          return currentEff > bestEff ? current : best;
        });
      }

      const panelWattage = this.extractPanelWattage(selectedPanel.specifications as Record<string, unknown>);
      const panelCount = Math.ceil((systemSizeKw * 1000) / panelWattage);
      const actualSystemSizeKw = (panelCount * panelWattage) / 1000;

      logger.info({
        selectedPanel: selectedPanel.model,
        panelCount,
        actualSystemSizeKw,
        panelWattage
      }, 'Solar panel selection completed');

      return {
        equipment: selectedPanel as EquipmentCatalogItem,
        panelCount,
        actualSystemSizeKw
      };

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        systemSizeKw
      }, 'Solar panel selection failed');
      throw error;
    }
  }

  /**
   * Select optimal inverter for system
   */
  async selectInverter(
    systemSizeKw: number,
    batteryBackup: boolean = false
  ): Promise<{
    equipment: EquipmentCatalogItem;
    inverterCount: number;
    actualInverterSizeKw: number;
  }> {
    try {
      const inverters = await prisma.equipmentCatalog.findMany({
        where: {
          category: 'inverter',
          necCompliant: true,
          availability: { in: ['in_stock', 'limited'] }
        },
        orderBy: [
          { currentPrice: 'asc' },
          { specifications: 'desc' }
        ],
        take: 10
      });

      if (inverters.length === 0) {
        throw new Error('No suitable inverters found in catalog');
      }

      // Filter for hybrid inverters if battery backup needed
      let suitableInverters = batteryBackup
        ? inverters.filter(inv => inv.specifications && this.isHybridInverter(inv.specifications as Record<string, unknown>))
        : inverters;

      if (suitableInverters.length === 0) {
        suitableInverters = inverters; // Fallback to all inverters
      }

      // Find inverter with appropriate sizing
      const targetInverterSize = systemSizeKw / 1.25; // Account for DC/AC ratio
      
      const selectedInverter = suitableInverters.reduce((best, current) => {
        const bestSize = this.extractInverterSize(best.specifications as Record<string, unknown>);
        const currentSize = this.extractInverterSize(current.specifications as Record<string, unknown>);

        const bestDiff = Math.abs(bestSize - targetInverterSize);
        const currentDiff = Math.abs(currentSize - targetInverterSize);

        return currentDiff < bestDiff ? current : best;
      });

      const inverterSize = this.extractInverterSize(selectedInverter.specifications as Record<string, unknown>);
      const inverterCount = Math.ceil(targetInverterSize / inverterSize);
      const actualInverterSizeKw = inverterCount * inverterSize;

      logger.info({
        selectedInverter: selectedInverter.model,
        inverterCount,
        actualInverterSizeKw,
        batteryBackup
      }, 'Inverter selection completed');

      return {
        equipment: selectedInverter as EquipmentCatalogItem,
        inverterCount,
        actualInverterSizeKw
      };

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        systemSizeKw,
        batteryBackup
      }, 'Inverter selection failed');
      throw error;
    }
  }

  /**
   * Select optimal battery system
   */
  async selectBatterySystem(
    batterySizeKwh: number,
    _inverterSizeKw: number
  ): Promise<{
    equipment: EquipmentCatalogItem;
    batteryCount: number;
    actualBatterySizeKwh: number;
  }> {
    try {
      const batteries = await prisma.equipmentCatalog.findMany({
        where: {
          category: 'battery',
          necCompliant: true,
          availability: { in: ['in_stock', 'limited'] }
        },
        orderBy: [
          { currentPrice: 'asc' },
          { specifications: 'desc' }
        ],
        take: 10
      });

      if (batteries.length === 0) {
        throw new Error('No suitable battery systems found in catalog');
      }

      // Find battery with appropriate capacity
      const selectedBattery = batteries.reduce((best, current) => {
        const bestCapacity = this.extractBatteryCapacity(best.specifications as Record<string, unknown>);
        const currentCapacity = this.extractBatteryCapacity(current.specifications as Record<string, unknown>);

        const bestDiff = Math.abs(bestCapacity - batterySizeKwh);
        const currentDiff = Math.abs(currentCapacity - batterySizeKwh);

        return currentDiff < bestDiff ? current : best;
      });

      const batteryCapacity = this.extractBatteryCapacity(selectedBattery.specifications as Record<string, unknown>);
      const batteryCount = Math.ceil(batterySizeKwh / batteryCapacity);
      const actualBatterySizeKwh = batteryCount * batteryCapacity;

      logger.info({
        selectedBattery: selectedBattery.model,
        batteryCount,
        actualBatterySizeKwh
      }, 'Battery selection completed');

      return {
        equipment: selectedBattery as EquipmentCatalogItem,
        batteryCount,
        actualBatterySizeKwh
      };

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        batterySizeKwh
      }, 'Battery selection failed');
      throw error;
    }
  }

  /**
   * Extract panel wattage from specifications
   */
  private extractPanelWattage(specs: Record<string, unknown>): number {
    if (typeof specs === 'object' && specs && 'wattage' in specs && typeof specs.wattage === 'number') {
      return specs.wattage;
    }
    return 400; // Default 400W panel
  }

  /**
   * Extract inverter size from specifications
   */
  private extractInverterSize(specs: Record<string, unknown>): number {
    if (typeof specs === 'object' && specs && 'power_kw' in specs && typeof specs.power_kw === 'number') {
      return specs.power_kw;
    }
    return 7.6; // Default 7.6kW inverter
  }

  /**
   * Extract battery capacity from specifications
   */
  private extractBatteryCapacity(specs: Record<string, unknown>): number {
    if (typeof specs === 'object' && specs && 'capacity_kwh' in specs && typeof specs.capacity_kwh === 'number') {
      return specs.capacity_kwh;
    }
    return 13.5; // Default 13.5kWh battery
  }

  /**
   * Check if inverter is hybrid (supports battery)
   */
  private isHybridInverter(specs: Record<string, unknown>): boolean {
    if (typeof specs === 'object' && specs && 'type' in specs && typeof specs.type === 'string') {
      return specs.type.toLowerCase().includes('hybrid');
    }
    return false;
  }
}

/**
 * Financial Analysis Service
 */
class FinancialAnalyzer {
  /**
   * Calculate system financial metrics
   */
  async calculateFinancialMetrics(
    systemCost: number,
    annualProduction: number,
    loadProfile: LoadProfile,
    tariff?: Tariff
  ): Promise<{
    annualSavings: number;
    paybackPeriod: number;
    roi25Year: number;
    netPresentValue: number;
    utilityBillReduction: number;
  }> {
    try {
      // Calculate current annual utility cost
      const currentAnnualCost = this.calculateCurrentUtilityCost(loadProfile, tariff);
      
      // Calculate post-solar utility cost
      const postSolarCost = this.calculatePostSolarUtilityCost(
        loadProfile, 
        annualProduction, 
        tariff
      );
      
      const annualSavings = currentAnnualCost - postSolarCost;
      const utilityBillReduction = currentAnnualCost > 0 ? annualSavings / currentAnnualCost : 0;

      // Calculate payback period
      const netSystemCost = systemCost * (1 - FINANCIAL_PARAMETERS.federalTaxCredit);
      const paybackPeriod = netSystemCost / annualSavings;

      // Calculate 25-year ROI
      const totalSavings25Years = this.calculateTotalSavings25Years(annualSavings);
      const roi25Year = (totalSavings25Years - netSystemCost) / netSystemCost;

      // Calculate Net Present Value
      const netPresentValue = this.calculateNPV(
        netSystemCost,
        annualSavings,
        FINANCIAL_PARAMETERS.systemLifeYears,
        FINANCIAL_PARAMETERS.discountRate
      );

      logger.info({
        systemCost,
        annualSavings,
        paybackPeriod,
        roi25Year,
        netPresentValue
      }, 'Financial analysis completed');

      return {
        annualSavings,
        paybackPeriod,
        roi25Year,
        netPresentValue,
        utilityBillReduction
      };

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        systemCost,
        annualProduction
      }, 'Financial analysis failed');
      throw error;
    }
  }

  /**
   * Calculate current utility cost from load profile
   */
  private calculateCurrentUtilityCost(loadProfile: LoadProfile, tariff?: Tariff): number {
    if (!tariff || !tariff.rates.energyRates) {
      // Estimate at $0.12/kWh if no tariff available
      return loadProfile.annualKwh * 0.12 + (12 * 30); // Plus $30/month service charge
    }

    // Simplified calculation - would use actual tariff structure
    const energyRate = tariff.rates.energyRates[0]?.rate || 0.12;
    const fixedCharges = tariff.rates.fixedCharges * 12;
    
    return (loadProfile.annualKwh * energyRate) + fixedCharges;
  }

  /**
   * Calculate post-solar utility cost
   */
  private calculatePostSolarUtilityCost(
    loadProfile: LoadProfile, 
    annualProduction: number, 
    tariff?: Tariff
  ): number {
    const netUsage = Math.max(0, loadProfile.annualKwh - annualProduction);
    const excess = Math.max(0, annualProduction - loadProfile.annualKwh);

    if (!tariff || !tariff.rates.energyRates) {
      const energyRate = 0.12;
      const netMeteringRate = 0.10; // Typical net metering rate
      return (netUsage * energyRate) - (excess * netMeteringRate) + (12 * 30);
    }

    // Simplified calculation with actual tariff
    const energyRate = tariff.rates.energyRates[0]?.rate || 0.12;
    const netMeteringRate = energyRate * 0.9; // Assume 90% of retail rate
    const fixedCharges = tariff.rates.fixedCharges * 12;

    return (netUsage * energyRate) - (excess * netMeteringRate) + fixedCharges;
  }

  /**
   * Calculate total savings over 25 years with escalation
   */
  private calculateTotalSavings25Years(annualSavings: number): number {
    let totalSavings = 0;
    let currentSavings = annualSavings;

    for (let year = 1; year <= FINANCIAL_PARAMETERS.systemLifeYears; year++) {
      totalSavings += currentSavings;
      currentSavings *= (1 + FINANCIAL_PARAMETERS.utilityEscalation);
    }

    return totalSavings;
  }

  /**
   * Calculate Net Present Value
   */
  private calculateNPV(
    initialCost: number,
    annualSavings: number,
    years: number,
    discountRate: number
  ): number {
    let npv = -initialCost;
    let currentSavings = annualSavings;

    for (let year = 1; year <= years; year++) {
      npv += currentSavings / Math.pow(1 + discountRate, year);
      currentSavings *= (1 + FINANCIAL_PARAMETERS.utilityEscalation);
    }

    return npv;
  }
}

/**
 * Main Enhanced System Sizing Service
 */
export class EnhancedSystemSizingService {
  private loadProfileAnalyzer: LoadProfileAnalyzer;
  private equipmentSelector: EquipmentSelector;
  private financialAnalyzer: FinancialAnalyzer;

  constructor() {
    this.loadProfileAnalyzer = new LoadProfileAnalyzer();
    this.equipmentSelector = new EquipmentSelector();
    this.financialAnalyzer = new FinancialAnalyzer();
  }

  /**
   * Generate comprehensive system sizing recommendation
   */
  async generateSizingRecommendation(
    inputs: SizingInputs,
    correlationId?: string
  ): Promise<SizingRecommendation> {
    try {
      logger.info({
        projectId: inputs.projectId,
        goals: inputs.goals,
        correlationId
      }, 'Starting enhanced system sizing');

      // Step 1: Create or get load profile
      let loadProfile = inputs.loadProfile;
      if (!loadProfile && inputs.billHistory.length > 0) {
        loadProfile = await this.loadProfileAnalyzer.createLoadProfileFromBills(
          inputs.projectId,
          inputs.billHistory
        );
      }

      if (!loadProfile) {
        throw new EnergyAnalysisError(
          'Load profile is required for system sizing',
          'MISSING_LOAD_PROFILE',
          { projectId: inputs.projectId },
          false
        );
      }

      // Step 2: Get or find tariff
      let tariff = inputs.tariff;
      if (!tariff && inputs.billHistory.length > 0) {
        const firstBill = inputs.billHistory[0];
        if (firstBill.utilityName) {
          const foundTariff = await tariffService.findTariffBySchedule(
            firstBill.utilityName,
            firstBill.rateSchedule || '',
            inputs.location?.address
          );
          tariff = foundTariff || undefined;
        }
      }

      // Step 3: Calculate optimal system sizes based on goals
      const systemSizing = await this.calculateOptimalSizing(loadProfile, inputs);

      // Step 4: Select equipment
      const solarSelection = await this.equipmentSelector.selectSolarPanels(
        systemSizing.solarSizeKw
      );

      const inverterSelection = await this.equipmentSelector.selectInverter(
        solarSelection.actualSystemSizeKw,
        systemSizing.batterySizeKwh > 0
      );

      let batterySelection = null;
      let batteryPerformanceModel = null;
      if (systemSizing.batterySizeKwh > 0) {
        batterySelection = await this.equipmentSelector.selectBatterySystem(
          systemSizing.batterySizeKwh,
          inverterSelection.actualInverterSizeKw
        );

        // Create battery performance model
        batteryPerformanceModel = await this.createBatteryPerformanceModel(
          inputs.projectId,
          batterySelection.equipment,
          loadProfile
        );
      }

      // Step 5: Calculate production estimate
      const systemConfiguration: SystemConfiguration = {
        tilt: this.calculateOptimalTilt(inputs.location.latitude),
        azimuth: 180, // South-facing
        trackingType: 'fixed',
        shadingLoss: 3,
        soilingLoss: 2,
        dcLosses: 3,
        acLosses: 2,
        inverterEfficiency: 96,
        moduleType: 'standard',
        installationType: 'roof_mount'
      };

      const productionEstimate = await productionModelingService.calculateProductionEstimate(
        inputs.projectId,
        solarSelection.actualSystemSizeKw,
        systemConfiguration,
        inputs.location.latitude,
        inputs.location.longitude,
        'pvwatts',
        correlationId
      );

      // Step 6: Calculate system cost
      const systemCost = this.calculateSystemCost(
        solarSelection,
        inverterSelection,
        batterySelection,
        solarSelection.actualSystemSizeKw
      );

      // Step 7: Financial analysis
      const financialMetrics = await this.financialAnalyzer.calculateFinancialMetrics(
        systemCost,
        productionEstimate.annualProduction,
        loadProfile,
        tariff
      );

      // Step 8: Backup capability analysis
      const backupCapability = this.analyzeBackupCapability(
        batterySelection,
        inputs.criticalLoads,
        inputs.backupDuration || 4
      );

      // Step 9: Create sizing recommendation
      const recommendation: SizingRecommendation = {
        projectId: inputs.projectId,
        solarSizeKw: solarSelection.actualSystemSizeKw,
        batterySizeKwh: batterySelection?.actualBatterySizeKwh || 0,
        inverterSizeKw: inverterSelection.actualInverterSizeKw,
        selectedEquipment: {
          solarPanels: solarSelection.equipment,
          inverters: inverterSelection.equipment,
          batteries: batterySelection?.equipment,
          mounting: await this.selectMountingSystem(solarSelection.actualSystemSizeKw)
        },
        productionEstimate,
        // Battery performance model is stored separately, not included in recommendation
        systemCost,
        annualSavings: financialMetrics.annualSavings,
        paybackPeriod: financialMetrics.paybackPeriod,
        roi25Year: financialMetrics.roi25Year,
        netPresentValue: financialMetrics.netPresentValue,
        newBillProjection: Array(12).fill(50), // Simplified
        gridExportKwh: Math.max(0, productionEstimate.annualProduction - loadProfile.annualKwh),
        selfConsumptionRate: Math.min(1, loadProfile.annualKwh / productionEstimate.annualProduction),
        backupCapability,
        confidence: this.calculateSizingConfidence(loadProfile, productionEstimate, inputs),
        alternativeOptions: await this.generateAlternativeOptions(inputs, loadProfile),
        methodology: 'Enhanced PV+Storage sizing with load profile analysis and equipment optimization',
        createdAt: new Date()
      };

      // Save to database
      const saved = await this.saveSizingRecommendation(recommendation);

      logger.info({
        projectId: inputs.projectId,
        solarSizeKw: saved.solarSizeKw,
        batterySizeKwh: saved.batterySizeKwh,
        systemCost: saved.systemCost,
        confidence: saved.confidence,
        correlationId
      }, 'Enhanced system sizing completed');

      return saved;

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId: inputs.projectId,
        correlationId
      }, 'Enhanced system sizing failed');
      throw error;
    }
  }

  /**
   * Calculate optimal system sizing based on goals and constraints
   */
  private async calculateOptimalSizing(
    loadProfile: LoadProfile,
    inputs: SizingInputs
  ): Promise<{
    solarSizeKw: number;
    batterySizeKwh: number;
    inverterSizeKw: number;
  }> {
    let solarSizeKw = 0;
    let batterySizeKwh = 0;

    // Size solar based on primary goal
    if (inputs.goals.includes('net_zero')) {
      // Size for 100% offset
      solarSizeKw = loadProfile.annualKwh / 1200; // Assume 1200 kWh/kW/year
    } else if (inputs.goals.includes('bill_reduction')) {
      // Size for 80% offset to optimize economics
      solarSizeKw = (loadProfile.annualKwh * 0.8) / 1200;
    } else if (inputs.goals.includes('roi_optimization')) {
      // Size for optimal ROI (typically 70-90% offset)
      solarSizeKw = (loadProfile.annualKwh * 0.85) / 1200;
    } else {
      // Default to 80% offset
      solarSizeKw = (loadProfile.annualKwh * 0.8) / 1200;
    }

    // Size battery based on backup requirements and critical loads
    if (inputs.goals.includes('backup_power')) {
      if (inputs.criticalLoads) {
        const backupDuration = inputs.backupDuration || 4; // 4 hours default
        batterySizeKwh = inputs.criticalLoads.totalCriticalKw * backupDuration;
      } else {
        // Estimate critical load as 30% of peak load
        batterySizeKwh = loadProfile.peakKw * 0.3 * (inputs.backupDuration || 4);
      }
    }

    // Apply constraints
    solarSizeKw = Math.max(
      SIZING_CONSTRAINTS.minSystemSizeKw,
      Math.min(SIZING_CONSTRAINTS.maxSystemSizeKw, solarSizeKw)
    );

    if (batterySizeKwh > 0) {
      batterySizeKwh = Math.max(
        SIZING_CONSTRAINTS.minBatterySizeKwh,
        Math.min(SIZING_CONSTRAINTS.maxBatterySizeKwh, batterySizeKwh)
      );
    }

    // Size inverter based on solar and battery requirements
    const inverterSizeKw = Math.min(
      SIZING_CONSTRAINTS.maxInverterSizeKw,
      Math.max(
        solarSizeKw / SIZING_CONSTRAINTS.maxSolarToInverterRatio,
        batterySizeKwh / 2 // Battery can discharge at C/2 rate
      )
    );

    return { solarSizeKw, batterySizeKwh, inverterSizeKw };
  }

  /**
   * Create battery performance model
   */
  private async createBatteryPerformanceModel(
    projectId: string,
    batteryEquipment: EquipmentCatalogItem,
    _loadProfile: LoadProfile
  ): Promise<{id: string}> {
    // Simplified battery model creation
    const batteryCapacity = this.equipmentSelector['extractBatteryCapacity'](batteryEquipment.specifications);
    const batterySpecs = {
      manufacturer: batteryEquipment.manufacturer,
      model: batteryEquipment.model,
      chemistry: 'lithium_ion',
      nominalVoltage: 48,
      nominalCapacityKwh: batteryCapacity,
      usableCapacityKwh: batteryCapacity * 0.9,
      maxChargeRateKw: batteryCapacity / 2,
      maxDischargeRateKw: batteryCapacity / 2,
      roundTripEfficiency: 0.9,
      maxDoD: 0.9,
      cycleLife: 6000,
      calendarLife: 10,
      operatingTempMin: -10,
      operatingTempMax: 50,
      ul9540Listed: batteryEquipment.ulListed,
      ul9540aReported: false,
      ul1973Listed: batteryEquipment.ulListed
    };

    return await prisma.batteryPerformanceModel.create({
      data: {
        projectId,
        equipmentCatalogId: batteryEquipment.id,
        batterySpecs: batterySpecs as unknown as Prisma.InputJsonValue,
        dispatchMode: 'self_consumption',
        dailyCycles: 1,
        seasonalEfficiency: [0.95, 0.94, 0.95, 0.96, 0.97, 0.96, 0.95, 0.95, 0.96, 0.95, 0.94, 0.93],
        temperatureEffects: true,
        warrantyYears: 10,
        warrantyThroughput: batteryCapacity * 6000,
        replacementCost: batteryEquipment.currentPrice
      }
    });
  }

  /**
   * Calculate optimal tilt angle based on latitude
   */
  private calculateOptimalTilt(latitude: number): number {
    // Simplified rule: tilt = latitude - 15° (optimized for annual production)
    return Math.max(5, Math.min(60, Math.abs(latitude) - 15));
  }

  /**
   * Calculate total system cost
   */
  private calculateSystemCost(
    solarSelection: { equipment: EquipmentCatalogItem; panelCount: number; actualSystemSizeKw: number },
    inverterSelection: { equipment: EquipmentCatalogItem; inverterCount: number; actualInverterSizeKw: number },
    batterySelection: { equipment: EquipmentCatalogItem; batteryCount: number; actualBatterySizeKwh: number } | null,
    systemSizeKw: number
  ): number {
    let totalCost = 0;

    // Solar panel costs
    totalCost += (solarSelection.equipment.currentPrice || 0) * solarSelection.panelCount;

    // Inverter costs
    totalCost += (inverterSelection.equipment.currentPrice || 0) * inverterSelection.inverterCount;

    // Battery costs
    if (batterySelection) {
      totalCost += (batterySelection.equipment.currentPrice || 0) * batterySelection.batteryCount;
    }

    // Installation and soft costs (simplified)
    const installationCost = systemSizeKw * 1000; // $1/W for installation
    totalCost += installationCost;

    return totalCost;
  }

  /**
   * Analyze backup capability
   */
  private analyzeBackupCapability(
    batterySelection: { equipment: EquipmentCatalogItem; batteryCount: number; actualBatterySizeKwh: number } | null,
    criticalLoads?: CriticalLoadProfile,
    backupDuration: number = 4
  ): { autonomyHours: number; criticalLoadsCovered: string[] } {
    if (!batterySelection) {
      return {
        autonomyHours: 0,
        criticalLoadsCovered: []
      };
    }

    const batteryCapacityKwh = batterySelection.actualBatterySizeKwh;
    const usableCapacity = batteryCapacityKwh * 0.9; // 90% usable

    let autonomyHours = backupDuration;
    let criticalLoadsCovered: string[] = [];

    if (criticalLoads) {
      autonomyHours = usableCapacity / criticalLoads.peakSimultaneousKw;
      criticalLoadsCovered = criticalLoads.circuits
        .filter(circuit => circuit.priority === 'essential')
        .map(circuit => circuit.name);
    }

    return {
      autonomyHours: Math.round(autonomyHours * 10) / 10,
      criticalLoadsCovered
    };
  }

  /**
   * Select mounting system
   */
  private async selectMountingSystem(_systemSizeKw: number): Promise<EquipmentCatalogItem> {
    // Simplified mounting system selection
    const mounting = await prisma.equipmentCatalog.findFirst({
      where: {
        category: 'mounting',
        necCompliant: true,
        availability: { in: ['in_stock', 'limited'] }
      }
    });

    if (!mounting) {
      throw new Error('No mounting systems found in catalog');
    }

    return mounting as EquipmentCatalogItem;
  }

  /**
   * Calculate sizing confidence
   */
  private calculateSizingConfidence(
    loadProfile: LoadProfile,
    productionEstimate: ProductionEstimate,
    inputs: SizingInputs
  ): number {
    let confidence = 0.7; // Base confidence

    // Load profile confidence contributes 30%
    confidence += loadProfile.confidence * 0.3;

    // Production estimate confidence contributes 20%
    confidence += productionEstimate.confidence * 0.2;

    // Equipment availability contributes 10%
    confidence += 0.1; // Assume equipment is available

    // Goals clarity contributes 10%
    if (inputs.goals.length > 0) {
      confidence += 0.1;
    }

    // Bill history completeness contributes 10%
    const billCompleteness = Math.min(1, inputs.billHistory.length / 12);
    confidence += billCompleteness * 0.1;

    return Math.min(1, confidence);
  }

  /**
   * Generate alternative sizing options
   */
  private async generateAlternativeOptions(
    _inputs: SizingInputs,
    _loadProfile: LoadProfile
  ): Promise<Array<{ description: string; sizingDifference: string; costDifference: number; performanceTrade: string }>> {
    const alternatives = [];

    // Conservative option (smaller system)
    alternatives.push({
      description: 'Conservative sizing for lower upfront cost',
      sizingDifference: '20% smaller solar array',
      costDifference: -5000,
      performanceTrade: 'Lower energy offset but faster payback'
    });

    // Aggressive option (larger system)
    alternatives.push({
      description: 'Oversized for maximum energy independence',
      sizingDifference: '30% larger solar array with more battery storage',
      costDifference: 8000,
      performanceTrade: 'Higher energy independence but longer payback'
    });

    return alternatives;
  }

  /**
   * Save sizing recommendation to database
   */
  private async saveSizingRecommendation(
    recommendation: SizingRecommendation
  ): Promise<SizingRecommendation> {
    const saved = await prisma.sizingRecommendation.create({
      data: {
        projectId: recommendation.projectId,
        solarSizeKw: recommendation.solarSizeKw,
        batterySizeKwh: recommendation.batterySizeKwh,
        inverterSizeKw: recommendation.inverterSizeKw,
        selectedEquipment: recommendation.selectedEquipment as unknown as Prisma.InputJsonValue,
        systemCost: recommendation.systemCost,
        annualSavings: recommendation.annualSavings,
        paybackPeriod: recommendation.paybackPeriod,
        roi25Year: recommendation.roi25Year,
        netPresentValue: recommendation.netPresentValue,
        utilityAnalysis: {
          newBillProjection: recommendation.newBillProjection,
          gridExportKwh: recommendation.gridExportKwh,
          selfConsumptionRate: recommendation.selfConsumptionRate
        } as unknown as Prisma.InputJsonValue,
        backupCapability: recommendation.backupCapability as unknown as Prisma.InputJsonValue,
        confidence: recommendation.confidence,
        alternativeOptions: recommendation.alternativeOptions as unknown as Prisma.InputJsonValue,
        methodology: recommendation.methodology
      }
    });

    return {
      ...recommendation,
      createdAt: saved.createdAt
    };
  }
}

// Export singleton instance
export const enhancedSystemSizingService = new EnhancedSystemSizingService();

// Export individual services for testing
export { LoadProfileAnalyzer, EquipmentSelector, FinancialAnalyzer };
