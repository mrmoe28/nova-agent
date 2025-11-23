"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Globe, Loader2 } from "lucide-react";
import type { DistributorWithEquipment } from "@/lib/types/distributor";
import {
  useCreateDistributor,
  useUpdateDistributor,
  useScrapeDistributor,
} from "@/lib/hooks/use-distributors";
import { toast } from "sonner";

const distributorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactName: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type DistributorFormData = z.infer<typeof distributorSchema>;

interface DistributorFormProps {
  distributor: DistributorWithEquipment | null;
  onClose: () => void;
  onSuccess: () => void;
  onEquipmentUpdated?: () => void;
}

export function DistributorForm({
  distributor,
  onClose,
  onSuccess,
  onEquipmentUpdated,
}: DistributorFormProps) {
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scrapeProducts, setScrapeProducts] = useState(true);

  const form = useForm<DistributorFormData>({
    resolver: zodResolver(distributorSchema),
    defaultValues: {
      name: distributor?.name || "",
      contactName: distributor?.contactName || "",
      email: distributor?.email || "",
      phone: distributor?.phone || "",
      website: distributor?.website || "",
      address: distributor?.address || "",
      notes: distributor?.notes || "",
    },
  });

  const createDistributor = useCreateDistributor();
  const updateDistributor = useUpdateDistributor();
  const scrapeDistributor = useScrapeDistributor();

  const handleScrapeUrl = async () => {
    if (!scrapeUrl || !scrapeUrl.startsWith("http")) {
      toast.error("Please enter a valid URL starting with http:// or https://");
      return;
    }

    try {
      const data = await scrapeDistributor.mutateAsync({
        url: scrapeUrl,
        options: {
          saveToDatabase: scrapeProducts,
          scrapeProducts: scrapeProducts,
          useBrowser: false,
        },
      });

      // Auto-fill form with scraped company data
      if (data.company) {
        form.setValue("name", data.company.name || form.getValues("name"));
        form.setValue(
          "contactName",
          data.company.contactName || form.getValues("contactName")
        );
        form.setValue("email", data.company.email || form.getValues("email"));
        form.setValue("phone", data.company.phone || form.getValues("phone"));
        form.setValue("website", data.company.website || scrapeUrl);
        form.setValue("address", data.company.address || form.getValues("address"));
        form.setValue("notes", data.company.description || form.getValues("notes"));
      }

      const productsCount = data.products?.length || data.productLinks?.length || 0;

      // If products were saved, refresh and close modal
      if (scrapeProducts && productsCount > 0) {
        setTimeout(() => {
          onSuccess();
          if (onEquipmentUpdated) {
            onEquipmentUpdated();
          }
        }, 1000);
      }
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const onSubmit = async (data: DistributorFormData) => {
    try {
      if (distributor) {
        await updateDistributor.mutateAsync({ id: distributor.id, data });
      } else {
        await createDistributor.mutateAsync(data);
      }
      onSuccess();
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const isLoading = createDistributor.isPending || updateDistributor.isPending;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 bg-white border border-slate-200 shadow-xl">
        <h2 className="text-xl font-bold mb-6 text-slate-900">
          {distributor ? "Edit" : "Add"} Distributor
        </h2>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Auto-Scrape from URL Section */}
          {!distributor && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-blue-900 font-medium">
                <Globe className="h-4 w-4" />
                <span>Auto-Fill from Website</span>
              </div>
              <p className="text-xs text-blue-700">
                Paste a distributor&apos;s website URL to automatically extract
                company info and find products
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com"
                  value={scrapeUrl}
                  onChange={(e) => setScrapeUrl(e.target.value)}
                  disabled={scrapeDistributor.isPending}
                  className="flex-1 bg-white"
                />
                <Button
                  type="button"
                  onClick={handleScrapeUrl}
                  disabled={scrapeDistributor.isPending || !scrapeUrl}
                  className="bg-blue-600 text-white"
                >
                  {scrapeDistributor.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scraping...
                    </>
                  ) : (
                    "Scrape"
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="scrapeProducts"
                  checked={scrapeProducts}
                  onChange={(e) => setScrapeProducts(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="scrapeProducts" className="text-sm text-blue-900">
                  Scrape and save products to database (takes longer)
                </label>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="name" className="text-slate-700 font-medium">
              Name *
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

          <div>
            <Label htmlFor="contactName" className="text-slate-700 font-medium">
              Contact Name
            </Label>
            <Input
              id="contactName"
              {...form.register("contactName")}
              className="mt-1 bg-white border-slate-300"
            />
          </div>

          <div>
            <Label htmlFor="email" className="text-slate-700 font-medium">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              {...form.register("email")}
              className="mt-1 bg-white border-slate-300"
            />
            {form.formState.errors.email && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="phone" className="text-slate-700 font-medium">
              Phone
            </Label>
            <Input
              id="phone"
              {...form.register("phone")}
              className="mt-1 bg-white border-slate-300"
            />
          </div>

          <div>
            <Label htmlFor="website" className="text-slate-700 font-medium">
              Website
            </Label>
            <Input
              id="website"
              type="url"
              {...form.register("website")}
              placeholder="https://"
              className="mt-1 bg-white border-slate-300"
            />
            {form.formState.errors.website && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.website.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="address" className="text-slate-700 font-medium">
              Address
            </Label>
            <Textarea
              id="address"
              {...form.register("address")}
              rows={2}
              className="mt-1 bg-white border-slate-300"
            />
          </div>

          <div>
            <Label htmlFor="notes" className="text-slate-700 font-medium">
              Notes
            </Label>
            <Textarea
              id="notes"
              {...form.register("notes")}
              rows={3}
              className="mt-1 bg-white border-slate-300"
            />
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
