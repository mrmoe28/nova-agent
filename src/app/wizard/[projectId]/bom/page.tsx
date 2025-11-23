"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EquipmentSelectionDialog } from "@/components/EquipmentSelectionDialog";
import { AddEquipmentDialog } from "@/components/AddEquipmentDialog";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Loader2, Trash2, Edit, Plus, RefreshCw } from "lucide-react";
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

  useEffect(() => {
    loadBOMItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBOMItems = async () => {
    setGenerating(true);
    try {
      // First, try to fetch existing BOM items
      const response = await fetch(`/api/bom?projectId=${projectId}`);
      const data = await response.json();

      if (data.success && data.bomItems && data.bomItems.length > 0) {
        // BOM already exists, just load it
        setBomItems(data.bomItems);
        setTotalCost(data.totalCost);
        
        // Update validation state
        if (data.validation) {
          setValidationErrors(data.validation.errors || []);
          setValidationWarnings(data.validation.warnings || []);
        }
        
        setInitialLoad(false);
      } else {
        // No BOM exists yet, generate it for the first time
        await generateBOM(false);
      }
    } catch (error) {
      console.error("Error loading BOM items:", error);
      toast.error("Error", {
        description: "Failed to load BOM items",
      });
    } finally {
      setGenerating(false);
    }
  };

  const generateBOM = async (forceRegenerate = false) => {
    setGenerating(true);
    try {
      const response = await fetch("/api/bom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, forceRegenerate }),
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

  // Equipment selection handlers
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
      // Update local state
      setBomItems(prev =>
        prev.map(item =>
          item.id === bomItemId ? data.bomItem : item
        )
      );

      // Recalculate total
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
        // Recalculate total
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

  if (generating && initialLoad) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">
            Loading Bill of Materials...
          </p>
        </div>
      </div>
    );
  }

  const handleItemAdded = async () => {
    // Small delay to ensure database transaction is committed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Refresh BOM items without regenerating
    try {
      const response = await fetch(`/api/bom?projectId=${projectId}`);
      const data = await response.json();
      
      if (data.success && data.bomItems) {
        // Force state update with new array reference to ensure re-render
        // This ensures React detects the change even if item count is the same
        setBomItems([...data.bomItems]);
        setTotalCost(data.totalCost);
        
        // Update validation state
        if (data.validation) {
          setValidationErrors(data.validation.errors || []);
          setValidationWarnings(data.validation.warnings || []);
          
          // Show warnings if any
          if (data.validation.warnings && data.validation.warnings.length > 0) {
            data.validation.warnings.forEach((warning: string) => {
              toast.warning("Validation Warning", { description: warning });
            });
          }
          
          // Show errors if any
          if (data.validation.errors && data.validation.errors.length > 0) {
            data.validation.errors.forEach((error: string) => {
              toast.error("Validation Error", { description: error });
            });
          }
          
          // Show success if items were corrected
          if (data.validation.correctedItems && data.validation.correctedItems.length > 0) {
            toast.success("Subtotals Corrected", {
              description: `${data.validation.correctedItems.length} item(s) had incorrect totals and were auto-corrected.`,
            });
          }
        }
        
        // Log for debugging
        console.log(`BOM items refreshed: ${data.bomItems.length} items`);
      } else {
        console.error("Failed to refresh BOM items:", data.error);
        toast.error("Error", {
          description: "Failed to refresh BOM items. Please refresh the page.",
        });
      }
    } catch (error) {
      console.error("Error refreshing BOM items:", error);
      toast.error("Error", {
        description: "Failed to refresh BOM items. Please refresh the page.",
      });
    }
  };

  const handleRecalculateEnergy = async () => {
    setRecalculating(true);
    try {
      const response = await fetch("/api/bom/recalculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, updateAnalysis: true }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Energy Calculations Updated", {
          description: "System specs and energy production recalculated from actual BOM equipment.",
        });
        // Refresh BOM to show updated totals
        await handleItemAdded();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Error recalculating energy:", error);
      toast.error("Error", {
        description: "Failed to recalculate energy from BOM equipment.",
      });
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="container max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bill of Materials</h1>
          <p className="mt-2 text-muted-foreground">
            Equipment list with pricing for your solar + battery system
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRegenerateBOM}
            variant="outline"
            disabled={generating}
            className="flex items-center gap-2"
            title="Reset BOM to default equipment"
          >
            <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
            Regenerate BOM
          </Button>
          <Button
            onClick={handleRecalculateEnergy}
            variant="outline"
            disabled={recalculating || bomItems.length === 0}
            className="flex items-center gap-2"
            title="Recalculate energy production from actual BOM equipment"
          >
            <RefreshCw className={`h-4 w-4 ${recalculating ? 'animate-spin' : ''}`} />
            Recalculate Energy
          </Button>
          <Button
            onClick={() => setAddDialogOpen(true)}
            disabled={!distributorId && bomItems.length === 0}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-3 text-left font-semibold text-foreground">Image</th>
                <th className="pb-3 text-left font-semibold text-foreground">Category</th>
                <th className="pb-3 text-left font-semibold text-foreground">Item</th>
                <th className="pb-3 text-left font-semibold text-foreground">Model</th>
                <th className="pb-3 text-right font-semibold text-foreground">Qty</th>
                <th className="pb-3 text-right font-semibold text-foreground">Unit Price</th>
                <th className="pb-3 text-right font-semibold text-foreground">Total</th>
                <th className="pb-3 text-center font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bomItems.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="py-3">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.itemName}
                        className="h-16 w-16 object-contain rounded border border-border"
                        onError={(e) => {
                          const img = e.currentTarget as HTMLImageElement;
                          if (img.src.endsWith("/images/placeholder.svg")) return;
                          img.src = "/images/placeholder.svg";
                        }}
                      />
                    ) : (
                      <div className="h-16 w-16 bg-muted rounded border border-border flex items-center justify-center text-xs text-muted-foreground">
                        No Image
                      </div>
                    )}
                  </td>
                  <td className="py-3 text-sm capitalize text-foreground">{item.category}</td>
                  <td className="py-3">
                    <div className="text-sm text-foreground font-medium">{item.itemName}</div>
                    {item.manufacturer && (
                      <div className="text-xs text-muted-foreground">{item.manufacturer}</div>
                    )}
                  </td>
                  <td className="py-3 text-xs font-mono text-muted-foreground">
                    {item.modelNumber}
                  </td>
                  <td className="py-3 text-sm text-right text-foreground">{item.quantity}</td>
                  <td className="py-3 text-sm text-right text-foreground">
                    {formatCurrency(item.unitPriceUsd)}
                  </td>
                  <td className="py-3 text-sm text-right font-semibold text-foreground">
                    {formatCurrency(item.totalPriceUsd)}
                  </td>
                  <td className="py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditEquipment(item)}
                        className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                        title="Change equipment"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteItem(item.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
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
              <tr className="border-t-2 border-border">
                <td colSpan={6} className="pt-4 text-right font-semibold text-foreground">
                  Total Equipment Cost:
                </td>
                <td className="pt-4 text-right text-lg font-bold text-foreground">
                  {formatCurrency(totalCost)}
                </td>
              </tr>
              {validationErrors.length > 0 && (
                <tr>
                  <td colSpan={8} className="pt-2">
                    <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-700">
                      <strong>Validation Errors:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {validationErrors.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </td>
                </tr>
              )}
              {validationWarnings.length > 0 && validationErrors.length === 0 && (
                <tr>
                  <td colSpan={8} className="pt-2">
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-sm text-yellow-700">
                      <strong>Validation Warnings:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {validationWarnings.map((warning, idx) => (
                          <li key={idx}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/wizard/${projectId}/sizing`)}
          >
            Back
          </Button>
          <Button
            onClick={handleContinue}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Plan...
              </>
            ) : (
              "Continue to Installation Plan"
            )}
          </Button>
        </div>
      </Card>

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
    </div>
  );
}
