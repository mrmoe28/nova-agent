import { readFile } from "fs/promises";
import { ParsedBillData } from "@/lib/ocr";

/**
 * Structure representing energy bill data in JSON format
 */
export interface EnergyBillJSON {
  utilityCompany?: string;
  accountNumber?: string;
  billingPeriod?: {
    start?: string;
    end?: string;
  };
  usage?: {
    kwh?: number;
    kw?: number;
  };
  charges?: {
    total?: number;
    energyCharge?: number;
    demandCharge?: number;
  };
  averageDailyUsage?: number;
  renewableSource?: {
    type?: string;
    capacity?: number;
    capacityUnit?: string;
  };
}

/**
 * Configuration options for the EnergyBillJSONPlugin
 */
export interface PluginConfig {
  /** Path to the JSON file to parse */
  filePath: string;
  /** Whether to validate the JSON schema against expected fields */
  validateSchema?: boolean;
  /** Whether to enforce strict validation (throw errors) or lenient (log warnings) */
  strictMode?: boolean;
}

/**
 * Valid renewable energy source types
 */
const VALID_RENEWABLE_SOURCES = [
  "solar",
  "wind",
  "hydro",
  "hydroelectric",
  "geothermal",
  "biomass",
  "tidal",
  "wave",
  "other",
] as const;

type RenewableSourceType = (typeof VALID_RENEWABLE_SOURCES)[number];

/**
 * Plugin for extracting energy bill data from JSON files
 *
 * This plugin provides a structured way to load and validate energy bill data
 * from JSON files, with support for renewable energy source information.
 *
 * @example
 * ```typescript
 * const plugin = new EnergyBillJSONPlugin({
 *   filePath: '/path/to/bill.json',
 *   validateSchema: true,
 *   strictMode: false
 * });
 *
 * const billData = await plugin.extractBillData();
 * const parsedData = plugin.toParsedBillData();
 * ```
 */
export class EnergyBillJSONPlugin {
  private config: Required<PluginConfig>;
  private billData: EnergyBillJSON | null = null;
  private validationErrors: string[] = [];
  private validationWarnings: string[] = [];

  /**
   * Create a new EnergyBillJSONPlugin instance
   *
   * @param config - Plugin configuration options
   */
  constructor(config: PluginConfig) {
    this.config = {
      validateSchema: config.validateSchema ?? true,
      strictMode: config.strictMode ?? false,
      ...config,
    };
  }

  /**
   * Extract bill data from JSON file
   *
   * Reads the JSON file, parses it, and optionally validates the schema.
   *
   * @returns Parsed energy bill data or null if extraction fails
   * @throws Error if file reading fails or validation fails in strict mode
   */
  async extractBillData(): Promise<EnergyBillJSON | null> {
    try {
      console.log(`Reading energy bill JSON from: ${this.config.filePath}`);
      const fileContent = await readFile(this.config.filePath, "utf-8");

      // Parse JSON
      let parsedData: unknown;
      try {
        parsedData = JSON.parse(fileContent);
      } catch (parseError) {
        const errorMsg = `Failed to parse JSON file: ${parseError instanceof Error ? parseError.message : "Unknown error"}`;
        console.error(errorMsg);
        if (this.config.strictMode) {
          throw new Error(errorMsg);
        }
        return null;
      }

      // Type check
      if (typeof parsedData !== "object" || parsedData === null) {
        const errorMsg = "JSON file does not contain an object";
        console.error(errorMsg);
        if (this.config.strictMode) {
          throw new Error(errorMsg);
        }
        return null;
      }

      this.billData = parsedData as EnergyBillJSON;

      // Validate schema if enabled
      if (this.config.validateSchema) {
        const isValid = this.validateBillData();
        if (!isValid && this.config.strictMode) {
          throw new Error(
            `Schema validation failed: ${this.validationErrors.join(", ")}`
          );
        }
      }

      console.log("Energy bill JSON extracted successfully");
      return this.billData;
    } catch (error) {
      const errorMsg = `Failed to extract bill data: ${error instanceof Error ? error.message : "Unknown error"}`;
      console.error(errorMsg);
      if (this.config.strictMode) {
        throw error;
      }
      return null;
    }
  }

  /**
   * Extract renewable energy source data
   *
   * Extracts and validates renewable source information including type and capacity.
   * Handles unit conversion between kW and MW.
   *
   * @returns Renewable source data or undefined if not available
   */
  extractRenewableData():
    | {
        type: string;
        capacity: number;
        capacityUnit: string;
      }
    | undefined {
    if (!this.billData?.renewableSource) {
      console.warn("No renewable source data found in bill");
      return undefined;
    }

    const { type, capacity, capacityUnit } = this.billData.renewableSource;

    if (!type) {
      this.validationWarnings.push("Renewable source type is missing");
      return undefined;
    }

    // Validate renewable source type
    const normalizedType = type.toLowerCase();
    const isValidType = VALID_RENEWABLE_SOURCES.some(
      (validType) => validType === normalizedType
    );

    if (!isValidType) {
      const warning = `Unknown renewable source type: "${type}". Valid types: ${VALID_RENEWABLE_SOURCES.join(", ")}`;
      this.validationWarnings.push(warning);
      console.warn(warning);
    }

    if (!capacity || capacity <= 0) {
      this.validationWarnings.push(
        "Renewable source capacity is missing or invalid"
      );
      return undefined;
    }

    // Validate and normalize capacity unit
    const normalizedUnit = capacityUnit?.toUpperCase() || "KW";
    if (!["KW", "MW"].includes(normalizedUnit)) {
      this.validationWarnings.push(
        `Unknown capacity unit: "${capacityUnit}". Assuming kW.`
      );
    }

    // Convert MW to kW if needed
    let normalizedCapacity = capacity;
    let finalUnit = normalizedUnit;

    if (normalizedUnit === "MW") {
      normalizedCapacity = capacity * 1000; // Convert MW to kW
      finalUnit = "KW";
      console.log(`Converted capacity: ${capacity} MW → ${normalizedCapacity} kW`);
    }

    return {
      type,
      capacity: normalizedCapacity,
      capacityUnit: finalUnit,
    };
  }

  /**
   * Validate bill data schema and field values
   *
   * Performs comprehensive validation of all bill data fields including:
   * - Required field presence checks
   * - Value range validations
   * - Type validations
   * - Renewable source validation
   *
   * @returns true if validation passes (or only has warnings), false if critical errors found
   * @private
   */
  private validateBillData(): boolean {
    this.validationErrors = [];
    this.validationWarnings = [];

    if (!this.billData) {
      this.validationErrors.push("Bill data is null or undefined");
      return false;
    }

    // Validate utility company
    if (!this.billData.utilityCompany || this.billData.utilityCompany.trim().length === 0) {
      this.validationWarnings.push("Utility company is missing");
    }

    // Validate account number
    if (!this.billData.accountNumber || this.billData.accountNumber.trim().length === 0) {
      this.validationWarnings.push("Account number is missing");
    }

    // Validate billing period
    if (!this.billData.billingPeriod) {
      this.validationWarnings.push("Billing period is missing");
    } else {
      if (!this.billData.billingPeriod.start) {
        this.validationWarnings.push("Billing period start date is missing");
      }
      if (!this.billData.billingPeriod.end) {
        this.validationWarnings.push("Billing period end date is missing");
      }

      // Validate date formats
      if (this.billData.billingPeriod.start && this.billData.billingPeriod.end) {
        try {
          const start = new Date(this.billData.billingPeriod.start);
          const end = new Date(this.billData.billingPeriod.end);

          if (isNaN(start.getTime())) {
            this.validationErrors.push(
              `Invalid billing period start date: ${this.billData.billingPeriod.start}`
            );
          }
          if (isNaN(end.getTime())) {
            this.validationErrors.push(
              `Invalid billing period end date: ${this.billData.billingPeriod.end}`
            );
          }
          if (start >= end) {
            this.validationErrors.push(
              "Billing period start date must be before end date"
            );
          }
        } catch (error) {
          this.validationErrors.push(
            `Failed to parse billing period dates: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }
    }

    // Validate usage data
    if (!this.billData.usage) {
      this.validationWarnings.push("Usage data is missing");
    } else {
      if (this.billData.usage.kwh !== undefined) {
        if (this.billData.usage.kwh < 0) {
          this.validationErrors.push("kWh usage cannot be negative");
        } else if (this.billData.usage.kwh > 100000) {
          this.validationWarnings.push(
            `kWh usage (${this.billData.usage.kwh}) seems unusually high`
          );
        }
      } else {
        this.validationWarnings.push("kWh usage is missing");
      }

      if (this.billData.usage.kw !== undefined) {
        if (this.billData.usage.kw < 0) {
          this.validationErrors.push("kW demand cannot be negative");
        } else if (this.billData.usage.kw > 10000) {
          this.validationWarnings.push(
            `kW demand (${this.billData.usage.kw}) seems unusually high`
          );
        }
      }
    }

    // Validate charges
    if (!this.billData.charges) {
      this.validationWarnings.push("Charges data is missing");
    } else {
      if (this.billData.charges.total !== undefined) {
        if (this.billData.charges.total < 0) {
          this.validationErrors.push("Total charges cannot be negative");
        } else if (this.billData.charges.total > 100000) {
          this.validationWarnings.push(
            `Total charges ($${this.billData.charges.total}) seems unusually high`
          );
        }
      } else {
        this.validationWarnings.push("Total charges amount is missing");
      }

      if (this.billData.charges.energyCharge !== undefined && this.billData.charges.energyCharge < 0) {
        this.validationErrors.push("Energy charge cannot be negative");
      }

      if (this.billData.charges.demandCharge !== undefined && this.billData.charges.demandCharge < 0) {
        this.validationErrors.push("Demand charge cannot be negative");
      }
    }

    // Validate average daily usage
    if (this.billData.averageDailyUsage !== undefined) {
      if (this.billData.averageDailyUsage < 0) {
        this.validationErrors.push("Average daily usage cannot be negative");
      } else if (this.billData.averageDailyUsage > 10000) {
        this.validationWarnings.push(
          `Average daily usage (${this.billData.averageDailyUsage} kWh) seems unusually high`
        );
      }
    }

    // Validate renewable source data
    if (this.billData.renewableSource) {
      const renewableData = this.extractRenewableData();
      if (!renewableData) {
        this.validationWarnings.push("Renewable source data is incomplete or invalid");
      }
    }

    // Log validation results
    if (this.validationErrors.length > 0) {
      console.error("Validation errors:", this.validationErrors);
    }
    if (this.validationWarnings.length > 0) {
      console.warn("Validation warnings:", this.validationWarnings);
    }

    // Return true if no critical errors (warnings are acceptable)
    return this.validationErrors.length === 0;
  }

  /**
   * Convert extracted bill data to ParsedBillData format
   *
   * Transforms the internal EnergyBillJSON structure to the standard
   * ParsedBillData format used throughout the application.
   *
   * @returns ParsedBillData object or null if no data has been extracted
   */
  toParsedBillData(): ParsedBillData | null {
    if (!this.billData) {
      console.warn("No bill data available. Call extractBillData() first.");
      return null;
    }

    const parsedData: ParsedBillData = {
      utilityCompany: this.billData.utilityCompany,
      accountNumber: this.billData.accountNumber,
      billingPeriod: this.billData.billingPeriod
        ? {
            start: this.billData.billingPeriod.start,
            end: this.billData.billingPeriod.end,
          }
        : undefined,
      usage: this.billData.usage
        ? {
            kwh: this.billData.usage.kwh,
            kw: this.billData.usage.kw,
          }
        : undefined,
      charges: this.billData.charges
        ? {
            total: this.billData.charges.total,
            energyCharge: this.billData.charges.energyCharge,
            demandCharge: this.billData.charges.demandCharge,
          }
        : undefined,
      averageDailyUsage: this.billData.averageDailyUsage,
      renewableSource: this.extractRenewableData(),
    };

    return parsedData;
  }

  /**
   * Get validation errors from the last validation run
   *
   * @returns Array of validation error messages
   */
  getValidationErrors(): string[] {
    return [...this.validationErrors];
  }

  /**
   * Get validation warnings from the last validation run
   *
   * @returns Array of validation warning messages
   */
  getValidationWarnings(): string[] {
    return [...this.validationWarnings];
  }
}

/**
 * Convenience function to load energy bill data from a JSON file
 *
 * This is a simplified interface for loading bill data without needing
 * to instantiate the plugin class directly.
 *
 * @param filePath - Path to the JSON file
 * @param validateSchema - Whether to validate the schema (default: true)
 * @param strictMode - Whether to enforce strict validation (default: false)
 * @returns ParsedBillData object or null if loading fails
 *
 * @example
 * ```typescript
 * const billData = await loadEnergyBillFromJSON('/path/to/bill.json');
 * if (billData) {
 *   console.log(`Total charges: $${billData.charges?.total}`);
 *   console.log(`kWh usage: ${billData.usage?.kwh}`);
 * }
 * ```
 */
export async function loadEnergyBillFromJSON(
  filePath: string,
  validateSchema = true,
  strictMode = false
): Promise<ParsedBillData | null> {
  const plugin = new EnergyBillJSONPlugin({
    filePath,
    validateSchema,
    strictMode,
  });

  await plugin.extractBillData();
  return plugin.toParsedBillData();
}
