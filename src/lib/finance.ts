/**
 * Calculates the Levelized Cost of Energy (LCOE).
 * LCOE = (Total Lifecycle Cost) / (Total Lifetime Energy Production)
 * @param netSystemCost The initial cost of the system after incentives.
 * @param lifetimeProductionKwh Total energy production over the system's life (in kWh).
 * @param annualOandMCost Annual operations and maintenance cost.
 * @param lifetimeYears The lifetime of the system in years.
 * @returns The LCOE in $/kWh.
 */
export function calculateLCOE({
  netSystemCost,
  lifetimeProductionKwh,
  annualOandMCost = 0,
  lifetimeYears = 25,
}: {
  netSystemCost: number;
  lifetimeProductionKwh: number;
  annualOandMCost?: number;
  lifetimeYears?: number;
}): number {
  if (lifetimeProductionKwh <= 0) return 0;
  const totalOandM = annualOandMCost * lifetimeYears;
  const totalLifecycleCost = netSystemCost + totalOandM;
  return totalLifecycleCost / lifetimeProductionKwh;
}

/**
 * Calculates the Net Present Value (NPV) of an investment.
 * @param initialInvestment The initial cost of the system (a negative number).
 * @param cashFlows An array of future cash flows (annual savings).
 * @param discountRate The discount rate (e.g., 0.05 for 5%).
 * @returns The NPV of the investment.
 */
export function calculateNPV({
  initialInvestment,
  cashFlows,
  discountRate,
}: {
  initialInvestment: number;
  cashFlows: number[];
  discountRate: number;
}): number {
  let npv = initialInvestment;
  for (let i = 0; i < cashFlows.length; i++) {
    npv += cashFlows[i] / Math.pow(1 + discountRate, i + 1);
  }
  return npv;
}

/**
 * Calculates the Internal Rate of Return (IRR) using an iterative approach.
 * IRR is the discount rate at which NPV becomes zero.
 * @param cashFlows An array of cash flows, with the initial investment as the first (negative) item.
 * @returns The IRR as a percentage (e.g., 0.1 for 10%).
 */
export function calculateIRR(cashFlows: number[]): number | null {
    const maxIterations = 1000;
    const precision = 0.00001;
    let guess = 0.1; // Start with a 10% guess
    let step = 0.05;

    for (let i = 0; i < maxIterations; i++) {
        const npv = calculateNPV({ initialInvestment: cashFlows[0], cashFlows: cashFlows.slice(1), discountRate: guess });
        
        if (Math.abs(npv) < precision) {
            return guess;
        }

        // Adjust guess based on NPV
        if (npv > 0) {
            guess += step;
        } else {
            // Overshot, so go back and halve the step size
            guess -= step;
            step /= 2;
        }
    }
    
    // If no solution found after max iterations
    console.warn("IRR calculation did not converge. Returning null.");
    return null;
}

/**
 * Generates an array of lifetime energy production, accounting for degradation.
 * @param year1ProductionKwh The energy produced in the first year.
 * @param lifetimeYears The lifetime of the system.
 * @param degradationRate The annual degradation rate (e.g., 0.005 for 0.5%).
 * @returns An array of annual energy production values.
 */
export function getLifetimeProduction({
    year1ProductionKwh,
    lifetimeYears = 25,
    degradationRate = 0.005,
}: {
    year1ProductionKwh: number;
    lifetimeYears?: number;
    degradationRate?: number;
}): number[] {
    const production = [];
    for (let year = 0; year < lifetimeYears; year++) {
        production.push(year1ProductionKwh * Math.pow(1 - degradationRate, year));
    }
    return production;
}
