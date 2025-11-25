/**
 * Sensitivity Analysis Service
 * Models ROI and financial outcomes under different scenarios
 */

import { FINANCIAL_PARAMETERS } from '@/lib/config';

export interface ScenarioParameter {
  name: string;
  baseValue: number;
  lowValue: number;
  highValue: number;
  unit: string;
  description: string;
}

export interface Scenario {
  name: string;
  description: string;
  parameters: {
    utilityRateEscalation: number;
    systemDegradation: number;
    electricityRate: number;
    discountRate: number;
    oandmCostPerKw: number;
  };
}

export interface ScenarioResult {
  scenario: string;
  annualSavings: number;
  paybackPeriod: number;
  roi25Year: number;
  netPresentValue: number;
  totalSavings25Year: number;
  effectiveAnnualReturn: number;
}

export interface SensitivityAnalysis {
  systemCost: number;
  netCostAfterTaxCredit: number;
  systemSizeKw: number;
  annualProduction: number;
  baseElectricityRate: number;

  // Scenario results
  scenarios: ScenarioResult[];

  // Parameter sensitivity (tornado chart data)
  parameterSensitivity: Array<{
    parameter: string;
    lowImpact: number; // NPV change from low value
    highImpact: number; // NPV change from high value
    range: number; // Total range of impact
  }>;

  // Monte Carlo simulation results (optional advanced feature)
  monteCarlo?: {
    meanROI: number;
    medianROI: number;
    stdDeviation: number;
    confidenceIntervals: {
      p10: number; // 10th percentile
      p50: number; // 50th percentile (median)
      p90: number; // 90th percentile
    };
    probabilityOfPositiveROI: number;
  };
}

class SensitivityAnalysisService {
  /**
   * Perform comprehensive sensitivity analysis
   */
  performAnalysis(
    systemCost: number,
    systemSizeKw: number,
    annualProduction: number,
    baseElectricityRate: number
  ): SensitivityAnalysis {
    const netCostAfterTaxCredit = systemCost * (1 - FINANCIAL_PARAMETERS.federalTaxCredit);

    // Define scenarios
    const scenarios: Scenario[] = [
      {
        name: 'Best Case',
        description: 'High utility rates, low degradation, high energy production',
        parameters: {
          utilityRateEscalation: 0.05, // 5% annual increase
          systemDegradation: 0.003, // 0.3% per year
          electricityRate: baseElectricityRate * 1.2, // 20% higher
          discountRate: FINANCIAL_PARAMETERS.discountRate * 0.8, // Lower discount
          oandmCostPerKw: FINANCIAL_PARAMETERS.oandmCostPerKw * 0.8,
        },
      },
      {
        name: 'Expected Case',
        description: 'Standard assumptions with typical conditions',
        parameters: {
          utilityRateEscalation: FINANCIAL_PARAMETERS.utilityEscalation,
          systemDegradation: 0.005, // 0.5% per year (standard)
          electricityRate: baseElectricityRate,
          discountRate: FINANCIAL_PARAMETERS.discountRate,
          oandmCostPerKw: FINANCIAL_PARAMETERS.oandmCostPerKw,
        },
      },
      {
        name: 'Worst Case',
        description: 'Low utility rates, high degradation, lower production',
        parameters: {
          utilityRateEscalation: 0.01, // 1% annual increase
          systemDegradation: 0.008, // 0.8% per year
          electricityRate: baseElectricityRate * 0.8, // 20% lower
          discountRate: FINANCIAL_PARAMETERS.discountRate * 1.2, // Higher discount
          oandmCostPerKw: FINANCIAL_PARAMETERS.oandmCostPerKw * 1.2,
        },
      },
      {
        name: 'Flat Rates',
        description: 'No utility rate increases over time',
        parameters: {
          utilityRateEscalation: 0, // No escalation
          systemDegradation: 0.005,
          electricityRate: baseElectricityRate,
          discountRate: FINANCIAL_PARAMETERS.discountRate,
          oandmCostPerKw: FINANCIAL_PARAMETERS.oandmCostPerKw,
        },
      },
      {
        name: 'High Degradation',
        description: 'Faster than expected system degradation',
        parameters: {
          utilityRateEscalation: FINANCIAL_PARAMETERS.utilityEscalation,
          systemDegradation: 0.01, // 1% per year
          electricityRate: baseElectricityRate,
          discountRate: FINANCIAL_PARAMETERS.discountRate,
          oandmCostPerKw: FINANCIAL_PARAMETERS.oandmCostPerKw,
        },
      },
    ];

    // Calculate results for each scenario
    const scenarioResults = scenarios.map(scenario =>
      this.calculateScenarioResult(
        scenario,
        netCostAfterTaxCredit,
        systemSizeKw,
        annualProduction
      )
    );

    // Calculate parameter sensitivity
    const parameterSensitivity = this.calculateParameterSensitivity(
      netCostAfterTaxCredit,
      systemSizeKw,
      annualProduction,
      baseElectricityRate
    );

    // Optional: Monte Carlo simulation
    const monteCarlo = this.runMonteCarloSimulation(
      netCostAfterTaxCredit,
      systemSizeKw,
      annualProduction,
      baseElectricityRate,
      1000 // 1000 iterations
    );

    return {
      systemCost,
      netCostAfterTaxCredit,
      systemSizeKw,
      annualProduction,
      baseElectricityRate,
      scenarios: scenarioResults,
      parameterSensitivity,
      monteCarlo,
    };
  }

  /**
   * Calculate financial metrics for a scenario
   */
  private calculateScenarioResult(
    scenario: Scenario,
    netCost: number,
    systemSizeKw: number,
    baseAnnualProduction: number
  ): ScenarioResult {
    const { parameters } = scenario;

    // Calculate year-by-year savings and costs
    let totalSavings = 0;
    let npv = -netCost;
    let cumulativeSavings = 0;
    let paybackYear = 25;

    for (let year = 1; year <= 25; year++) {
      // Production degradation
      const degradationFactor = Math.pow(1 - parameters.systemDegradation, year - 1);
      const yearProduction = baseAnnualProduction * degradationFactor;

      // Electricity rate with escalation
      const yearRate = parameters.electricityRate *
        Math.pow(1 + parameters.utilityRateEscalation, year - 1);

      // Savings and costs
      const yearSavings = yearProduction * yearRate;
      const yearOandM = systemSizeKw * parameters.oandmCostPerKw;
      const netYearSavings = yearSavings - yearOandM;

      totalSavings += netYearSavings;
      cumulativeSavings += netYearSavings;

      // NPV calculation
      npv += netYearSavings / Math.pow(1 + parameters.discountRate, year);

      // Payback period
      if (cumulativeSavings >= netCost && paybackYear === 25) {
        paybackYear = year;
      }
    }

    const roi25Year = ((totalSavings - netCost) / netCost) * 100;
    const effectiveAnnualReturn = Math.pow(1 + (roi25Year / 100), 1 / 25) - 1;

    return {
      scenario: scenario.name,
      annualSavings: totalSavings / 25, // Average annual
      paybackPeriod: paybackYear,
      roi25Year,
      netPresentValue: npv,
      totalSavings25Year: totalSavings,
      effectiveAnnualReturn: effectiveAnnualReturn * 100,
    };
  }

  /**
   * Calculate sensitivity to each parameter (tornado chart data)
   */
  private calculateParameterSensitivity(
    netCost: number,
    systemSizeKw: number,
    annualProduction: number,
    baseElectricityRate: number
  ): Array<{
    parameter: string;
    lowImpact: number;
    highImpact: number;
    range: number;
  }> {
    const baseScenario: Scenario = {
      name: 'Base',
      description: 'Base case',
      parameters: {
        utilityRateEscalation: FINANCIAL_PARAMETERS.utilityEscalation,
        systemDegradation: 0.005,
        electricityRate: baseElectricityRate,
        discountRate: FINANCIAL_PARAMETERS.discountRate,
        oandmCostPerKw: FINANCIAL_PARAMETERS.oandmCostPerKw,
      },
    };

    const baseResult = this.calculateScenarioResult(
      baseScenario,
      netCost,
      systemSizeKw,
      annualProduction
    );

    const parameters = [
      {
        name: 'Utility Rate Escalation',
        low: 0.01,
        high: 0.05,
        param: 'utilityRateEscalation' as const,
      },
      {
        name: 'Electricity Rate',
        low: baseElectricityRate * 0.8,
        high: baseElectricityRate * 1.2,
        param: 'electricityRate' as const,
      },
      {
        name: 'System Degradation',
        low: 0.003,
        high: 0.01,
        param: 'systemDegradation' as const,
      },
      {
        name: 'Discount Rate',
        low: 0.04,
        high: 0.08,
        param: 'discountRate' as const,
      },
      {
        name: 'O&M Cost',
        low: 15,
        high: 30,
        param: 'oandmCostPerKw' as const,
      },
    ];

    return parameters.map(param => {
      // Low scenario
      const lowScenario: Scenario = {
        ...baseScenario,
        parameters: { ...baseScenario.parameters, [param.param]: param.low },
      };
      const lowResult = this.calculateScenarioResult(
        lowScenario,
        netCost,
        systemSizeKw,
        annualProduction
      );

      // High scenario
      const highScenario: Scenario = {
        ...baseScenario,
        parameters: { ...baseScenario.parameters, [param.param]: param.high },
      };
      const highResult = this.calculateScenarioResult(
        highScenario,
        netCost,
        systemSizeKw,
        annualProduction
      );

      const lowImpact = lowResult.netPresentValue - baseResult.netPresentValue;
      const highImpact = highResult.netPresentValue - baseResult.netPresentValue;
      const range = Math.abs(highImpact - lowImpact);

      return {
        parameter: param.name,
        lowImpact,
        highImpact,
        range,
      };
    }).sort((a, b) => b.range - a.range); // Sort by range (tornado chart)
  }

  /**
   * Run Monte Carlo simulation
   */
  private runMonteCarloSimulation(
    netCost: number,
    systemSizeKw: number,
    annualProduction: number,
    baseElectricityRate: number,
    iterations: number
  ): {
    meanROI: number;
    medianROI: number;
    stdDeviation: number;
    confidenceIntervals: { p10: number; p50: number; p90: number };
    probabilityOfPositiveROI: number;
  } {
    const rois: number[] = [];

    for (let i = 0; i < iterations; i++) {
      // Randomly sample parameters from distributions
      const scenario: Scenario = {
        name: `Iteration ${i}`,
        description: 'Monte Carlo iteration',
        parameters: {
          utilityRateEscalation: this.normalRandom(0.025, 0.015), // Mean 2.5%, std 1.5%
          systemDegradation: this.normalRandom(0.005, 0.002), // Mean 0.5%, std 0.2%
          electricityRate: baseElectricityRate * this.normalRandom(1.0, 0.15), // ±15%
          discountRate: this.normalRandom(0.06, 0.02), // Mean 6%, std 2%
          oandmCostPerKw: this.normalRandom(20, 5), // Mean $20, std $5
        },
      };

      const result = this.calculateScenarioResult(
        scenario,
        netCost,
        systemSizeKw,
        annualProduction
      );

      rois.push(result.roi25Year);
    }

    // Sort ROIs for percentile calculations
    rois.sort((a, b) => a - b);

    const meanROI = rois.reduce((a, b) => a + b, 0) / rois.length;
    const medianROI = rois[Math.floor(rois.length / 2)];

    // Standard deviation
    const variance = rois.reduce((sum, roi) => sum + Math.pow(roi - meanROI, 2), 0) / rois.length;
    const stdDeviation = Math.sqrt(variance);

    // Confidence intervals
    const p10 = rois[Math.floor(rois.length * 0.1)];
    const p50 = medianROI;
    const p90 = rois[Math.floor(rois.length * 0.9)];

    // Probability of positive ROI
    const positiveROIs = rois.filter(roi => roi > 0).length;
    const probabilityOfPositiveROI = (positiveROIs / rois.length) * 100;

    return {
      meanROI,
      medianROI,
      stdDeviation,
      confidenceIntervals: { p10, p50, p90 },
      probabilityOfPositiveROI,
    };
  }

  /**
   * Generate random number from normal distribution (Box-Muller transform)
   */
  private normalRandom(mean: number, stdDev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }
}

export const sensitivityAnalysisService = new SensitivityAnalysisService();
