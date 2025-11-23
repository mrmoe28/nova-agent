import { Prisma } from "@prisma/client";

// Distributor with equipment count and sample equipment
export type DistributorWithEquipment = Prisma.DistributorGetPayload<{
  include: {
    equipment: {
      select: {
        id: true;
        category: true;
        imageUrl: true;
        name: true;
      };
    };
    _count: {
      select: {
        equipment: true;
      };
    };
  };
}>;

// Equipment with distributor info
export type EquipmentWithDistributor = Prisma.EquipmentGetPayload<{
  include: {
    distributor: {
      select: {
        id: true;
        name: true;
      };
    };
  };
}>;

// Form data types
export interface DistributorFormData {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  notes?: string;
}

export interface EquipmentFormData {
  distributorId: string;
  category: string;
  name: string;
  manufacturer?: string;
  modelNumber: string;
  description?: string;
  unitPrice: number;
  imageUrl?: string;
  dataSheetUrl?: string;
  inStock: boolean;
  leadTimeDays?: number;
}

// API Response types
export interface DistributorsResponse {
  success: boolean;
  distributors: DistributorWithEquipment[];
}

export interface EquipmentResponse {
  success: boolean;
  equipment: EquipmentWithDistributor[];
}

export interface ScrapeResponse {
  success: boolean;
  company?: {
    name?: string;
    contactName?: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    description?: string;
  };
  products?: any[];
  productLinks?: string[];
  error?: string;
}
