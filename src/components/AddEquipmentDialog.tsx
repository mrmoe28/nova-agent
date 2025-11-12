"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, Package, DollarSign, Star, Check, Plus, Building2 } from "lucide-react";
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

interface Distributor {
  id: string;
  name: string;
  website: string | null;
  logoUrl: string | null;
}

interface AddEquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  distributorId: string | null;
  onItemAdded: () => void;
}

export function AddEquipmentDialog({
  open,
  onOpenChange,
  projectId,
  distributorId: initialDistributorId,
  onItemAdded,
}: AddEquipmentDialogProps) {
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [selectedDistributorId, setSelectedDistributorId] = useState<string>(initialDistributorId || "");
  const [loadingDistributors, setLoadingDistributors] = useState(false);
  const [loading, setLoading] = useState(false);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  // Load distributors when dialog opens
  useEffect(() => {
    if (open) {
      fetchDistributors();
      // If there's an initial distributor, set it
      if (initialDistributorId) {
        setSelectedDistributorId(initialDistributorId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Load equipment when distributor is selected
  useEffect(() => {
    if (open && selectedDistributorId) {
      fetchEquipment();
    } else {
      setEquipment([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedDistributorId]);

  const fetchDistributors = async () => {
    setLoadingDistributors(true);
    try {
      const response = await fetch("/api/distributors");
      const data = await response.json();

      if (data.success) {
        setDistributors(data.distributors || []);
      } else {
        toast.error("Failed to load distributors", {
          description: data.error,
        });
      }
    } catch (error) {
      console.error("Error fetching distributors:", error);
      toast.error("Error", {
        description: "Failed to fetch distributors",
      });
    } finally {
      setLoadingDistributors(false);
    }
  };

  const fetchEquipment = async () => {
    if (!selectedDistributorId) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/equipment?distributorId=${selectedDistributorId}&inStock=true`
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

  const handleAdd = async () => {
    if (!selectedId || !projectId) return;

    setAdding(true);
    try {
      const response = await fetch("/api/bom/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          equipmentId: selectedId,
          quantity,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          data.action === "updated" ? "Quantity Updated" : "Item Added",
          {
            description:
              data.action === "updated"
                ? "Quantity increased for existing item."
                : "New equipment added to BOM.",
          }
        );
        onItemAdded();
        onOpenChange(false);
        setSelectedId("");
        setQuantity(1);
        setSearchQuery("");
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error("Error", {
        description: "Failed to add item to BOM.",
      });
    } finally {
      setAdding(false);
    }
  };

  const filteredEquipment = equipment.filter((eq) => {
    const query = searchQuery.toLowerCase();
    return (
      eq.name.toLowerCase().includes(query) ||
      eq.manufacturer?.toLowerCase().includes(query) ||
      eq.modelNumber.toLowerCase().includes(query) ||
      eq.category.toLowerCase().includes(query)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Add Equipment to BOM</DialogTitle>
          <DialogDescription className="text-gray-600">
            Select a distributor and search their equipment catalog
          </DialogDescription>
        </DialogHeader>

        {/* Distributor Selection */}
        <div className="mb-4">
          <Label htmlFor="distributor">Select Distributor</Label>
          <Select
            value={selectedDistributorId}
            onValueChange={setSelectedDistributorId}
            disabled={loadingDistributors}
          >
            <SelectTrigger className="w-full mt-1">
              <SelectValue placeholder={loadingDistributors ? "Loading distributors..." : "Choose a distributor"}>
                {selectedDistributorId && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {distributors.find(d => d.id === selectedDistributorId)?.name || "Select distributor"}
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {distributors.map((distributor) => (
                <SelectItem key={distributor.id} value={distributor.id}>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span>{distributor.name}</span>
                    {distributor.website && (
                      <span className="text-xs text-muted-foreground">({distributor.website})</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Show equipment search only after distributor is selected */}
        {selectedDistributorId && (
          <>
            {/* Search */}
            <div className="mb-4">
              <Label htmlFor="search">Search Equipment</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, manufacturer, model, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

        {/* Quantity Input */}
        <div className="mb-4">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-32 mt-1"
          />
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
              <p className="text-sm mt-2">
                {searchQuery
                  ? "Try adjusting your search"
                  : "No equipment available in distributor catalog"}
              </p>
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
                        img.style.display = "none";
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
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                        >
                          {eq.category.replace(/_/g, " ")}
                        </Badge>
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
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={adding}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!selectedId || adding}>
              {adding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add to BOM
                </>
              )}
            </Button>
          </div>
        </div>
          </>
        )}

        {/* Show message when no distributor is selected */}
        {!selectedDistributorId && (
          <div className="flex items-center justify-center py-12 text-center text-muted-foreground">
            <div>
              <Building2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a Distributor</p>
              <p className="text-sm mt-2">Choose a distributor above to browse their equipment catalog</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
