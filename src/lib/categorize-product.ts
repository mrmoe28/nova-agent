import { EquipmentCategory } from "@prisma/client";

/**
 * Auto-categorize equipment based on name and description
 * Uses keyword matching to determine the most likely category
 */
export function categorizeProduct(
  name: string,
  description?: string | null
): EquipmentCategory {
  const text = `${name} ${description || ""}`.toLowerCase();

  // Solar Panel keywords
  if (
    /\b(solar panel|photovoltaic|pv module|pv panel|monocrystalline|polycrystalline|bifacial panel|rigid solar panel|flexible solar panel)\b/i.test(
      text
    )
  ) {
    return "SOLAR_PANEL";
  }

  // Battery keywords
  if (
    /\b(battery|batteries|energy storage|lithium|lifepo4|lead acid|agm|gel battery|powerwall|storage system|battery bank)\b/i.test(
      text
    )
  ) {
    return "BATTERY";
  }

  // Inverter keywords
  if (
    /\b(inverter|micro-inverter|microinverter|string inverter|hybrid inverter|grid-tie|off-grid inverter|all-in-one inverter|hybrid-inverters?)\b/i.test(
      text
    )
  ) {
    return "INVERTER";
  }

  // Charge Controller keywords
  if (
    /\b(charge controller|mppt|pwm controller|solar controller|battery controller)\b/i.test(
      text
    )
  ) {
    return "CHARGE_CONTROLLER";
  }

  // Mounting keywords
  if (
    /\b(mounting|mount|rack|racking|rail|clamp|bracket|mounting system|roof mount|ground mount)\b/i.test(
      text
    )
  ) {
    return "MOUNTING";
  }

  // Wiring keywords
  if (
    /\b(wire|wiring|cable|conductor|mc4|connector|junction box|combiner box|conduit)\b/i.test(
      text
    )
  ) {
    return "WIRING";
  }

  // Electrical keywords
  if (
    /\b(breaker|disconnect|fuse|surge protector|panel board|electrical panel|distribution|switch)\b/i.test(
      text
    )
  ) {
    return "ELECTRICAL";
  }

  // Monitoring keywords
  if (
    /\b(monitoring|meter|sensor|gateway|data logger|monitoring system|energy monitor)\b/i.test(
      text
    )
  ) {
    return "MONITORING";
  }

  // Accessories keywords
  if (
    /\b(tool|kit|adapter|accessory|hardware|fastener|label|tag|marker)\b/i.test(
      text
    )
  ) {
    return "ACCESSORIES";
  }

  // Default to OTHER if no match
  return "OTHER";
}

/**
 * Get display name for category
 */
export function getCategoryDisplayName(category: EquipmentCategory): string {
  const displayNames: Record<EquipmentCategory, string> = {
    SOLAR_PANEL: "Solar Panels",
    BATTERY: "Batteries",
    INVERTER: "Inverters",
    CHARGE_CONTROLLER: "Charge Controllers",
    MOUNTING: "Mounting Systems",
    WIRING: "Wiring & Cables",
    ELECTRICAL: "Electrical Components",
    MONITORING: "Monitoring Systems",
    ACCESSORIES: "Accessories",
    OTHER: "Other",
  };
  return displayNames[category];
}

/**
 * Get all categories for filter dropdown
 */
export function getAllCategories(): Array<{
  value: EquipmentCategory;
  label: string;
}> {
  return [
    { value: "SOLAR_PANEL", label: "Solar Panels" },
    { value: "BATTERY", label: "Batteries" },
    { value: "INVERTER", label: "Inverters" },
    { value: "CHARGE_CONTROLLER", label: "Charge Controllers" },
    { value: "MOUNTING", label: "Mounting Systems" },
    { value: "WIRING", label: "Wiring & Cables" },
    { value: "ELECTRICAL", label: "Electrical Components" },
    { value: "MONITORING", label: "Monitoring Systems" },
    { value: "ACCESSORIES", label: "Accessories" },
    { value: "OTHER", label: "Other" },
  ];
}
