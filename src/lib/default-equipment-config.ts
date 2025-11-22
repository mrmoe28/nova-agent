/**
 * Default Equipment Configuration
 * 
 * Configure which equipment should be selected by default when generating BOMs.
 * You can specify preferred manufacturers, model numbers, or name patterns.
 */

export interface DefaultEquipmentPreference {
  // Preferred manufacturer name (case-insensitive partial match)
  manufacturer?: string;
  // Preferred model number (case-insensitive partial match)
  modelNumber?: string;
  // Preferred name pattern (case-insensitive partial match)
  namePattern?: string;
  // Minimum/maximum price range
  minPrice?: number;
  maxPrice?: number;
  // Preferred distributor name (case-insensitive partial match)
  distributorName?: string;
}

export interface DefaultEquipmentConfig {
  solarPanel?: DefaultEquipmentPreference;
  battery?: DefaultEquipmentPreference;
  inverter?: DefaultEquipmentPreference;
  mounting?: DefaultEquipmentPreference;
  electrical?: DefaultEquipmentPreference;
}

/**
 * Default equipment selection preferences
 * 
 * ⚠️ IMPORTANT: Equipment selection is now MANDATORY.
 * This config is only used as a suggestion/filter when equipment is being selected.
 * Users must explicitly select equipment - no auto-selection will occur.
 * 
 * These preferences can help filter available equipment options, but equipment
 * must still be manually selected by the user in the UI.
 * 
 * Example configurations (for filtering only):
 * 
 * // Filter by manufacturer:
 * solarPanel: { manufacturer: "Trina" }
 * 
 * // Filter by model number:
 * inverter: { modelNumber: "IQ8PLUS" }
 * 
 * // Filter by name pattern:
 * battery: { namePattern: "Tesla Powerwall" }
 * 
 * // Filter by price range and manufacturer:
 * mounting: { manufacturer: "IronRidge", minPrice: 200, maxPrice: 500 }
 * 
 * // Filter from specific distributor:
 * electrical: { distributorName: "CED Greentech", maxPrice: 3000 }
 */
export const DEFAULT_EQUIPMENT_CONFIG: DefaultEquipmentConfig = {
  // All preferences are empty by default - no auto-selection
  // Users must explicitly select equipment in the UI
  solarPanel: {},
  battery: {},
  inverter: {},
  mounting: {},
  electrical: {},
};

/**
 * Selection strategy: how to prioritize equipment when multiple matches are found
 * 
 * ⚠️ NOTE: This is only used for filtering/sorting available options.
 * Equipment must still be explicitly selected by the user.
 */
export type SelectionStrategy = 
  | "cheapest"      // Sort by lowest price
  | "expensive"     // Sort by highest price  
  | "first"         // Sort by database order
  | "newest";       // Sort by most recently added

export const SELECTION_STRATEGY: SelectionStrategy = "first";

