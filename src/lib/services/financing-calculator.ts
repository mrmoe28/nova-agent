/**
 * Financing Calculator Service
 * Calculates loan payments, lease options, and PPA scenarios for solar installations
 */

import { FINANCIAL_PARAMETERS } from '@/lib/config';

export interface LoanOption {
  type: 'loan';
  name: string;
  loanAmount: number;
  interestRate: number; // Annual interest rate (e.g., 0.05 for 5%)
  termYears: number;
  monthlyPayment: number;
  totalInterestPaid: number;
  totalPayments: number;

  // Comparison metrics
  firstYearNetCost: number; // Monthly payment minus savings
  breakEvenMonth: number; // When cumulative savings exceed cumulative payments
  totalCostOverLife: number;
  effectiveAnnualCost: number;
}

export interface LeaseOption {
  type: 'lease';
  name: string;
  monthlyLeasePayment: number;
  termYears: number;
  escalator: number; // Annual payment increase (e.g., 0.029 for 2.9%)
  totalPayments: number;

  // Comparison metrics
  firstYearNetCost: number;
  totalCostOverLife: number;
  effectiveAnnualCost: number;
}

export interface PPAOption {
  type: 'ppa';
  name: string;
  initialRatePerKwh: number;
  escalator: number; // Annual rate increase
  estimatedMonthlyPayment: number; // Based on production
  termYears: number;

  // Comparison metrics
  firstYearCost: number;
  totalCostOverLife: number;
  effectiveAnnualCost: number;
}

export interface CashOption {
  type: 'cash';
  name: string;
  upfrontCost: number;
  netCostAfterTaxCredit: number;

  // Comparison metrics
  paybackPeriod: number;
  roi25Year: number;
  netPresentValue: number;
}

export type FinancingOption = LoanOption | LeaseOption | PPAOption | CashOption;

export interface FinancingComparison {
  systemCost: number;
  annualProduction: number;
  annualSavings: number;
  options: FinancingOption[];
  recommendedOption: string;
  comparisonTable: {
    metric: string;
    cash: number | string;
    loan: number | string;
    lease: number | string;
    ppa: number | string;
  }[];
}

class FinancingCalculatorService {
  /**
   * Calculate all financing options for a solar system
   */
  calculateFinancingOptions(
    systemCost: number,
    annualProduction: number,
    annualSavings: number
  ): FinancingComparison {
    const options: FinancingOption[] = [];

    // Cash purchase option
    const cashOption = this.calculateCashOption(systemCost, annualSavings);
    options.push(cashOption);

    // Loan options (various terms and rates)
    const loanOptions = [
      this.calculateLoanOption('10-Year Loan (4.99%)', systemCost, 0.0499, 10, annualSavings),
      this.calculateLoanOption('15-Year Loan (5.99%)', systemCost, 0.0599, 15, annualSavings),
      this.calculateLoanOption('20-Year Loan (6.99%)', systemCost, 0.0699, 20, annualSavings),
    ];
    options.push(...loanOptions);

    // Lease option
    const leaseOption = this.calculateLeaseOption('Solar Lease', systemCost, 20, annualSavings);
    options.push(leaseOption);

    // PPA option
    const ppaOption = this.calculatePPAOption('Power Purchase Agreement', annualProduction, annualSavings);
    options.push(ppaOption);

    // Determine recommended option
    const recommendedOption = this.determineRecommendedOption(options);

    // Generate comparison table
    const comparisonTable = this.generateComparisonTable(options);

    return {
      systemCost,
      annualProduction,
      annualSavings,
      options,
      recommendedOption,
      comparisonTable,
    };
  }

  /**
   * Calculate cash purchase option
   */
  private calculateCashOption(systemCost: number, annualSavings: number): CashOption {
    const netCostAfterTaxCredit = systemCost * (1 - FINANCIAL_PARAMETERS.federalTaxCredit);
    const paybackPeriod = netCostAfterTaxCredit / annualSavings;

    // 25-year ROI
    const totalSavings = annualSavings * 25 *
      (1 + FINANCIAL_PARAMETERS.utilityEscalation) ** 12.5; // Average escalation
    const roi25Year = ((totalSavings - netCostAfterTaxCredit) / netCostAfterTaxCredit) * 100;

    // NPV
    let npv = -netCostAfterTaxCredit;
    for (let year = 1; year <= 25; year++) {
      const yearSavings = annualSavings * Math.pow(1 + FINANCIAL_PARAMETERS.utilityEscalation, year - 1);
      npv += yearSavings / Math.pow(1 + FINANCIAL_PARAMETERS.discountRate, year);
    }

    return {
      type: 'cash',
      name: 'Cash Purchase',
      upfrontCost: systemCost,
      netCostAfterTaxCredit,
      paybackPeriod,
      roi25Year,
      netPresentValue: npv,
    };
  }

  /**
   * Calculate loan option
   */
  private calculateLoanOption(
    name: string,
    loanAmount: number,
    interestRate: number,
    termYears: number,
    annualSavings: number
  ): LoanOption {
    // Monthly payment calculation using amortization formula
    const monthlyRate = interestRate / 12;
    const numPayments = termYears * 12;
    const monthlyPayment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);

    const totalPayments = monthlyPayment * numPayments;
    const totalInterestPaid = totalPayments - loanAmount;

    // First year net cost
    const monthlyElectricSavings = annualSavings / 12;
    const firstYearNetCost = monthlyPayment - monthlyElectricSavings;

    // Break-even month (when cumulative savings exceed cumulative payments)
    let cumulativeSavings = 0;
    let cumulativePayments = 0;
    let breakEvenMonth = numPayments;

    for (let month = 1; month <= numPayments; month++) {
      cumulativePayments += monthlyPayment;
      cumulativeSavings += monthlyElectricSavings *
        Math.pow(1 + FINANCIAL_PARAMETERS.utilityEscalation, month / 12);

      if (cumulativeSavings >= cumulativePayments && month < breakEvenMonth) {
        breakEvenMonth = month;
      }
    }

    // Total cost over 25-year system life
    const totalCostOverLife = totalPayments;
    const effectiveAnnualCost = totalCostOverLife / 25;

    return {
      type: 'loan',
      name,
      loanAmount,
      interestRate,
      termYears,
      monthlyPayment,
      totalInterestPaid,
      totalPayments,
      firstYearNetCost,
      breakEvenMonth,
      totalCostOverLife,
      effectiveAnnualCost,
    };
  }

  /**
   * Calculate lease option
   */
  private calculateLeaseOption(
    name: string,
    systemCost: number,
    termYears: number,
    annualSavings: number
  ): LeaseOption {
    // Typical lease payment is designed to be slightly below electric savings
    const monthlyElectricSavings = annualSavings / 12;
    const monthlyLeasePayment = monthlyElectricSavings * 0.80; // 80% of savings

    // Typical solar lease escalator is 2.9% annually
    const escalator = 0.029;

    // Calculate total payments with escalation
    let totalPayments = 0;
    for (let year = 0; year < termYears; year++) {
      const yearPayment = monthlyLeasePayment * 12 * Math.pow(1 + escalator, year);
      totalPayments += yearPayment;
    }

    const firstYearNetCost = monthlyLeasePayment - monthlyElectricSavings;
    const effectiveAnnualCost = totalPayments / termYears;

    return {
      type: 'lease',
      name,
      monthlyLeasePayment,
      termYears,
      escalator,
      totalPayments,
      firstYearNetCost,
      totalCostOverLife: totalPayments,
      effectiveAnnualCost,
    };
  }

  /**
   * Calculate PPA option
   */
  private calculatePPAOption(
    name: string,
    annualProduction: number,
    annualSavings: number
  ): PPAOption {
    // PPA rate is typically 10-20% below utility rate
    const currentUtilityRate = annualSavings / annualProduction;
    const initialRatePerKwh = currentUtilityRate * 0.85; // 15% discount

    // Typical PPA escalator is 2.9% annually
    const escalator = 0.029;
    const termYears = 20;

    // Calculate costs
    const estimatedMonthlyPayment = (annualProduction / 12) * initialRatePerKwh;
    const firstYearCost = annualProduction * initialRatePerKwh;

    // Total cost over contract term with escalation
    let totalCostOverLife = 0;
    for (let year = 0; year < termYears; year++) {
      const yearRate = initialRatePerKwh * Math.pow(1 + escalator, year);
      totalCostOverLife += annualProduction * yearRate;
    }

    const effectiveAnnualCost = totalCostOverLife / termYears;

    return {
      type: 'ppa',
      name,
      initialRatePerKwh,
      escalator,
      estimatedMonthlyPayment,
      termYears,
      firstYearCost,
      totalCostOverLife,
      effectiveAnnualCost,
    };
  }

  /**
   * Determine recommended option based on best overall value
   */
  private determineRecommendedOption(options: FinancingOption[]): string {
    // Score each option
    const scores = options.map(option => {
      let score = 0;

      if (option.type === 'cash') {
        // Cash: favor high ROI and low payback
        score = (option.roi25Year / 10) + (100 / Math.max(option.paybackPeriod, 1));
      } else if (option.type === 'loan') {
        // Loan: favor low monthly payment and short break-even
        score = (1000 / option.monthlyPayment) + (200 / Math.max(option.breakEvenMonth, 1));
      } else if (option.type === 'lease') {
        // Lease: favor low monthly cost and low total cost
        score = (1000 / option.monthlyLeasePayment) + (100000 / option.totalPayments);
      } else if (option.type === 'ppa') {
        // PPA: favor low rate and low total cost
        score = (10 / option.initialRatePerKwh) + (100000 / option.totalCostOverLife);
      }

      return { name: option.name, score };
    });

    const best = scores.reduce((prev, current) =>
      current.score > prev.score ? current : prev
    );

    return best.name;
  }

  /**
   * Generate comparison table
   */
  private generateComparisonTable(options: FinancingOption[]): Array<{
    metric: string;
    cash: number | string;
    loan: number | string;
    lease: number | string;
    ppa: number | string;
  }> {
    const cash = options.find(o => o.type === 'cash') as CashOption | undefined;
    const loan = options.find(o => o.type === 'loan') as LoanOption | undefined;
    const lease = options.find(o => o.type === 'lease') as LeaseOption | undefined;
    const ppa = options.find(o => o.type === 'ppa') as PPAOption | undefined;

    return [
      {
        metric: 'Upfront Cost',
        cash: cash ? `$${cash.netCostAfterTaxCredit.toFixed(0)}` : 'N/A',
        loan: loan ? '$0' : 'N/A',
        lease: lease ? '$0' : 'N/A',
        ppa: ppa ? '$0' : 'N/A',
      },
      {
        metric: 'Monthly Payment',
        cash: 'N/A',
        loan: loan ? `$${loan.monthlyPayment.toFixed(2)}` : 'N/A',
        lease: lease ? `$${lease.monthlyLeasePayment.toFixed(2)}` : 'N/A',
        ppa: ppa ? `$${ppa.estimatedMonthlyPayment.toFixed(2)}` : 'N/A',
      },
      {
        metric: 'Payback Period (years)',
        cash: cash ? cash.paybackPeriod.toFixed(1) : 'N/A',
        loan: loan ? (loan.breakEvenMonth / 12).toFixed(1) : 'N/A',
        lease: 'N/A',
        ppa: 'N/A',
      },
      {
        metric: '25-Year Cost',
        cash: cash ? `$${cash.netCostAfterTaxCredit.toFixed(0)}` : 'N/A',
        loan: loan ? `$${loan.totalPayments.toFixed(0)}` : 'N/A',
        lease: lease ? `$${lease.totalPayments.toFixed(0)}` : 'N/A',
        ppa: ppa ? `$${ppa.totalCostOverLife.toFixed(0)}` : 'N/A',
      },
      {
        metric: 'Ownership',
        cash: 'Yes',
        loan: 'Yes',
        lease: 'No',
        ppa: 'No',
      },
      {
        metric: 'Tax Credit',
        cash: 'Yes',
        loan: 'Yes',
        lease: 'No',
        ppa: 'No',
      },
    ];
  }
}

export const financingCalculatorService = new FinancingCalculatorService();
