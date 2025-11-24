"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sun,
  Plus,
  Minus,
  Calculator,
  Zap,
  TrendingUp,
  Settings,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface System {
  id: string;
  solarPanelCount: number;
  solarPanelWattage: number;
  totalSolarKw: number;
  batteryKwh: number;
  inverterKw: number;
  backupDurationHrs: number;
  criticalLoadKw?: number;
  estimatedCostUsd: number;
  batteryType?: string;
  inverterType?: string;
}

interface PanelManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  system?: System;
  onSystemChange?: (system: System) => void;
}

export function PanelManagementModal({
  open,
  onOpenChange,
  projectId,
  system,
  onSystemChange,
}: PanelManagementModalProps) {
  const [panelCount, setPanelCount] = useState(system?.solarPanelCount || 0);
  const [panelWattage, setPanelWattage] = useState(system?.solarPanelWattage || 400);
  const [saving, setSaving] = useState(false);
  
  // Common panel wattages
  const commonWattages = [300, 350, 400, 450, 500, 550];

  const calculateTotalKw = () => {
    return (panelCount * panelWattage) / 1000;
  };

  const calculateEstimatedProduction = () => {
    // Rough estimate: 4.5 peak sun hours average in US
    const dailyProduction = calculateTotalKw() * 4.5;
    const monthlyProduction = dailyProduction * 30;
    const yearlyProduction = dailyProduction * 365;
    
    return {
      daily: dailyProduction,
      monthly: monthlyProduction,
      yearly: yearlyProduction,
    };
  };

  const calculateCostImpact = () => {
    if (!system) return { panelCost: 0, totalSystemCost: 0, costPerWatt: 0 };
    
    const currentKw = system.totalSolarKw;
    const newKw = calculateTotalKw();
    const kwDifference = newKw - currentKw;
    
    // Rough estimates: $3-4 per watt installed
    const costPerWatt = 3.5;
    const panelCostChange = kwDifference * 1000 * costPerWatt;
    const newTotalSystemCost = system.estimatedCostUsd + panelCostChange;
    
    return {
      panelCost: panelCostChange,
      totalSystemCost: newTotalSystemCost,
      costPerWatt: (newTotalSystemCost / (newKw * 1000)),
    };
  };

  const handleQuickAdjust = (change: number) => {
    const newCount = Math.max(0, panelCount + change);
    setPanelCount(newCount);
  };

  const downsizeToLimit = (maxKw: number) => {
    // Calculate maximum number of panels to stay under the limit
    const maxPanels = Math.floor((maxKw * 1000) / panelWattage);
    setPanelCount(maxPanels);
  };

  const isOverLimit = (limitKw: number) => {
    return calculateTotalKw() > limitKw;
  };

  const handleSaveChanges = async () => {
    if (!system) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/system`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solarPanelCount: panelCount,
          solarPanelWattage: panelWattage,
          totalSolarKw: calculateTotalKw(),
        }),
      });

      const data = await response.json();
      if (data.success && onSystemChange) {
        const updatedSystem = {
          ...system,
          solarPanelCount: panelCount,
          solarPanelWattage: panelWattage,
          totalSolarKw: calculateTotalKw(),
        };
        onSystemChange(updatedSystem);
      }
    } catch (error) {
      console.error('Error updating system:', error);
    } finally {
      setSaving(false);
    }
  };

  const production = calculateEstimatedProduction();
  const costImpact = calculateCostImpact();
  const hasChanges = system && (
    panelCount !== system.solarPanelCount || 
    panelWattage !== system.solarPanelWattage
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[95vh] flex flex-col bg-white">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <Sun className="h-5 w-5" />
            Solar Panel Configuration
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Adjust the number and type of solar panels for optimal system performance
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0 overflow-y-auto pr-2">
          {/* Panel Configuration */}
          <div className="space-y-4">
            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings className="h-5 w-5" />
                  Panel Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Panel Count */}
                <div className="space-y-2">
                  <Label htmlFor="panel-count">Number of Panels</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAdjust(-1)}
                      disabled={panelCount <= 0}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      id="panel-count"
                      type="number"
                      value={panelCount}
                      onChange={(e) => setPanelCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="text-center"
                      min="0"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAdjust(1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Quick adjust buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleQuickAdjust(-5)}
                      disabled={panelCount < 5}
                    >
                      -5
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleQuickAdjust(-10)}
                      disabled={panelCount < 10}
                    >
                      -10
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleQuickAdjust(10)}
                    >
                      +10
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleQuickAdjust(5)}
                    >
                      +5
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Permit Compliance Section */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Permit Compliance</Label>
                  
                  {/* Georgia 10kW Residential Limit */}
                  {isOverLimit(10) && (
                    <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 text-sm">
                          <p className="font-semibold text-red-900">
                            System exceeds 10kW residential limit
                          </p>
                          <p className="text-red-700 mt-1">
                            Current: {calculateTotalKw().toFixed(2)} kW. Must reduce to 10kW or obtain commercial permit.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downsizeToLimit(10)}
                            className="mt-2 border-red-300 text-red-700 hover:bg-red-50"
                          >
                            Downsize to 10kW
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Other common limits */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Quick downsize options:</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downsizeToLimit(10)}
                        disabled={!isOverLimit(10)}
                        className={isOverLimit(10) ? "border-amber-300" : ""}
                      >
                        10kW (GA Residential)
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downsizeToLimit(20)}
                        disabled={!isOverLimit(20)}
                      >
                        20kW
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downsizeToLimit(50)}
                        disabled={!isOverLimit(50)}
                      >
                        50kW
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Panel Wattage */}
                <div className="space-y-2">
                  <Label htmlFor="panel-wattage">Panel Wattage (W)</Label>
                  <Select 
                    value={panelWattage.toString()} 
                    onValueChange={(value) => setPanelWattage(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {commonWattages.map((wattage) => (
                        <SelectItem key={wattage} value={wattage.toString()}>
                          {wattage}W
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="text-sm text-muted-foreground">
                    Or enter custom wattage:
                  </div>
                  <Input
                    type="number"
                    value={panelWattage}
                    onChange={(e) => setPanelWattage(parseInt(e.target.value) || 400)}
                    min="100"
                    max="1000"
                  />
                </div>

                <Separator />

                {/* System Summary */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    System Summary
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Total Panels:</span>
                      <span className="font-medium">{panelCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Panel Wattage:</span>
                      <span className="font-medium">{panelWattage}W each</span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold text-blue-600">
                      <span>System Size:</span>
                      <span>{calculateTotalKw().toFixed(1)} kW</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance & Cost Impact */}
          <div className="space-y-4">
            {/* Production Estimates */}
            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5" />
                  Production Estimates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Daily:</span>
                    <span className="font-medium">{production.daily.toFixed(1)} kWh</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly:</span>
                    <span className="font-medium">{production.monthly.toFixed(0)} kWh</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span className="text-muted-foreground">Yearly:</span>
                    <span className="font-semibold text-green-600">
                      {production.yearly.toFixed(0)} kWh
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <div className="text-sm text-green-800">
                    <strong>Note:</strong> Estimates based on 4.5 peak sun hours average. 
                    Actual production varies by location, weather, and installation factors.
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cost Impact */}
            {system && (
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Zap className="h-5 w-5" />
                    Cost Impact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current System:</span>
                      <span>{system.totalSolarKw.toFixed(1)} kW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">New System:</span>
                      <span className="font-medium">{calculateTotalKw().toFixed(1)} kW</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cost Change:</span>
                      <span className={`font-medium ${
                        costImpact.panelCost >= 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {costImpact.panelCost >= 0 ? '+' : ''}
                        {formatCurrency(costImpact.panelCost)}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg">
                      <span className="text-muted-foreground">New Total:</span>
                      <span className="font-semibold">
                        {formatCurrency(costImpact.totalSystemCost)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cost per Watt:</span>
                      <span>{formatCurrency(costImpact.costPerWatt)}/W</span>
                    </div>
                  </div>

                  {Math.abs(costImpact.panelCost) > 5000 && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-2 text-amber-800">
                        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <strong>Large cost change detected.</strong> Consider reviewing 
                          system sizing and financing options.
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleSaveChanges}
                disabled={!hasChanges || saving}
                className="flex-1"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setPanelCount(system?.solarPanelCount || 0);
                  setPanelWattage(system?.solarPanelWattage || 400);
                }}
                disabled={!hasChanges}
              >
                Reset
              </Button>
            </div>

            {hasChanges && (
              <div className="text-sm text-muted-foreground text-center">
                Changes will update system sizing and BOM costs
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
