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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Archive,
  Building2,
  DollarSign,
  Package,
  Plus,
  Trash2,
  ExternalLink,
  Search,
  Filter,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

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
  const [showAddEquipment, setShowAddEquipment] = useState(false);

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
      }
    } catch (error) {
      console.error("Error deleting BOM item:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            BOM Items & Available Equipment
          </DialogTitle>
          <DialogDescription>
            Manage your project's Bill of Materials and browse available equipment from distributors
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
          {/* Current BOM Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Package className="h-5 w-5" />
                Current BOM ({bomItems.length} items)
              </h3>
              <Badge variant="outline" className="font-mono">
                Total: {formatCurrency(totalBOMCost)}
              </Badge>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {bomItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No BOM items yet</p>
                  <p className="text-sm">Items will appear here after system sizing</p>
                </div>
              ) : (
                bomItems.map((item) => (
                  <Card key={item.id} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs">
                            {item.category}
                          </Badge>
                          <span className="font-medium">{item.itemName}</span>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
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
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Available Equipment */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Available Equipment ({distributorEquipment.length} items)
              </h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowAddEquipment(!showAddEquipment)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add to BOM
              </Button>
            </div>

            {/* Search & Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="text-center py-8">Loading equipment...</div>
              ) : filteredEquipment.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No equipment found</p>
                  <p className="text-sm">Try adjusting your search or filters</p>
                </div>
              ) : (
                filteredEquipment.map((equipment) => (
                  <Card key={equipment.id} className="p-3 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {equipment.category.replace(/_/g, " ")}
                          </Badge>
                          <span className="font-medium">{equipment.name}</span>
                          {!equipment.inStock && (
                            <Badge variant="destructive" className="text-xs">
                              Out of Stock
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>Model: {equipment.modelNumber}</div>
                          {equipment.manufacturer && <div>Mfg: {equipment.manufacturer}</div>}
                          <div className="flex items-center gap-4">
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
                      <div className="flex gap-1">
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
                          disabled={!equipment.inStock}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
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
