import type {
  DistributorFormData,
  DistributorsResponse,
  ScrapeResponse,
} from "@/lib/types/distributor";

export const distributorsApi = {
  /**
   * Fetch all distributors with equipment count
   */
  getAll: async (): Promise<DistributorsResponse> => {
    const response = await fetch("/api/distributors");
    if (!response.ok) {
      throw new Error("Failed to fetch distributors");
    }
    return response.json();
  },

  /**
   * Create a new distributor
   */
  create: async (data: DistributorFormData) => {
    const response = await fetch("/api/distributors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Failed to create distributor");
    }
    return response.json();
  },

  /**
   * Update an existing distributor
   */
  update: async (id: string, data: DistributorFormData) => {
    const response = await fetch(`/api/distributors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Failed to update distributor");
    }
    return response.json();
  },

  /**
   * Delete a distributor
   */
  delete: async (id: string) => {
    const response = await fetch(`/api/distributors/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete distributor");
    }
    return response.json();
  },

  /**
   * Scrape distributor website for company info and products
   */
  scrape: async (
    url: string,
    options?: {
      saveToDatabase?: boolean;
      scrapeProducts?: boolean;
      useBrowser?: boolean;
      useAI?: boolean;
    },
  ): Promise<ScrapeResponse> => {
    const response = await fetch("/api/distributors/scrape-from-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, ...options }),
    });
    if (!response.ok) {
      throw new Error("Failed to scrape URL");
    }
    return response.json();
  },
};
