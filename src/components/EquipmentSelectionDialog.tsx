"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Search, Loader2, Package, DollarSign, Star, Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface Equipment {
  id: string;
  name: string;
  manufacturer: string | null;
  modelNumber: string;
  unitPrice: number;
  specifications: string | null;
  imageUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  warranty: string | null;
  inStock: boolean;
  category: string;
}

interface BOMItem {
  id: string;
  category: string;
  itemName: string;
  manufacturer: string | null;
  modelNumber: string;
  quantity: number;
  unitPriceUsd: number;
  totalPriceUsd: number;
  imageUrl: string | null;
}

interface EquipmentSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bomItem: BOMItem | null;
  distributorId: string | null;
  onEquipmentSelected: (bomItemId: string, equipmentId: string) => Promise<void>;
}

export function EquipmentSelectionDialog({
  open,
  onOpenChange,
  bomItem,
  distributorId,
  onEquipmentSelected,
}: EquipmentSelectionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (open && bomItem && distributorId) {
      fetchEquipment();
    }
  }, [open, bomItem, distributorId]);

  const fetchEquipment = async () => {
    if (!bomItem || !distributorId) return;

    setLoading(true);
    try {
      // Map BOM category to Equipment category
      const categoryMap: Record<string, string> = {
        solar: "SOLAR_PANEL",
        battery: "BATTERY",
        inverter: "INVERTER",
        mounting: "MOUNTING",
        electrical: "ELECTRICAL",
      };

      const equipmentCategory = categoryMap[bomItem.category.toLowerCase()];

      const response = await fetch(
        `/api/equipment/by-category?distributorId=${distributorId}&category=${equipmentCategory}`
      );
      const data = await response.json();

      if (data.success) {
        setEquipment(data.equipment || []);
      } else {
        toast.error("Failed to load equipment", {
          description: data.error,
        });
      }
    } catch (error) {
      console.error("Error fetching equipment:", error);
      toast.error("Error", {
        description: "Failed to fetch equipment options",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedId || !bomItem) return;

    setUpdating(true);
    try {
      await onEquipmentSelected(bomItem.id, selectedId);
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating equipment:", error);
    } finally {
      setUpdating(false);
    }
  };

  const filteredEquipment = equipment.filter((eq) => {
    const query = searchQuery.toLowerCase();
    return (
      eq.name.toLowerCase().includes(query) ||
      eq.manufacturer?.toLowerCase().includes(query) ||
      eq.modelNumber.toLowerCase().includes(query)
    );
  });

  if (!bomItem) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-gray-900">
            Select {bomItem.category.charAt(0).toUpperCase() + bomItem.category.slice(1)} Equipment
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Choose from available equipment in your distributor&apos;s catalog
          </DialogDescription>
        </DialogHeader>

        {/* Current Selection */}
        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium mb-2">Current Selection:</p>
          <div className="flex items-center gap-4">
            {bomItem.imageUrl ? (
              <img
                src={bomItem.imageUrl}
                alt={bomItem.itemName}
                className="h-16 w-16 object-contain rounded border"
              />
            ) : (
              <div className="h-16 w-16 bg-muted rounded border flex items-center justify-center">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div>
              <p className="font-medium">{bomItem.itemName}</p>
              <p className="text-sm text-muted-foreground">{bomItem.manufacturer}</p>
              <p className="text-sm font-semibold text-primary">{formatCurrency(bomItem.unitPriceUsd)}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <Label htmlFor="search">Search Equipment</Label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search by name, manufacturer, or model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Equipment List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEquipment.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No equipment found</p>
              <p className="text-sm mt-2">Try adjusting your search or check distributor catalog</p>
            </div>
          ) : (
            <RadioGroup value={selectedId} onValueChange={setSelectedId} className="space-y-3">
              {filteredEquipment.map((eq) => (
                <div
                  key={eq.id}
                  className={`relative flex items-start space-x-4 rounded-lg border p-4 cursor-pointer transition-all ${
                    selectedId === eq.id
                      ? "border-primary bg-primary/5 ring-2 ring-primary"
                      : "border-border hover:border-primary/50 hover:bg-accent"
                  }`}
                  onClick={() => setSelectedId(eq.id)}
                >
                  <RadioGroupItem value={eq.id} id={eq.id} className="mt-1" />

                  {/* Image */}
                  {eq.imageUrl ? (
                    <img
                      src={eq.imageUrl}
                      alt={eq.name}
                      className="h-20 w-20 object-contain rounded border flex-shrink-0"
                      onError={(e) => {
                        const img = e.currentTarget as HTMLImageElement;
                        img.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="h-20 w-20 bg-muted rounded border flex items-center justify-center flex-shrink-0">
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <Label htmlFor={eq.id} className="font-semibold text-base cursor-pointer">
                          {eq.name}
                        </Label>
                        {eq.manufacturer && (
                          <p className="text-sm text-muted-foreground mt-0.5">{eq.manufacturer}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {eq.inStock ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <Check className="h-3 w-3 mr-1" />
                            In Stock
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            Out of Stock
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-4 text-sm">
                      <span className="font-mono text-muted-foreground">{eq.modelNumber}</span>
                      {eq.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{eq.rating.toFixed(1)}</span>
                          {eq.reviewCount && (
                            <span className="text-muted-foreground">({eq.reviewCount})</span>
                          )}
                        </div>
                      )}
                      {eq.warranty && (
                        <span className="text-muted-foreground">{eq.warranty} warranty</span>
                      )}
                    </div>

                    {eq.specifications && (
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                        {eq.specifications}
                      </p>
                    )}

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-primary" />
                        <span className="text-lg font-bold text-primary">
                          {formatCurrency(eq.unitPrice)}
                        </span>
                        <span className="text-sm text-muted-foreground">per unit</span>
                      </div>
                      {selectedId === eq.id && (
                        <div className="flex items-center gap-1 text-sm font-medium text-primary">
                          <Check className="h-4 w-4" />
                          Selected
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </RadioGroup>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {filteredEquipment.length} option{filteredEquipment.length !== 1 ? "s" : ""} available
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updating}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!selectedId || updating}>
              {updating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Save Selection"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
