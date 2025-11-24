"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EquipmentSelectionDialog } from "@/components/EquipmentSelectionDialog";
import { AddEquipmentDialog } from "@/components/AddEquipmentDialog";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Loader2, Trash2, Edit, Plus, RefreshCw, ShoppingCart, CheckCircle2, AlertCircle } from "lucide-react";
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
  notes: string | null;
  imageUrl: string | null;
}

export default function BOMPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [distributorId, setDistributorId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<BOMItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [recalculating, setRecalculating] = useState(false);
  const [distributors, setDistributors] = useState<Array<{ id: string; name: string; _count?: { equipment: number } }>>([]);
  const [loadingDistributors, setLoadingDistributors] = useState(false);

  useEffect(() => {
    loadBOMItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBOMItems = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/bom?projectId=${projectId}`);
      const data = await response.json();

      if (data.success && data.bomItems && data.bomItems.length > 0) {
        setBomItems(data.bomItems);
        setTotalCost(data.totalCost);

        if (data.validation) {
          setValidationErrors(data.validation.errors || []);
          setValidationWarnings(data.validation.warnings || []);
        }
      } else {
        setBomItems([]);
        setTotalCost(0);
      }

      await loadDistributors();
      setInitialLoad(false);
    } catch (error) {
      console.error("Error loading BOM items:", error);
      toast.error("Error", {
        description: "Failed to load BOM items",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDistributors = async () => {
    setLoadingDistributors(true);
    try {
      const distResponse = await fetch('/api/distributors');
      const distData = await distResponse.json();
      if (distData.success && distData.distributors) {
        setDistributors(distData.distributors);
        if (!distributorId && distData.distributors.length > 0) {
          const activeDistributor = distData.distributors.find((d: { isActive: boolean }) => d.isActive);
          if (activeDistributor) {
            setDistributorId(activeDistributor.id);
          }
        }
      }
    } catch (error) {
      console.error("Error loading distributors:", error);
    } finally {
      setLoadingDistributors(false);
    }
  };

  const generateBOM = async (forceRegenerate = false) => {
    setGenerating(true);
    try {
      const response = await fetch("/api/bom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, forceRegenerate, distributorId }),
      });

      const data = await response.json();

      if (data.success) {
        setBomItems(data.bomItems);
        setTotalCost(data.totalCost);
        setDistributorId(data.distributorId);
        if (data.message) {
          toast.success("BOM Generated", {
            description: data.message,
          });
        }
      } else {
        toast.error("Error", {
          description: data.error,
        });
      }
    } catch (error) {
      console.error("Error generating BOM:", error);
      toast.error("Error", {
        description: "Failed to generate BOM",
      });
    } finally {
      setGenerating(false);
      setInitialLoad(false);
    }
  };

  const handleRegenerateBOM = async () => {
    if (confirm("Are you sure you want to regenerate the BOM? This will replace all current items with default equipment.")) {
      await generateBOM(true);
    }
  };

  const handleEditEquipment = (item: BOMItem) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleEquipmentChange = async (bomItemId: string, equipmentId: string) => {
    try {
      const response = await fetch(`/api/bom/${bomItemId}/update-equipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equipmentId }),
      });

      const data = await response.json();

      if (data.success) {
        setBomItems(prev =>
          prev.map(item =>
            item.id === bomItemId ? data.bomItem : item
          )
        );

        const newTotal = bomItems
          .map(item => item.id === bomItemId ? data.bomItem : item)
          .reduce((sum, item) => sum + item.totalPriceUsd, 0);
        setTotalCost(newTotal);

        toast.success("Equipment Updated", {
          description: "BOM item has been updated with selected equipment.",
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Error updating equipment:", error);
      toast.error("Error", {
        description: "Failed to update equipment selection.",
      });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/bom/${itemId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (data.success) {
        setBomItems(prev => prev.filter(item => item.id !== itemId));
        const newTotal = bomItems.filter(item => item.id !== itemId)
          .reduce((sum, item) => sum + item.totalPriceUsd, 0);
        setTotalCost(newTotal);
        toast.success("Item Removed", {
          description: "BOM item has been removed successfully.",
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Error", {
        description: "Failed to remove BOM item.",
      });
    }
  };

  const handleContinue = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/wizard/${projectId}/review`);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error generating plan:", error);
      alert("Failed to generate plan");
    } finally {
      setLoading(false);
    }
  };

  const handleItemAdded = async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const response = await fetch(`/api/bom?projectId=${projectId}`);
      const data = await response.json();
      
      if (data.success && data.bomItems) {
        setBomItems([...data.bomItems]);
        setTotalCost(data.totalCost);
        
        if (data.validation) {
          setValidationErrors(data.validation.errors || []);
          setValidationWarnings(data.validation.warnings || []);
          
          if (data.validation.warnings && data.validation.warnings.length > 0) {
            data.validation.warnings.forEach((warning: string) => {
              toast.warning("Validation Warning", { description: warning });
            });
          }
          
          if (data.validation.errors && data.validation.errors.length > 0) {
            data.validation.errors.forEach((error: string) => {
              toast.error("Validation Error", { description: error });
            });
          }
          
          if (data.validation.correctedItems && data.validation.correctedItems.length > 0) {
            toast.success("Subtotals Corrected", {
              description: `${data.validation.correctedItems.length} item(s) had incorrect totals and were auto-corrected.`,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error refreshing BOM items:", error);
      toast.error("Error", {
        description: "Failed to refresh BOM items. Please refresh the page.",
      });
    }
  };

  if (generating && initialLoad) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-slate-600 text-lg">Loading Bill of Materials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50">
      <div className="container max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Choose Your Equipment</h1>
          <p className="text-lg text-slate-600">
            Select equipment from your distributor to build your system
          </p>
        </div>

        {/* Distributor Selection */}
        <Card className="bg-white border-2 border-slate-200 shadow-lg mb-6">
          <div className="p-6">
            <Label htmlFor="distributor-select" className="text-lg font-semibold text-slate-900 mb-3 block">
              Equipment Distributor
            </Label>
            <Select
              value={distributorId || ""}
              onValueChange={(value) => setDistributorId(value)}
              disabled={loadingDistributors}
            >
              <SelectTrigger id="distributor-select" className="w-full max-w-md bg-white border-2 border-slate-300 text-slate-900 h-12">
                <SelectValue placeholder={loadingDistributors ? "Loading distributors..." : "Select a distributor"} />
              </SelectTrigger>
              <SelectContent className="bg-white border-2 border-slate-200">
                {distributors.map((distributor) => {
                  const equipmentCount = distributor._count?.equipment || 0;
                  return (
                    <SelectItem key={distributor.id} value={distributor.id} className="text-slate-900">
                      {distributor.name}
                      {equipmentCount > 0 && (
                        <span className="text-slate-500 ml-2">
                          ({equipmentCount} {equipmentCount === 1 ? "product" : "products"})
                        </span>
                      )}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-sm text-slate-600 mt-2">
              Choose your preferred distributor to browse and select equipment
            </p>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <Button
            onClick={handleRegenerateBOM}
            variant="outline"
            disabled={generating}
            className="bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
            Generate Suggested BOM
          </Button>
          <Button
            onClick={() => setAddDialogOpen(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Custom Item
          </Button>
        </div>

        {/* BOM Items Table */}
        <Card className="bg-white border-2 border-slate-200 shadow-lg mb-6">
          <div className="p-6">
            {bomItems.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingCart className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No Equipment Added</h3>
                <p className="text-slate-600 mb-6 max-w-md mx-auto">
                  Your bill of materials is empty. Generate a suggested BOM or manually add items.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={() => generateBOM(false)}
                    disabled={generating}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    {generating ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Generate Suggested BOM
                  </Button>
                  <Button
                    onClick={() => setAddDialogOpen(true)}
                    variant="outline"
                    className="bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item Manually
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-slate-200">
                        <th className="pb-3 text-left font-semibold text-slate-900">Image</th>
                        <th className="pb-3 text-left font-semibold text-slate-900">Category</th>
                        <th className="pb-3 text-left font-semibold text-slate-900">Item</th>
                        <th className="pb-3 text-left font-semibold text-slate-900">Model</th>
                        <th className="pb-3 text-right font-semibold text-slate-900">Qty</th>
                        <th className="pb-3 text-right font-semibold text-slate-900">Unit Price</th>
                        <th className="pb-3 text-right font-semibold text-slate-900">Total</th>
                        <th className="pb-3 text-center font-semibold text-slate-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bomItems.map((item) => (
                        <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="py-4">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.itemName}
                                className="h-16 w-16 object-contain rounded border-2 border-slate-200 bg-white"
                                onError={(e) => {
                                  const img = e.currentTarget as HTMLImageElement;
                                  if (img.src.endsWith("/images/placeholder.svg")) return;
                                  img.src = "/images/placeholder.svg";
                                }}
                              />
                            ) : (
                              <div className="h-16 w-16 bg-slate-100 rounded border-2 border-slate-200 flex items-center justify-center text-xs text-slate-400">
                                No Image
                              </div>
                            )}
                          </td>
                          <td className="py-4 text-sm font-medium text-slate-700 capitalize">{item.category}</td>
                          <td className="py-4">
                            <div className="text-sm font-semibold text-slate-900">{item.itemName}</div>
                            {item.manufacturer && (
                              <div className="text-xs text-slate-500">{item.manufacturer}</div>
                            )}
                            {item.notes && item.notes.includes("|") && (
                              <div className="text-xs text-teal-600 font-medium mt-1">
                                {item.notes.split("|")[0].trim()}
                              </div>
                            )}
                          </td>
                          <td className="py-4 text-xs font-mono text-slate-600">{item.modelNumber}</td>
                          <td className="py-4 text-sm text-right font-medium text-slate-900">{item.quantity}</td>
                          <td className="py-4 text-sm text-right text-slate-700">{formatCurrency(item.unitPriceUsd)}</td>
                          <td className="py-4 text-sm text-right font-semibold text-slate-900">{formatCurrency(item.totalPriceUsd)}</td>
                          <td className="py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditEquipment(item)}
                                className="h-8 w-8 p-0 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                                title="Change equipment"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteItem(item.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Delete item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-300">
                        <td colSpan={6} className="pt-4 text-right font-semibold text-lg text-slate-900">
                          Total Equipment Cost:
                        </td>
                        <td className="pt-4 text-right text-2xl font-bold text-teal-600">
                          {formatCurrency(totalCost)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Validation Messages */}
                {validationErrors.length > 0 && (
                  <div className="mt-6 bg-red-50 border-2 border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-red-900 mb-2">Validation Errors</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                          {validationErrors.map((error, idx) => (
                            <li key={idx}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {validationWarnings.length > 0 && validationErrors.length === 0 && (
                  <div className="mt-6 bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-2">Validation Warnings</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                          {validationWarnings.map((warning, idx) => (
                            <li key={idx}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex gap-4 justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/wizard/${projectId}/sizing`)}
            className="bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50 px-8 py-6 text-lg"
          >
            Back
          </Button>
          <Button
            onClick={handleContinue}
            disabled={loading || bomItems.length === 0}
            className="bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white px-8 py-6 text-lg shadow-lg disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating Plan...
              </>
            ) : (
              <>
                Continue to Review
                <CheckCircle2 className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Equipment Selection Dialog */}
      <EquipmentSelectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        bomItem={editingItem}
        distributorId={distributorId}
        onEquipmentSelected={handleEquipmentChange}
      />

      {/* Add Equipment Dialog */}
      <AddEquipmentDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        projectId={projectId}
        distributorId={distributorId}
        onItemAdded={handleItemAdded}
      />

      <Toaster />
    </div>
  );
}
