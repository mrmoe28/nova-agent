"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
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
}

export default function BOMPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [totalCost, setTotalCost] = useState(0);

  useEffect(() => {
    generateBOM();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateBOM = async () => {
    setGenerating(true);
    try {
      const response = await fetch("/api/bom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const data = await response.json();

      if (data.success) {
        setBomItems(data.bomItems);
        setTotalCost(data.totalCost);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error generating BOM:", error);
      alert("Failed to generate BOM");
    } finally {
      setGenerating(false);
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

  if (generating) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">
            Generating Bill of Materials...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Bill of Materials</h1>
        <p className="mt-2 text-muted-foreground">
          Equipment list with pricing for your solar + battery system
        </p>
      </div>

      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="pb-3 text-left font-semibold">Category</th>
                <th className="pb-3 text-left font-semibold">Item</th>
                <th className="pb-3 text-left font-semibold">Model</th>
                <th className="pb-3 text-right font-semibold">Qty</th>
                <th className="pb-3 text-right font-semibold">Unit Price</th>
                <th className="pb-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {bomItems.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-3 text-sm capitalize">{item.category}</td>
                  <td className="py-3 text-sm">{item.itemName}</td>
                  <td className="py-3 text-sm font-mono text-xs">
                    {item.modelNumber}
                  </td>
                  <td className="py-3 text-sm text-right">{item.quantity}</td>
                  <td className="py-3 text-sm text-right">
                    {formatCurrency(item.unitPriceUsd)}
                  </td>
                  <td className="py-3 text-sm text-right font-semibold">
                    {formatCurrency(item.totalPriceUsd)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2">
                <td colSpan={5} className="pt-4 text-right font-semibold">
                  Total Equipment Cost:
                </td>
                <td className="pt-4 text-right text-lg font-bold">
                  {formatCurrency(totalCost)}
                </td>
              </tr>
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
    </div>
  );
}
