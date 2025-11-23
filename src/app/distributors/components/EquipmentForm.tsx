"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Loader2 } from "lucide-react";
import type { EquipmentWithDistributor, DistributorWithEquipment } from "@/lib/types/distributor";
import {
  useCreateEquipment,
  useUpdateEquipment,
  useUploadEquipmentImage,
} from "@/lib/hooks/use-equipment";
import { toast } from "sonner";

const equipmentSchema = z.object({
  distributorId: z.string().min(1, "Distributor is required"),
  category: z.string().min(1, "Category is required"),
  name: z.string().min(1, "Equipment name is required"),
  manufacturer: z.string().optional(),
  modelNumber: z.string().min(1, "Model number is required"),
  description: z.string().optional(),
  unitPrice: z.coerce.number().min(0, "Price must be positive"),
  imageUrl: z.string().optional(),
  dataSheetUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  inStock: z.boolean(),
  leadTimeDays: z.coerce.number().min(0).optional().or(z.literal("")),
});

type EquipmentFormData = z.infer<typeof equipmentSchema>;

interface EquipmentFormProps {
  equipment: EquipmentWithDistributor | null;
  distributors: DistributorWithEquipment[];
  onClose: () => void;
  onSuccess: () => void;
}

export function EquipmentForm({
  equipment,
  distributors,
  onClose,
  onSuccess,
}: EquipmentFormProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    equipment?.imageUrl || null
  );

  const form = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      distributorId: equipment?.distributorId || "",
      category: equipment?.category || "solar",
      name: equipment?.name || "",
      manufacturer: equipment?.manufacturer || "",
      modelNumber: equipment?.modelNumber || "",
      description: equipment?.description || "",
      unitPrice: equipment?.unitPrice || 0,
      imageUrl: equipment?.imageUrl || "",
      dataSheetUrl: equipment?.dataSheetUrl || "",
      inStock: equipment?.inStock !== false,
      leadTimeDays: equipment?.leadTimeDays || "",
    },
  });

  const createEquipment = useCreateEquipment();
  const updateEquipment = useUpdateEquipment();
  const uploadImage = useUploadEquipmentImage();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (JPG, PNG, etc.)");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = async () => {
    if (!imageFile) return;

    try {
      const data = await uploadImage.mutateAsync(imageFile);
      if (data.imageUrl) {
        form.setValue("imageUrl", data.imageUrl);
        setImageFile(null);
      }
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const onSubmit = async (data: EquipmentFormData) => {
    try {
      if (equipment) {
        await updateEquipment.mutateAsync({ id: equipment.id, data });
      } else {
        await createEquipment.mutateAsync(data);
      }
      onSuccess();
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const isLoading = createEquipment.isPending || updateEquipment.isPending;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 bg-white border border-slate-200 shadow-xl">
        <h2 className="text-xl font-bold mb-6 text-slate-900">
          {equipment ? "Edit" : "Add"} Equipment
        </h2>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="distributorId" className="text-slate-700 font-medium">
                Distributor *
              </Label>
              <Select
                value={form.watch("distributorId")}
                onValueChange={(value) => form.setValue("distributorId", value)}
              >
                <SelectTrigger className="mt-1 bg-white border-slate-300">
                  <SelectValue placeholder="Select distributor" />
                </SelectTrigger>
                <SelectContent>
                  {distributors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.distributorId && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.distributorId.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="category" className="text-slate-700 font-medium">
                Category *
              </Label>
              <Select
                value={form.watch("category")}
                onValueChange={(value) => form.setValue("category", value)}
              >
                <SelectTrigger className="mt-1 bg-white border-slate-300">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solar">Solar Panels</SelectItem>
                  <SelectItem value="battery">Battery</SelectItem>
                  <SelectItem value="inverter">Inverter</SelectItem>
                  <SelectItem value="mounting">Mounting</SelectItem>
                  <SelectItem value="electrical">Electrical</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.category && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.category.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="name" className="text-slate-700 font-medium">
              Equipment Name *
            </Label>
            <Input
              id="name"
              {...form.register("name")}
              className="mt-1 bg-white border-slate-300"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="manufacturer" className="text-slate-700 font-medium">
                Manufacturer
              </Label>
              <Input
                id="manufacturer"
                {...form.register("manufacturer")}
                className="mt-1 bg-white border-slate-300"
              />
            </div>
            <div>
              <Label htmlFor="modelNumber" className="text-slate-700 font-medium">
                Model Number *
              </Label>
              <Input
                id="modelNumber"
                {...form.register("modelNumber")}
                className="mt-1 bg-white border-slate-300"
              />
              {form.formState.errors.modelNumber && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.modelNumber.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="description" className="text-slate-700 font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              {...form.register("description")}
              rows={2}
              className="mt-1 bg-white border-slate-300"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="unitPrice" className="text-slate-700 font-medium">
                Unit Price (USD) *
              </Label>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                {...form.register("unitPrice")}
                className="mt-1 bg-white border-slate-300"
              />
              {form.formState.errors.unitPrice && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.unitPrice.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="leadTimeDays" className="text-slate-700 font-medium">
                Lead Time (Days)
              </Label>
              <Input
                id="leadTimeDays"
                type="number"
                {...form.register("leadTimeDays")}
                className="mt-1 bg-white border-slate-300"
              />
            </div>
            <div>
              <Label htmlFor="inStock" className="text-slate-700 font-medium">
                Availability
              </Label>
              <Select
                value={form.watch("inStock").toString()}
                onValueChange={(value) => form.setValue("inStock", value === "true")}
              >
                <SelectTrigger className="mt-1 bg-white border-slate-300">
                  <SelectValue placeholder="Select availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">In Stock</SelectItem>
                  <SelectItem value="false">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-slate-700 font-medium">Product Image</Label>

            {/* Image Preview */}
            {imagePreview && (
              <div className="relative w-full h-48 border-2 border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                <Image
                  src={imagePreview}
                  alt="Product preview"
                  fill
                  className="object-contain"
                />
              </div>
            )}

            {/* Image Upload Section */}
            <div className="flex gap-2">
              <input
                type="file"
                id="imageFile"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                aria-label="Select equipment image file"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("imageFile")?.click()}
                className="flex-1"
              >
                <Upload className="mr-2 h-4 w-4" />
                Choose Image
              </Button>

              {imageFile && (
                <Button
                  type="button"
                  onClick={handleImageUpload}
                  disabled={uploadImage.isPending}
                  className="bg-blue-600 text-white"
                >
                  {uploadImage.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Upload"
                  )}
                </Button>
              )}
            </div>

            {imageFile && (
              <p className="text-xs text-slate-600">
                Selected: {imageFile.name} ({(imageFile.size / 1024 / 1024).toFixed(2)}{" "}
                MB)
              </p>
            )}

            {/* Manual URL Input */}
            <div className="pt-2 border-t border-slate-200">
              <Label htmlFor="imageUrl" className="text-xs text-slate-600">
                Or enter image URL manually
              </Label>
              <Input
                id="imageUrl"
                type="url"
                {...form.register("imageUrl")}
                onChange={(e) => {
                  form.setValue("imageUrl", e.target.value);
                  setImagePreview(e.target.value);
                }}
                placeholder="https://"
                className="mt-1 bg-white border-slate-300 text-sm"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="dataSheetUrl" className="text-slate-700 font-medium">
              Data Sheet URL
            </Label>
            <Input
              id="dataSheetUrl"
              type="url"
              {...form.register("dataSheetUrl")}
              placeholder="https://"
              className="mt-1 bg-white border-slate-300"
            />
            {form.formState.errors.dataSheetUrl && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.dataSheetUrl.message}
              </p>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 text-white"
            >
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
