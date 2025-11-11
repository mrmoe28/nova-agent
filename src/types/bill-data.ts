/**
 * Bill Data Type Definitions
 *
 * This file defines the TypeScript types for the extracted bill data structure.
 * The data is stored as JSON strings in the database (`Bill.extractedData` field)
 * and parsed/validated at runtime.
 */

/**
 * Renewable Energy Source Information
 *
 * Captures information about existing renewable energy installations
 * found on utility bills (e.g., solar panels with net metering).
 *
 * @example
 * ```json
 * {
 *   "type": "solar",
 *   "capacity": 5.5,
 *   "capacityUnit": "kW"
 * }
 * ```
 */
export interface RenewableSource {
  /**
   * Type of renewable energy source
   * Valid values: 'solar', 'wind', 'hydro', 'geothermal', 'biomass'
   */
  type?: string;

  /**
   * Nameplate capacity of the renewable installation
   * Should be a positive number
   * Typical residential range: 1-20 kW
   * Commercial/utility-scale: > 100 kW
   */
  capacity?: number;

  /**
   * Unit of capacity measurement
   * Expected value: 'kW' (kilowatts)
   * Alternative values: 'kw', 'kilowatt', 'kilowatts'
   */
  capacityUnit?: string;
}

/**
 * Billing Period Information
 *
 * Defines the start and end dates for a billing cycle.
 * Dates may be in various formats depending on the utility company.
 *
 * @example
 * ```json
 * {
 *   "start": "Aug 29, 2025",
 *   "end": "Sept 30, 2025"
 * }
 * ```
 */
export interface BillingPeriod {
  /**
   * Start date of billing period
   * Format varies by utility (e.g., "MM/DD/YYYY", "Aug 29, 2025")
   */
  start?: string;

  /**
   * End date of billing period
   * Format varies by utility (e.g., "MM/DD/YYYY", "Sept 30, 2025")
   */
  end?: string;
}

/**
 * Energy Usage Information
 *
 * Captures electricity consumption (kWh) and demand (kW) from the bill.
 *
 * @example
 * ```json
 * {
 *   "kwh": 850,
 *   "kw": 15.5
 * }
 * ```
 */
export interface Usage {
  /**
   * Total kilowatt-hours (kWh) consumed during billing period
   * Typical residential range: 200-2000 kWh/month
   * Commercial range: > 2000 kWh/month
   */
  kwh?: number;

  /**
   * Peak demand in kilowatts (kW)
   * Only present on demand-based rate schedules (typically commercial)
   * Represents the maximum instantaneous power draw during the billing period
   */
  kw?: number;
}

/**
 * Bill Charges Breakdown
 *
 * Financial breakdown of the utility bill charges.
 * All amounts are in USD.
 *
 * @example
 * ```json
 * {
 *   "total": 144.00,
 *   "energyCharge": 85.50,
 *   "demandCharge": 35.00
 * }
 * ```
 */
export interface Charges {
  /**
   * Total amount due (USD)
   * This is the final amount the customer must pay
   */
  total?: number;

  /**
   * Energy charges (USD)
   * Based on kWh consumption
   */
  energyCharge?: number;

  /**
   * Demand charges (USD)
   * Based on peak kW demand (commercial/industrial bills only)
   */
  demandCharge?: number;
}

/**
 * Extracted Bill Data Structure
 *
 * Complete structure of data extracted from utility bills via OCR and parsing.
 * This interface matches the JSON stored in `Bill.extractedData` field.
 *
 * All fields are optional because OCR extraction may fail to capture certain values.
 * The quality of extraction depends on:
 * - File type (PDF is most reliable, images less so)
 * - Bill format and utility company
 * - OCR confidence level
 *
 * @example Complete bill data
 * ```json
 * {
 *   "utilityCompany": "Georgia Power",
 *   "accountNumber": "02608-44013",
 *   "billingPeriod": {
 *     "start": "Aug 29, 2025",
 *     "end": "Sept 30, 2025"
 *   },
 *   "usage": {
 *     "kwh": 850,
 *     "kw": 15.5
 *   },
 *   "charges": {
 *     "total": 144.00,
 *     "energyCharge": 85.50,
 *     "demandCharge": 35.00
 *   },
 *   "averageDailyUsage": 27.5,
 *   "renewableSource": {
 *     "type": "solar",
 *     "capacity": 5.5,
 *     "capacityUnit": "kW"
 *   }
 * }
 * ```
 *
 * @see {@link /Users/ekodevapps/Downloads/nova-agent-main/src/lib/ocr.ts} for parsing implementation
 * @see {@link /Users/ekodevapps/Downloads/nova-agent-main/prisma/schema.prisma} for database schema
 */
export interface ExtractedBillData {
  /**
   * Utility company name
   * Examples: "Georgia Power", "PG&E", "Duke Energy", "Con Edison"
   */
  utilityCompany?: string;

  /**
   * Customer account number
   * Format varies by utility (e.g., "02608-44013", "A123456789")
   */
  accountNumber?: string;

  /**
   * Billing period date range
   */
  billingPeriod?: BillingPeriod;

  /**
   * Energy usage (kWh and kW)
   */
  usage?: Usage;

  /**
   * Bill charges breakdown
   */
  charges?: Charges;

  /**
   * Average daily electricity usage (kWh/day)
   * Calculated as: totalKwh / daysInBillingPeriod
   * Useful for sizing solar systems and batteries
   */
  averageDailyUsage?: number;

  /**
   * Existing renewable energy installation information
   * Present only if the bill indicates the customer has an existing
   * renewable energy system (typically indicated by net metering credits
   * or solar production data on the bill)
   */
  renewableSource?: RenewableSource;
}

/**
 * Validation Result for Renewable Source Data
 *
 * Returned by `validateRenewableSource()` function.
 *
 * @example Valid renewable source
 * ```typescript
 * const validation = validateRenewableSource({
 *   type: 'solar',
 *   capacity: 5.5,
 *   capacityUnit: 'kW'
 * });
 * // Result:
 * // {
 * //   isValid: true,
 * //   errors: [],
 * //   warnings: []
 * // }
 * ```
 *
 * @example Invalid renewable source
 * ```typescript
 * const validation = validateRenewableSource({
 *   type: 'invalid_type',
 *   capacity: -10,
 *   capacityUnit: 'kW'
 * });
 * // Result:
 * // {
 * //   isValid: false,
 * //   errors: [
 * //     'Invalid renewable type: "invalid_type". Must be one of: solar, wind, hydro, geothermal, biomass',
 * //     'Capacity must be greater than 0'
 * //   ],
 * //   warnings: []
 * // }
 * ```
 */
export interface RenewableSourceValidation {
  /**
   * Whether the renewable source data passes all validation rules
   * False if any errors are present
   */
  isValid: boolean;

  /**
   * Array of validation errors (blocking issues)
   * - Invalid renewable type
   * - Capacity <= 0 or > 100,000 kW
   */
  errors: string[];

  /**
   * Array of validation warnings (non-blocking issues)
   * - Missing optional fields
   * - Unusual but valid values (e.g., capacity < 1 kW or > 10 MW)
   * - Non-standard capacity units
   */
  warnings: string[];
}

/**
 * Capacity Calculation Result
 *
 * Output from `calculateRenewableCapacity()` function.
 * Provides effective capacity and annual production estimates.
 *
 * @example Solar capacity calculation
 * ```typescript
 * const result = calculateRenewableCapacity('solar', 5.5);
 * // Result:
 * // {
 * //   sourceType: 'solar',
 * //   nameplateCapacityKw: 5.5,
 * //   capacityFactor: 0.20,
 * //   effectiveCapacityKw: 1.1,
 * //   annualProductionKwh: 9636
 * // }
 * ```
 */
export interface CapacityCalculation {
  /**
   * Type of renewable energy source
   */
  sourceType: string;

  /**
   * Nameplate/rated capacity (kW)
   * The maximum output under ideal conditions
   */
  nameplateCapacityKw: number;

  /**
   * Capacity factor (0-1 scale)
   * Industry-standard values:
   * - Solar: 0.20 (20%)
   * - Wind: 0.35 (35%)
   * - Hydro: 0.50 (50%)
   * - Geothermal: 0.75 (75%)
   * - Biomass: 0.80 (80%)
   */
  capacityFactor: number;

  /**
   * Effective average capacity (kW)
   * Calculated as: nameplateCapacity × capacityFactor
   */
  effectiveCapacityKw: number;

  /**
   * Estimated annual production (kWh/year)
   * Calculated as: nameplateCapacity × capacityFactor × 8760 hours/year
   */
  annualProductionKwh: number;
}

/**
 * Type guard to check if data is ExtractedBillData
 */
export function isExtractedBillData(data: unknown): data is ExtractedBillData {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // At minimum, should have one of the key fields
  return (
    typeof obj.utilityCompany === 'string' ||
    typeof obj.accountNumber === 'string' ||
    obj.usage !== undefined ||
    obj.charges !== undefined
  );
}

/**
 * Type guard to check if data is RenewableSource
 */
export function isRenewableSource(data: unknown): data is RenewableSource {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Should have at least a type or capacity
  return (
    typeof obj.type === 'string' ||
    typeof obj.capacity === 'number'
  );
}
