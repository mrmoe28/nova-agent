/**
 * Equipment Selection Logic
 * 
 * Selects the best equipment based on configured preferences
 */

import type { DefaultEquipmentPreference, SelectionStrategy } from "./default-equipment-config";

interface Equipment {
  id: string;
  category: string;
  name: string;
  manufacturer: string | null;
  modelNumber: string;
  unitPrice: number;
  specifications: string | null;
  imageUrl: string | null;
  distributor?: {
    name: string;
  };
  createdAt?: Date;
}

/**
 * Selects the best equipment from a list based on preferences
 */
export function selectEquipment(
  equipment: Equipment[],
  preference: DefaultEquipmentPreference | undefined,
  strategy: SelectionStrategy = "first"
): Equipment | null {
  if (equipment.length === 0) return null;
  if (!preference || Object.keys(preference).length === 0) {
    // No preferences, use strategy
    return applyStrategy(equipment, strategy);
  }

  // Filter equipment based on preferences
  let filtered = equipment;

  // Filter by manufacturer
  if (preference.manufacturer) {
    const mfgLower = preference.manufacturer.toLowerCase();
    filtered = filtered.filter((e) =>
      e.manufacturer?.toLowerCase().includes(mfgLower)
    );
  }

  // Filter by model number
  if (preference.modelNumber) {
    const modelLower = preference.modelNumber.toLowerCase();
    filtered = filtered.filter((e) =>
      e.modelNumber.toLowerCase().includes(modelLower)
    );
  }

  // Filter by name pattern
  if (preference.namePattern) {
    const nameLower = preference.namePattern.toLowerCase();
    filtered = filtered.filter((e) =>
      e.name.toLowerCase().includes(nameLower)
    );
  }

  // Filter by price range
  if (preference.minPrice !== undefined) {
    filtered = filtered.filter((e) => e.unitPrice >= preference.minPrice!);
  }
  if (preference.maxPrice !== undefined) {
    filtered = filtered.filter((e) => e.unitPrice <= preference.maxPrice!);
  }

  // Filter by distributor name
  if (preference.distributorName) {
    const distLower = preference.distributorName.toLowerCase();
    filtered = filtered.filter((e) =>
      e.distributor?.name.toLowerCase().includes(distLower)
    );
  }

  // If no matches after filtering, fall back to all equipment
  if (filtered.length === 0) {
    console.warn("No equipment matched preferences, using fallback");
    filtered = equipment;
  }

  // Apply selection strategy to filtered results
  return applyStrategy(filtered, strategy);
}

/**
 * Applies selection strategy to pick one item from the list
 */
function applyStrategy(
  equipment: Equipment[],
  strategy: SelectionStrategy
): Equipment | null {
  if (equipment.length === 0) return null;

  switch (strategy) {
    case "cheapest":
      return equipment.reduce((prev, curr) =>
        curr.unitPrice < prev.unitPrice ? curr : prev
      );

    case "expensive":
      return equipment.reduce((prev, curr) =>
        curr.unitPrice > prev.unitPrice ? curr : prev
      );

    case "newest":
      if (equipment[0].createdAt) {
        return equipment.reduce((prev, curr) => {
          const prevDate = prev.createdAt?.getTime() || 0;
          const currDate = curr.createdAt?.getTime() || 0;
          return currDate > prevDate ? curr : prev;
        });
      }
      return equipment[0];

    case "first":
    default:
      return equipment[0];
  }
}

