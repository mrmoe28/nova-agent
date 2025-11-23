"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { equipmentApi } from "@/lib/api/equipment";
import type { EquipmentFormData, EquipmentWithDistributor } from "@/lib/types/distributor";
import { toast } from "sonner";

export const EQUIPMENT_QUERY_KEY = ["equipment"];

/**
 * Fetch all equipment with React Query
 */
export function useEquipment(initialData?: EquipmentWithDistributor[]) {
  return useQuery({
    queryKey: EQUIPMENT_QUERY_KEY,
    queryFn: async () => {
      const data = await equipmentApi.getAll();
      return data.equipment;
    },
    initialData,
  });
}

/**
 * Create new equipment
 */
export function useCreateEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EquipmentFormData) => equipmentApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_QUERY_KEY });
      toast.success("Equipment created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create equipment: ${error.message}`);
    },
  });
}

/**
 * Update existing equipment
 */
export function useUpdateEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EquipmentFormData> }) =>
      equipmentApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_QUERY_KEY });
      toast.success("Equipment updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update equipment: ${error.message}`);
    },
  });
}

/**
 * Delete equipment
 */
export function useDeleteEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => equipmentApi.delete(id),
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: EQUIPMENT_QUERY_KEY });

      // Snapshot previous value
      const previousEquipment = queryClient.getQueryData<EquipmentWithDistributor[]>(
        EQUIPMENT_QUERY_KEY
      );

      // Optimistically update
      queryClient.setQueryData<EquipmentWithDistributor[]>(
        EQUIPMENT_QUERY_KEY,
        (old) => old?.filter((e) => e.id !== id) ?? []
      );

      return { previousEquipment };
    },
    onSuccess: () => {
      toast.success("Equipment deleted successfully");
    },
    onError: (error: Error, _id, context) => {
      // Rollback on error
      queryClient.setQueryData(EQUIPMENT_QUERY_KEY, context?.previousEquipment);
      toast.error(`Failed to delete equipment: ${error.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_QUERY_KEY });
    },
  });
}

/**
 * Upload equipment image
 */
export function useUploadEquipmentImage() {
  return useMutation({
    mutationFn: (file: File) => equipmentApi.uploadImage(file),
    onSuccess: () => {
      toast.success("Image uploaded successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload image: ${error.message}`);
    },
  });
}
