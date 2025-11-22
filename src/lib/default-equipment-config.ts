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
 * Edit these values to change which equipment gets auto-selected for BOMs:
 * 
 * Example configurations:
 * 
 * // Select by manufacturer:
 * solarPanel: { manufacturer: "Trina" }
 * 
 * // Select by model number:
 * inverter: { modelNumber: "IQ8PLUS" }
 * 
 * // Select by name pattern:
 * battery: { namePattern: "Tesla Powerwall" }
 * 
 * // Select by price range and manufacturer:
 * mounting: { manufacturer: "IronRidge", minPrice: 200, maxPrice: 500 }
 * 
 * // Select from specific distributor:
 * electrical: { distributorName: "CED Greentech", maxPrice: 3000 }
 */
export const DEFAULT_EQUIPMENT_CONFIG: DefaultEquipmentConfig = {
  // Solar Panel Preferences
  // Leave empty {} to use first available, or specify criteria:
  solarPanel: {
    // manufacturer: "Trina",
    // modelNumber: "TSM-DE21",
    // namePattern: "bifacial",
    // minPrice: 100,
    // maxPrice: 300,
  },

  // Battery Preferences  
  battery: {
    // manufacturer: "SimpliPhi",
    // modelNumber: "PHI",
    // namePattern: "LFP",
    // minPrice: 5000,
    // maxPrice: 15000,
  },

  // Inverter Preferences
  inverter: {
    // manufacturer: "Enphase",
    // modelNumber: "IQ8",
    // namePattern: "microinverter",
    // minPrice: 100,
    // maxPrice: 500,
  },

  // Mounting System Preferences
  mounting: {
    // manufacturer: "IronRidge",
    // namePattern: "rail",
    // minPrice: 200,
    // maxPrice: 600,
  },

  // Electrical Components Preferences
  electrical: {
    // manufacturer: "Schneider",
    // namePattern: "disconnect",
    // maxPrice: 3000,
  },
};

/**
 * Selection strategy: how to prioritize equipment when multiple matches are found
 */
export type SelectionStrategy = 
  | "cheapest"      // Select lowest price
  | "expensive"     // Select highest price  
  | "first"         // Select first match (database order)
  | "newest";       // Select most recently added

export const SELECTION_STRATEGY: SelectionStrategy = "first";

