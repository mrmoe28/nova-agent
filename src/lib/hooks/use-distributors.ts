"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { distributorsApi } from "@/lib/api/distributors";
import type { DistributorFormData, DistributorWithEquipment } from "@/lib/types/distributor";
import { toast } from "sonner";

export const DISTRIBUTORS_QUERY_KEY = ["distributors"];

/**
 * Fetch all distributors with React Query
 */
export function useDistributors(initialData?: DistributorWithEquipment[]) {
  return useQuery({
    queryKey: DISTRIBUTORS_QUERY_KEY,
    queryFn: async () => {
      const data = await distributorsApi.getAll();
      return data.distributors;
    },
    initialData,
  });
}

/**
 * Create a new distributor
 */
export function useCreateDistributor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DistributorFormData) => distributorsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DISTRIBUTORS_QUERY_KEY });
      toast.success("Distributor created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create distributor: ${error.message}`);
    },
  });
}

/**
 * Update an existing distributor
 */
export function useUpdateDistributor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DistributorFormData }) =>
      distributorsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DISTRIBUTORS_QUERY_KEY });
      toast.success("Distributor updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update distributor: ${error.message}`);
    },
  });
}

/**
 * Delete a distributor
 */
export function useDeleteDistributor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => distributorsApi.delete(id),
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: DISTRIBUTORS_QUERY_KEY });

      // Snapshot previous value
      const previousDistributors = queryClient.getQueryData<DistributorWithEquipment[]>(
        DISTRIBUTORS_QUERY_KEY
      );

      // Optimistically update
      queryClient.setQueryData<DistributorWithEquipment[]>(
        DISTRIBUTORS_QUERY_KEY,
        (old) => old?.filter((d) => d.id !== id) ?? []
      );

      return { previousDistributors };
    },
    onSuccess: () => {
      toast.success("Distributor deleted successfully");
    },
    onError: (error: Error, _id, context) => {
      // Rollback on error
      queryClient.setQueryData(DISTRIBUTORS_QUERY_KEY, context?.previousDistributors);
      toast.error(`Failed to delete distributor: ${error.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: DISTRIBUTORS_QUERY_KEY });
    },
  });
}

/**
 * Scrape distributor website
 */
export function useScrapeDistributor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      url,
      options,
    }: {
      url: string;
      options?: {
        saveToDatabase?: boolean;
        scrapeProducts?: boolean;
        useBrowser?: boolean;
        useAI?: boolean;
      };
    }) => distributorsApi.scrape(url, options),
    onSuccess: (data, variables) => {
      const productsCount = data.products?.length || data.productLinks?.length || 0;

      if (variables.options?.saveToDatabase && productsCount > 0) {
        // Invalidate both distributors and equipment
        queryClient.invalidateQueries({ queryKey: DISTRIBUTORS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: ["equipment"] });
        toast.success(
          `Successfully scraped ${productsCount} product${productsCount !== 1 ? "s" : ""} and saved to database`
        );
      } else {
        toast.success(`Found ${productsCount} product${productsCount !== 1 ? "s" : ""}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to scrape: ${error.message}`);
    },
  });
}
