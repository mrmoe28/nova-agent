import type {
  EquipmentFormData,
  EquipmentResponse,
} from "@/lib/types/distributor";

export const equipmentApi = {
  /**
   * Fetch all equipment with distributor info
   */
  getAll: async (): Promise<EquipmentResponse> => {
    const response = await fetch("/api/equipment");
    if (!response.ok) {
      throw new Error("Failed to fetch equipment");
    }
    return response.json();
  },

  /**
   * Create new equipment
   */
  create: async (data: EquipmentFormData) => {
    const response = await fetch("/api/equipment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Failed to create equipment");
    }
    return response.json();
  },

  /**
   * Update existing equipment
   */
  update: async (id: string, data: Partial<EquipmentFormData>) => {
    const response = await fetch(`/api/equipment/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Failed to update equipment");
    }
    return response.json();
  },

  /**
   * Delete equipment
   */
  delete: async (id: string) => {
    const response = await fetch(`/api/equipment/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete equipment");
    }
    return response.json();
  },

  /**
   * Upload equipment image
   */
  uploadImage: async (file: File): Promise<{ success: boolean; imageUrl?: string; error?: string }> => {
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch("/api/equipment/upload-image", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      throw new Error("Failed to upload image");
    }
    return response.json();
  },
};
