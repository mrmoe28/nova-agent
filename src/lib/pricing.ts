import { prisma } from "@/lib/prisma";
import { Equipment, EquipmentCategory } from "@prisma/client";

interface SearchFilters {
  category?: EquipmentCategory;
  manufacturer?: string;
  minPrice?: number;
  maxPrice?: number;
  // This could be expanded to search within the JSON 'specifications' field
  specs?: Record<string, any>;
}

/**
 * Finds equipment in the database based on a set of filters.
 * @param filters The search criteria for the equipment.
 * @returns A promise that resolves to an array of equipment matching the filters.
 */
export async function findEquipment(filters: SearchFilters): Promise<Equipment[]> {
  const where: any = {};

  if (filters.category) {
    where.category = filters.category;
  }
  if (filters.manufacturer) {
    where.manufacturer = {
      contains: filters.manufacturer,
      mode: 'insensitive', // Case-insensitive search
    };
  }
  if (filters.minPrice !== undefined) {
    where.unitPrice = { ...where.unitPrice, gte: filters.minPrice };
  }
  if (filters.maxPrice !== undefined) {
    where.unitPrice = { ...where.unitPrice, lte: filters.maxPrice };
  }
  
  // Note: Searching within the JSON 'specifications' is more complex
  // and might require raw database queries depending on the database provider.
  // This implementation provides a basic filtering structure.

  console.log(`Searching for equipment with filters:`, filters);

  const equipment = await prisma.equipment.findMany({
    where,
    orderBy: {
      updatedAt: 'desc', // Return the most recently updated items first
    },
    take: 50, // Limit results to avoid overwhelming responses
  });

  console.log(`Found ${equipment.length} items.`);
  return equipment;
}

/**
 * Retrieves a specific piece of equipment by its model number from a specific distributor.
 * @param modelNumber The model number of the equipment.
 * @param distributorName The name of the distributor.
 * @returns A promise that resolves to the equipment item or null if not found.
 */
export async function getEquipmentByModel(modelNumber: string, distributorName?: string): Promise<Equipment | null> {
    const where: any = {
        modelNumber: {
            equals: modelNumber,
            mode: 'insensitive',
        }
    };

    if (distributorName) {
        where.distributor = {
            name: {
                contains: distributorName,
                mode: 'insensitive',
            }
        };
    }

  console.log(`Searching for model "${modelNumber}" from distributor "${distributorName || 'any'}".`);

  const equipment = await prisma.equipment.findFirst({
    where,
    include: {
        distributor: true // Also include distributor info
    }
  });

  if (equipment) {
    console.log(`Found equipment: ${equipment.name} ($${equipment.unitPrice})`);
  } else {
    console.log(`Equipment with model number "${modelNumber}" not found.`);
  }

  return equipment;
}

/**
 * Gets a list of all available equipment categories from the database.
 * @returns A promise that resolves to an array of unique equipment categories.
 */
export async function getAvailableCategories(): Promise<string[]> {
    const distinctCategories = await prisma.equipment.findMany({
        select: {
            category: true,
        },
        distinct: ['category'],
    });

    return distinctCategories.map(item => item.category);
}
