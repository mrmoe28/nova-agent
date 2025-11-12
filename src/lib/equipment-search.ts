/**
 * Equipment Catalog Search
 *
 * Provides intelligent search capabilities for the equipment catalog.
 * Used by the AI assistant to find products based on user queries.
 */

import { prisma } from "./prisma";
import { EquipmentCategory } from "@prisma/client";
import { createLogger } from "./logger";

const logger = createLogger("equipment-search");

export interface EquipmentSearchOptions {
  category?: EquipmentCategory;
  manufacturer?: string;
  minPrice?: number;
  maxPrice?: number;
  minWattage?: number; // For solar panels
  minCapacity?: number; // For batteries (kWh)
  minPower?: number; // For inverters (kW)
  inStockOnly?: boolean;
  limit?: number;
}

export interface EquipmentSearchResult {
  id: string;
  name: string;
  manufacturer: string | null;
  modelNumber: string;
  category: EquipmentCategory;
  description: string | null;
  unitPrice: number;
  imageUrl: string | null;
  sourceUrl: string | null;
  inStock: boolean;
  distributor: {
    id: string;
    name: string;
    website: string | null;
  };
  specifications?: Record<string, unknown>;
}

/**
 * Search equipment catalog with flexible filters
 */
export async function searchEquipment(
  query: string,
  options: EquipmentSearchOptions = {},
): Promise<EquipmentSearchResult[]> {
  logger.info({ query, options }, "Searching equipment catalog");

  try {
    const {
      category,
      manufacturer,
      minPrice,
      maxPrice,
      inStockOnly = false,
      limit = 10,
    } = options;

    // Build where clause
    const where: Record<string, unknown> = {
      isActive: true,
    };

    // Category filter
    if (category) {
      where.category = category;
    }

    // Manufacturer filter
    if (manufacturer) {
      where.manufacturer = {
        contains: manufacturer,
        mode: "insensitive",
      };
    }

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.unitPrice = {};
      if (minPrice !== undefined) {
        (where.unitPrice as Record<string, number>).gte = minPrice;
      }
      if (maxPrice !== undefined) {
        (where.unitPrice as Record<string, number>).lte = maxPrice;
      }
    }

    // Stock filter
    if (inStockOnly) {
      where.inStock = true;
    }

    // Text search in name, model, description
    if (query && query.trim() !== "") {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { modelNumber: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ];
    }

    const equipment = await prisma.equipment.findMany({
      where: where as never,
      include: {
        distributor: {
          select: {
            id: true,
            name: true,
            website: true,
          },
        },
      },
      orderBy: [{ unitPrice: "asc" }, { name: "asc" }],
      take: limit,
    });

    logger.info({ resultCount: equipment.length }, "Equipment search completed");

    return equipment.map((item) => ({
      id: item.id,
      name: item.name,
      manufacturer: item.manufacturer,
      modelNumber: item.modelNumber,
      category: item.category,
      description: item.description,
      unitPrice: item.unitPrice,
      imageUrl: item.imageUrl,
      sourceUrl: item.sourceUrl,
      inStock: item.inStock,
      distributor: item.distributor,
      specifications: item.specifications
        ? (JSON.parse(item.specifications as string) as Record<string, unknown>)
        : undefined,
    }));
  } catch (error) {
    logger.error({ error, query, options }, "Equipment search failed");
    throw error;
  }
}

/**
 * Get equipment by category with optional filters
 */
export async function getEquipmentByCategory(
  category: EquipmentCategory,
  options: Omit<EquipmentSearchOptions, "category"> = {},
): Promise<EquipmentSearchResult[]> {
  return searchEquipment("", { ...options, category });
}

/**
 * Find solar panels matching criteria
 */
export async function findSolarPanels(
  minWattage?: number,
  maxPrice?: number,
  limit = 10,
): Promise<EquipmentSearchResult[]> {
  const results = await searchEquipment("", {
    category: "SOLAR_PANEL",
    maxPrice,
    limit: limit * 2, // Get more for filtering
  });

  // Filter by wattage if specified (wattage often in name)
  if (minWattage) {
    return results
      .filter((item) => {
        // Extract wattage from name (e.g., "400W", "400 Watt")
        const wattageMatch = item.name.match(/(\d+)\s*W(att)?/i);
        if (wattageMatch) {
          const wattage = parseInt(wattageMatch[1]);
          return wattage >= minWattage;
        }
        return false;
      })
      .slice(0, limit);
  }

  return results.slice(0, limit);
}

/**
 * Find batteries matching criteria
 */
export async function findBatteries(
  minCapacityKwh?: number,
  maxPrice?: number,
  limit = 10,
): Promise<EquipmentSearchResult[]> {
  const results = await searchEquipment("battery", {
    category: "BATTERY",
    maxPrice,
    limit: limit * 2,
  });

  // Filter by capacity if specified
  if (minCapacityKwh) {
    return results
      .filter((item) => {
        // Extract capacity from name (e.g., "13.5kWh", "10 kWh")
        const capacityMatch = item.name.match(/(\d+(?:\.\d+)?)\s*kWh/i);
        if (capacityMatch) {
          const capacity = parseFloat(capacityMatch[1]);
          return capacity >= minCapacityKwh;
        }
        return false;
      })
      .slice(0, limit);
  }

  return results.slice(0, limit);
}

/**
 * Find inverters matching criteria
 */
export async function findInverters(
  minPowerKw?: number,
  maxPrice?: number,
  limit = 10,
): Promise<EquipmentSearchResult[]> {
  const results = await searchEquipment("inverter", {
    category: "INVERTER",
    maxPrice,
    limit: limit * 2,
  });

  // Filter by power if specified
  if (minPowerKw) {
    return results
      .filter((item) => {
        // Extract power from name (e.g., "7.6kW", "10 kW")
        const powerMatch = item.name.match(/(\d+(?:\.\d+)?)\s*kW/i);
        if (powerMatch) {
          const power = parseFloat(powerMatch[1]);
          return power >= minPowerKw;
        }
        return false;
      })
      .slice(0, limit);
  }

  return results.slice(0, limit);
}

/**
 * Get equipment recommendations for a system
 */
export async function getSystemRecommendations(
  solarKw: number,
  batteryKwh: number,
  inverterKw: number,
): Promise<{
  panels: EquipmentSearchResult[];
  batteries: EquipmentSearchResult[];
  inverters: EquipmentSearchResult[];
}> {
  logger.info(
    { solarKw, batteryKwh, inverterKw },
    "Getting system recommendations",
  );

  // Calculate required panel wattage (assuming 400W panels)
  const panelWattage = 400;
  const panelCount = Math.ceil((solarKw * 1000) / panelWattage);

  const [panels, batteries, inverters] = await Promise.all([
    findSolarPanels(350, undefined, 5), // 350W+ panels
    findBatteries(batteryKwh * 0.8, undefined, 5), // At least 80% of needed capacity
    findInverters(inverterKw * 0.9, undefined, 5), // At least 90% of needed power
  ]);

  logger.info(
    {
      panelsFound: panels.length,
      batteriesFound: batteries.length,
      invertersFound: inverters.length,
    },
    "Recommendations generated",
  );

  return {
    panels,
    batteries,
    inverters,
  };
}

/**
 * Format equipment search results for AI context
 */
export function formatEquipmentForAI(
  equipment: EquipmentSearchResult[],
): string {
  if (equipment.length === 0) {
    return "No equipment found matching the criteria.";
  }

  return equipment
    .map((item, index) => {
      const specs = [];
      if (item.manufacturer) specs.push(`Manufacturer: ${item.manufacturer}`);
      specs.push(`Model: ${item.modelNumber}`);
      specs.push(`Price: $${item.unitPrice.toFixed(2)}`);
      specs.push(`Stock: ${item.inStock ? "In Stock" : "Out of Stock"}`);
      if (item.description) specs.push(`Description: ${item.description}`);
      specs.push(`Distributor: ${item.distributor.name}`);
      if (item.sourceUrl) specs.push(`URL: ${item.sourceUrl}`);

      return `${index + 1}. ${item.name}
${specs.join("\n")}`;
    })
    .join("\n\n");
}

/**
 * Get distributor summary for AI context
 */
export async function getDistributorSummary(): Promise<string> {
  const distributors = await prisma.distributor.findMany({
    where: { isActive: true },
    select: {
      name: true,
      website: true,
      _count: {
        select: { equipment: true },
      },
    },
    orderBy: { name: "asc" },
  });

  if (distributors.length === 0) {
    return "No distributors currently in the system.";
  }

  return distributors
    .map(
      (d) =>
        `- ${d.name} (${d._count.equipment} products)${d.website ? ` - ${d.website}` : ""}`,
    )
    .join("\n");
}
