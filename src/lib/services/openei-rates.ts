/**
 * OpenEI Utility Rate Database Integration
 * Fetches real utility tariff data instead of using estimates
 * API Documentation: https://openei.org/services/doc/rest/util_rates
 */

export interface OpenEIRate {
  label: string;
  name: string;
  utility: string;
  sector: 'Residential' | 'Commercial' | 'Industrial';
  description?: string;
  source?: string;
  uri: string;

  // Rate structure
  energyratestructure?: Array<{
    rate: number;
    unit: string;
    adj?: number;
    max?: number;
    min?: number;
    sell?: number;
  }>;

  demandratestructure?: Array<{
    rate: number;
    unit: string;
    adj?: number;
    max?: number;
    min?: number;
  }>;

  flatdemandstructure?: Array<{
    rate: number;
    unit: string;
    adj?: number;
    max?: number;
    min?: number;
  }>;

  fixedmonthlycharge?: number;
  mincharge?: number;

  // Effective dates
  startdate?: number;
  enddate?: number;
  approved?: boolean;
}

export interface OpenEIResponse {
  version: string;
  count: number;
  items: OpenEIRate[];
}

export interface SimplifiedTariff {
  utilityName: string;
  tariffName: string;
  sector: 'Residential' | 'Commercial' | 'Industrial';

  // Rate information
  averageEnergyRate: number; // $/kWh
  fixedMonthlyCharge: number;
  hasDemandCharges: boolean;
  demandChargeRate?: number; // $/kW

  // Time-of-use information
  hasTimeOfUse: boolean;
  onPeakRate?: number;
  offPeakRate?: number;

  // Metadata
  effectiveDate?: string;
  source: string;
  confidence: number;
}

class OpenEIRatesService {
  private apiKey: string;
  private baseUrl = 'https://api.openei.org/utility_rates';
  private version = 'v3';

  constructor() {
    this.apiKey = process.env.OPENEI_API_KEY || 'DEMO_KEY';
  }

  /**
   * Check if OpenEI API is configured (will work with DEMO_KEY but limited)
   */
  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  /**
   * Search for utility rates by address
   */
  async getRatesByAddress(address: string, sector: 'Residential' | 'Commercial' | 'Industrial' = 'Residential'): Promise<SimplifiedTariff[]> {
    if (!this.isConfigured()) {
      console.warn('OpenEI API key not configured, using DEMO_KEY (limited usage)');
    }

    const url = `${this.baseUrl}?version=${this.version}&format=json&api_key=${this.apiKey}&address=${encodeURIComponent(address)}&sector=${sector}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`OpenEI API error: ${response.status}`);
    }

    const data: OpenEIResponse = await response.json();

    // Convert to simplified tariffs
    return data.items.slice(0, 10).map(rate => this.simplifyTariff(rate));
  }

  /**
   * Get rates by coordinates
   */
  async getRatesByCoordinates(
    latitude: number,
    longitude: number,
    sector: 'Residential' | 'Commercial' | 'Industrial' = 'Residential'
  ): Promise<SimplifiedTariff[]> {
    if (!this.isConfigured()) {
      console.warn('OpenEI API key not configured, using DEMO_KEY (limited usage)');
    }

    const url = `${this.baseUrl}?version=${this.version}&format=json&api_key=${this.apiKey}&lat=${latitude}&lon=${longitude}&sector=${sector}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`OpenEI API error: ${response.status}`);
    }

    const data: OpenEIResponse = await response.json();

    // Convert to simplified tariffs
    return data.items.slice(0, 10).map(rate => this.simplifyTariff(rate));
  }

  /**
   * Get the best rate for a location (most common/default residential rate)
   */
  async getBestRateForLocation(
    address: string,
    sector: 'Residential' | 'Commercial' | 'Industrial' = 'Residential'
  ): Promise<SimplifiedTariff> {
    const rates = await this.getRatesByAddress(address, sector);

    if (rates.length === 0) {
      throw new Error('No utility rates found for this location');
    }

    // Prioritize:
    // 1. Rates with "residential" or "general service" in name
    // 2. Rates with higher confidence
    // 3. Most recent rates
    const scoredRates = rates.map(rate => {
      let score = rate.confidence * 100;

      // Boost score for common rate names
      const nameLower = rate.tariffName.toLowerCase();
      if (nameLower.includes('residential') || nameLower.includes('general')) score += 50;
      if (nameLower.includes('basic') || nameLower.includes('standard')) score += 30;
      if (nameLower.includes('tiered') || nameLower.includes('tou')) score -= 10; // Prefer simpler rates

      return { rate, score };
    });

    scoredRates.sort((a, b) => b.score - a.score);

    return scoredRates[0].rate;
  }

  /**
   * Convert OpenEI rate to simplified tariff
   */
  private simplifyTariff(rate: OpenEIRate): SimplifiedTariff {
    // Calculate average energy rate
    let averageEnergyRate = 0.12; // Default fallback
    let hasTimeOfUse = false;
    let onPeakRate: number | undefined;
    let offPeakRate: number | undefined;

    if (rate.energyratestructure && rate.energyratestructure.length > 0) {
      // Simple average of all energy rates
      const rates = rate.energyratestructure.map(r => r.rate);
      averageEnergyRate = rates.reduce((a, b) => a + b, 0) / rates.length;

      // Check for time-of-use
      if (rate.energyratestructure.length > 1) {
        hasTimeOfUse = true;
        // Assume first rate is on-peak, last is off-peak
        onPeakRate = Math.max(...rates);
        offPeakRate = Math.min(...rates);
      }
    }

    // Fixed monthly charge
    const fixedMonthlyCharge = rate.fixedmonthlycharge || 0;

    // Demand charges
    const hasDemandCharges = !!((rate.demandratestructure && rate.demandratestructure.length > 0) ||
      (rate.flatdemandstructure && rate.flatdemandstructure.length > 0));

    let demandChargeRate: number | undefined;
    if (rate.demandratestructure && rate.demandratestructure.length > 0) {
      const rates = rate.demandratestructure.map(r => r.rate);
      demandChargeRate = rates.reduce((a, b) => a + b, 0) / rates.length;
    } else if (rate.flatdemandstructure && rate.flatdemandstructure.length > 0) {
      const rates = rate.flatdemandstructure.map(r => r.rate);
      demandChargeRate = rates.reduce((a, b) => a + b, 0) / rates.length;
    }

    // Effective date
    let effectiveDate: string | undefined;
    if (rate.startdate) {
      effectiveDate = new Date(rate.startdate * 1000).toISOString().split('T')[0];
    }

    // Confidence score based on data completeness
    let confidence = 0.5;
    if (rate.energyratestructure && rate.energyratestructure.length > 0) confidence += 0.2;
    if (rate.approved) confidence += 0.2;
    if (rate.startdate) confidence += 0.1;

    return {
      utilityName: rate.utility,
      tariffName: rate.name || rate.label,
      sector: rate.sector,
      averageEnergyRate,
      fixedMonthlyCharge,
      hasDemandCharges,
      demandChargeRate,
      hasTimeOfUse,
      onPeakRate,
      offPeakRate,
      effectiveDate,
      source: rate.uri,
      confidence,
    };
  }

  /**
   * Calculate estimated bill based on tariff and usage
   */
  calculateBill(
    tariff: SimplifiedTariff,
    monthlyKwh: number,
    peakKw?: number
  ): {
    energyCharges: number;
    demandCharges: number;
    fixedCharges: number;
    totalBill: number;
  } {
    const energyCharges = monthlyKwh * tariff.averageEnergyRate;
    const demandCharges = (peakKw && tariff.demandChargeRate) ?
      peakKw * tariff.demandChargeRate : 0;
    const fixedCharges = tariff.fixedMonthlyCharge;
    const totalBill = energyCharges + demandCharges + fixedCharges;

    return {
      energyCharges,
      demandCharges,
      fixedCharges,
      totalBill,
    };
  }
}

export const openEIRatesService = new OpenEIRatesService();
