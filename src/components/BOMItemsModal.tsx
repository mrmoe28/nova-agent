"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Archive,
  Building2,
  Package,
  Plus,
  Trash2,
  ExternalLink,
  Search,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface BOMItem {
  id: string;
  category: string;
  itemName: string;
  manufacturer: string | null;
  modelNumber: string;
  quantity: number;
  unitPriceUsd: number;
  totalPriceUsd: number;
  sourceUrl?: string;
  imageUrl?: string | null;
  notes: string | null;
}

interface Equipment {
  id: string;
  name: string;
  manufacturer: string | null;
  modelNumber: string;
  category: string;
  unitPrice: number;
  description: string | null;
  imageUrl: string | null;
  sourceUrl: string | null;
  inStock: boolean;
  leadTimeDays: number | null;
  distributor: {
    id: string;
    name: string;
  };
}

interface BOMItemsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  bomItems: BOMItem[];
  onItemsChange?: (items: BOMItem[]) => void;
}

export function BOMItemsModal({
  open,
  onOpenChange,
  projectId,
  bomItems,
  onItemsChange,
}: BOMItemsModalProps) {
  const [distributorEquipment, setDistributorEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [addingItems, setAddingItems] = useState<Set<string>>(new Set());

  const fetchDistributorEquipment = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/equipment");
      const data = await response.json();
      if (data.success) {
        setDistributorEquipment(data.equipment);
      }
    } catch (error) {
      console.error("Error fetching equipment:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchDistributorEquipment();
    }
  }, [open]);

  const filteredEquipment = distributorEquipment.filter((item) => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.modelNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.distributor.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const categories = [
    ...new Set(distributorEquipment.map((item) => item.category)),
  ];

  const totalBOMCost = bomItems.reduce((sum, item) => sum + item.totalPriceUsd, 0);

  const handleDeleteBOMItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/bom/${itemId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (data.success && onItemsChange) {
        const updatedItems = bomItems.filter(item => item.id !== itemId);
        onItemsChange(updatedItems);
        console.log("BOM item deleted successfully");
      } else {
        console.error("Failed to delete BOM item:", data.error);
      }
    } catch (error) {
      console.error("Error deleting BOM item:", error);
    }
  };

  const handleAddBOMItem = async (equipmentId: string, quantity: number = 1) => {
    if (addingItems.has(equipmentId)) {
      return; // Prevent duplicate requests
    }

    setAddingItems(prev => new Set(prev).add(equipmentId));
    
    try {
      const response = await fetch('/api/bom/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, equipmentId, quantity }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.bomItem) {
        if (data.action === 'updated') {
          // Update existing item in the list
          const updatedItems = bomItems.map(item => 
            item.id === data.bomItem.id ? data.bomItem : item
          );
          if (onItemsChange) {
            onItemsChange(updatedItems);
          }
          toast.success("Quantity Updated", {
            description: "Item quantity increased in BOM.",
          });
        } else {
          // Add new item to the list
          if (onItemsChange) {
            onItemsChange([...bomItems, data.bomItem]);
          }
          toast.success("Item Added", {
            description: "Equipment added to BOM successfully.",
          });
        }
      } else {
        throw new Error(data.error || "Failed to add BOM item");
      }
    } catch (error) {
      console.error("Error adding BOM item:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to add item to BOM";
      toast.error("Error", {
        description: errorMessage,
      });
    } finally {
      setAddingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(equipmentId);
        return newSet;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-[95vw] max-h-[95vh] flex flex-col bg-white">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <Archive className="h-5 w-5" />
            BOM Items & Available Equipment
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Manage your project&apos;s Bill of Materials and browse available equipment from distributors
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0 overflow-hidden">
          {/* Current BOM Items */}
          <div className="space-y-4 flex flex-col min-h-0">
            <div className="flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
                <Package className="h-5 w-5" />
                Current BOM ({bomItems.length} items)
              </h3>
              <Badge variant="outline" className="font-mono">
                Total: {formatCurrency(totalBOMCost)}
              </Badge>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto min-h-0 pr-2">
              {bomItems.length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No BOM items yet</p>
                  <p className="text-sm">Items will appear here after system sizing</p>
                </div>
              ) : (
                bomItems.map((item) => (
                  <Card key={item.id} className="p-3 bg-white border border-gray-200">
                    <div className="flex items-start gap-3">
                      {/* Image */}
                      <div className="flex-shrink-0">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.itemName}
                            className="h-20 w-20 object-contain rounded border border-gray-200 bg-gray-50"
                            onError={(e) => {
                              const img = e.currentTarget as HTMLImageElement;
                              img.style.display = "none";
                              const placeholder = img.nextElementSibling as HTMLElement;
                              if (placeholder) {
                                placeholder.style.display = "flex";
                              }
                            }}
                          />
                        ) : null}
                        <div 
                          className={`h-20 w-20 bg-gray-50 rounded border border-gray-200 flex items-center justify-center ${item.imageUrl ? 'hidden' : ''}`}
                        >
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                      </div>
                      
                      <div className="flex-1 flex items-start justify-between min-w-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">
                              {item.category}
                            </Badge>
                            <span className="font-medium text-gray-900 truncate">{item.itemName}</span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>Model: {item.modelNumber}</div>
                            {item.manufacturer && <div>Mfg: {item.manufacturer}</div>}
                            <div className="flex items-center gap-4">
                              <span>Qty: {item.quantity}</span>
                              <span>{formatCurrency(item.unitPriceUsd)} each</span>
                              <span className="font-medium">
                                {formatCurrency(item.totalPriceUsd)} total
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteBOMItem(item.id)}
                          className="text-red-600 hover:text-red-800 flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Available Equipment */}
          <div className="space-y-4 flex flex-col min-h-0">
            <div className="flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
                <Building2 className="h-5 w-5" />
                Available Equipment ({distributorEquipment.length} items)
              </h3>
              <Button 
                variant="outline" 
                size="sm"
                disabled
                title="Use the + buttons on individual items to add them to BOM"
              >
                <Plus className="h-4 w-4 mr-1" />
                Browse Equipment
              </Button>
            </div>

            {/* Search & Filter */}
            <div className="space-y-2 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search equipment..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto min-h-0 pr-2">
              {loading ? (
                <div className="text-center py-8 text-gray-600">Loading equipment...</div>
              ) : filteredEquipment.length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No equipment found</p>
                  <p className="text-sm">Try adjusting your search or filters</p>
                </div>
              ) : (
                filteredEquipment.map((equipment) => (
                  <Card key={equipment.id} className="p-3 bg-white border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      {/* Image */}
                      <div className="flex-shrink-0 relative">
                        {equipment.imageUrl ? (
                          <img
                            src={equipment.imageUrl}
                            alt={equipment.name}
                            className="h-20 w-20 object-contain rounded border border-gray-200 bg-gray-50"
                            onError={(e) => {
                              const img = e.currentTarget as HTMLImageElement;
                              img.style.display = "none";
                              const placeholder = img.nextElementSibling as HTMLElement;
                              if (placeholder) {
                                placeholder.style.display = "flex";
                              }
                            }}
                          />
                        ) : null}
                        <div 
                          className={`h-20 w-20 bg-gray-50 rounded border border-gray-200 flex items-center justify-center ${equipment.imageUrl ? 'hidden' : ''}`}
                        >
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                      </div>
                      
                      <div className="flex-1 flex items-start justify-between min-w-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {equipment.category.replace(/_/g, " ")}
                            </Badge>
                            <span className="font-medium text-gray-900 truncate">{equipment.name}</span>
                            {!equipment.inStock && (
                              <Badge variant="destructive" className="text-xs">
                                Out of Stock
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>Model: {equipment.modelNumber}</div>
                            {equipment.manufacturer && <div>Mfg: {equipment.manufacturer}</div>}
                            <div className="flex items-center gap-4 flex-wrap">
                              <span className="font-medium text-green-600">
                                {formatCurrency(equipment.unitPrice)}
                              </span>
                              <span className="text-blue-600">
                                {equipment.distributor.name}
                              </span>
                              {equipment.leadTimeDays && (
                                <span>{equipment.leadTimeDays}d lead</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0 ml-2">
                          {equipment.sourceUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <a 
                                href={equipment.sourceUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                title="View product page"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-800"
                            disabled={!equipment.inStock || addingItems.has(equipment.id)}
                            onClick={() => handleAddBOMItem(equipment.id)}
                            title="Add to BOM"
                          >
                            {addingItems.has(equipment.id) ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
