"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Sun, 
  Battery, 
  Zap, 
  Plus, 
  Minus,
  Calculator,
  Package,
  Settings2,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { SYSTEM_SIZING } from "@/lib/config";

interface SystemConfig {
  // Existing equipment
  hasExistingPanels: boolean;
  existingPanelCount: number;
  existingPanelWattage: number;
  existingInverter: boolean;
  existingInverterKw: number;
  existingBattery: boolean;
  existingBatteryKwh: number;
  
  // New equipment to add
  newPanelCount: number;
  newPanelWattage: number;
  newBatteryKwh: number;
  newInverterKw: number;
  
  // System configuration
  backupDurationHrs: number;
  criticalLoadKw: number;
  systemType: 'full' | 'solar-only' | 'battery-only' | 'hybrid' | 'expansion';
}

interface EquipmentEditorProps {
  initialSystem?: {
    solarPanelCount: number;
    solarPanelWattage: number;
    totalSolarKw: number;
    batteryKwh: number;
    inverterKw: number;
    backupDurationHrs: number;
    estimatedCostUsd: number;
  };
  monthlyUsageKwh?: number;
  onSave: (system: {
    solarPanelCount: number;
    solarPanelWattage: number;
    totalSolarKw: number;
    batteryKwh: number;
    inverterKw: number;
    backupDurationHrs: number;
    estimatedCostUsd: number;
    batteryType: string;
    inverterType: string;
    criticalLoadKw: number;
    hasExistingEquipment: boolean;
    existingPanels: { count: number; wattage: number } | null;
    existingInverterKw: number | null;
    existingBatteryKwh: number | null;
  }) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}

// Common panel wattages in the market
const PANEL_WATTAGES = [
  { value: "250", label: "250W - Standard" },
  { value: "300", label: "300W - Standard" },
  { value: "350", label: "350W - High Efficiency" },
  { value: "400", label: "400W - High Efficiency" },
  { value: "450", label: "450W - Premium" },
  { value: "500", label: "500W - Premium" },
  { value: "550", label: "550W - Commercial" },
];

// Common battery sizes
const BATTERY_SIZES = [
  { value: "5", label: "5 kWh - Small Backup" },
  { value: "10", label: "10 kWh - Standard" },
  { value: "13.5", label: "13.5 kWh - Tesla Powerwall" },
  { value: "15", label: "15 kWh - Extended Backup" },
  { value: "20", label: "20 kWh - Large Home" },
  { value: "30", label: "30 kWh - Whole Home" },
];

// Common inverter sizes
const INVERTER_SIZES = [
  { value: "3", label: "3 kW - Small System" },
  { value: "5", label: "5 kW - Standard Home" },
  { value: "7.6", label: "7.6 kW - Large Home" },
  { value: "10", label: "10 kW - Premium" },
  { value: "12", label: "12 kW - Commercial" },
];

export default function EquipmentEditor({
  initialSystem,
  monthlyUsageKwh = 900,
  onSave,
  onCancel,
  saving = false
}: EquipmentEditorProps) {
  const [config, setConfig] = useState<SystemConfig>({
    hasExistingPanels: false,
    existingPanelCount: 0,
    existingPanelWattage: 0,
    existingInverter: false,
    existingInverterKw: 0,
    existingBattery: false,
    existingBatteryKwh: 0,
    newPanelCount: initialSystem?.solarPanelCount || 0,
    newPanelWattage: initialSystem?.solarPanelWattage || 400,
    newBatteryKwh: initialSystem?.batteryKwh || 0,
    newInverterKw: initialSystem?.inverterKw || 5,
    backupDurationHrs: initialSystem?.backupDurationHrs || 24,
    criticalLoadKw: 3,
    systemType: 'full'
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Calculate totals
  const totalSolarKw = ((config.existingPanelCount * config.existingPanelWattage) + 
                        (config.newPanelCount * config.newPanelWattage)) / 1000;
  const totalBatteryKwh = config.existingBatteryKwh + config.newBatteryKwh;
  const totalInverterKw = config.existingInverter ? 
    Math.max(config.existingInverterKw, config.newInverterKw) : 
    config.newInverterKw;

  // Calculate costs (only for new equipment)
  const newSolarCost = (config.newPanelCount * config.newPanelWattage) * SYSTEM_SIZING.SOLAR_COST_PER_WATT;
  const newBatteryCost = config.newBatteryKwh * SYSTEM_SIZING.BATTERY_COST_PER_KWH;
  const newInverterCost = config.existingInverter ? 0 : config.newInverterKw * SYSTEM_SIZING.INVERTER_COST_PER_KW;
  const installationCost = SYSTEM_SIZING.INSTALLATION_BASE_COST;
  const totalCost = newSolarCost + newBatteryCost + newInverterCost + installationCost;

  // Calculate daily energy production
  const dailyProduction = totalSolarKw * SYSTEM_SIZING.PEAK_SUN_HOURS;
  const dailyUsage = monthlyUsageKwh / 30;
  const selfSufficiency = Math.min(100, (dailyProduction / dailyUsage) * 100);

  // System presets
  const applyPreset = (preset: string) => {
    switch(preset) {
      case 'starter':
        setConfig(prev => ({
          ...prev,
          newPanelCount: 10,
          newPanelWattage: 400,
          newBatteryKwh: 5,
          newInverterKw: 3,
          systemType: 'full'
        }));
        break;
      case 'standard':
        setConfig(prev => ({
          ...prev,
          newPanelCount: 20,
          newPanelWattage: 400,
          newBatteryKwh: 13.5,
          newInverterKw: 5,
          systemType: 'full'
        }));
        break;
      case 'premium':
        setConfig(prev => ({
          ...prev,
          newPanelCount: 30,
          newPanelWattage: 450,
          newBatteryKwh: 20,
          newInverterKw: 10,
          systemType: 'full'
        }));
        break;
      case 'battery-backup':
        setConfig(prev => ({
          ...prev,
          newPanelCount: 0,
          newBatteryKwh: 13.5,
          newInverterKw: 5,
          systemType: 'battery-only'
        }));
        break;
    }
  };

  // Validate configuration
  useEffect(() => {
    const errors: string[] = [];
    
    if (totalSolarKw === 0 && totalBatteryKwh === 0) {
      errors.push("System must have either solar panels or battery storage");
    }
    
    if (totalInverterKw === 0) {
      errors.push("System requires an inverter");
    }
    
    if (totalSolarKw > 0 && totalInverterKw < totalSolarKw * 0.8) {
      errors.push(`Inverter may be undersized. Recommended: ${(totalSolarKw * 1.2).toFixed(1)} kW`);
    }
    
    if (totalBatteryKwh > 0 && totalInverterKw < totalBatteryKwh * 0.3) {
      errors.push(`Inverter too small for battery. Recommended: ${(totalBatteryKwh * 0.4).toFixed(1)} kW`);
    }
    
    setValidationErrors(errors);
  }, [totalSolarKw, totalBatteryKwh, totalInverterKw]);

  const handleSave = async () => {
    if (validationErrors.length > 0 && !validationErrors.every(e => e.includes("Recommended"))) {
      return;
    }

    const systemData = {
      solarPanelCount: config.existingPanelCount + config.newPanelCount,
      solarPanelWattage: config.newPanelCount > 0 ? config.newPanelWattage : config.existingPanelWattage,
      totalSolarKw,
      batteryKwh: totalBatteryKwh,
      inverterKw: totalInverterKw,
      backupDurationHrs: config.backupDurationHrs,
      estimatedCostUsd: totalCost,
      batteryType: "lithium",
      inverterType: "Hybrid String Inverter",
      criticalLoadKw: config.criticalLoadKw,
      // Store existing equipment info
      hasExistingEquipment: config.hasExistingPanels || config.existingInverter || config.existingBattery,
      existingPanels: config.hasExistingPanels ? {
        count: config.existingPanelCount,
        wattage: config.existingPanelWattage
      } : null,
      existingInverterKw: config.existingInverter ? config.existingInverterKw : null,
      existingBatteryKwh: config.existingBattery ? config.existingBatteryKwh : null,
    };

    await onSave(systemData);
  };

  return (
    <div className="space-y-6">
      {/* Quick Presets */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Configuration</CardTitle>
          <CardDescription>Choose a preset or customize your system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => applyPreset('starter')}
              className="text-xs"
            >
              <Package className="h-3 w-3 mr-1" />
              Starter (4kW)
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => applyPreset('standard')}
              className="text-xs"
            >
              <Package className="h-3 w-3 mr-1" />
              Standard (8kW)
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => applyPreset('premium')}
              className="text-xs"
            >
              <Package className="h-3 w-3 mr-1" />
              Premium (13kW)
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => applyPreset('battery-backup')}
              className="text-xs"
            >
              <Battery className="h-3 w-3 mr-1" />
              Battery Only
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="new" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="existing">Existing Equipment</TabsTrigger>
          <TabsTrigger value="new">New Equipment</TabsTrigger>
        </TabsList>

        {/* Existing Equipment Tab */}
        <TabsContent value="existing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Equipment</CardTitle>
              <CardDescription>Equipment the customer already has installed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Existing Solar Panels */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="has-panels" className="flex items-center gap-2">
                    <Sun className="h-4 w-4 text-yellow-600" />
                    Has Existing Solar Panels
                  </Label>
                  <Switch
                    id="has-panels"
                    checked={config.hasExistingPanels}
                    onCheckedChange={(checked) => 
                      setConfig(prev => ({ ...prev, hasExistingPanels: checked }))
                    }
                  />
                </div>
                
                {config.hasExistingPanels && (
                  <div className="grid grid-cols-2 gap-4 pl-6">
                    <div className="space-y-2">
                      <Label htmlFor="existing-count">Number of Panels</Label>
                      <Input
                        id="existing-count"
                        type="number"
                        min="0"
                        value={config.existingPanelCount}
                        onChange={(e) => 
                          setConfig(prev => ({ 
                            ...prev, 
                            existingPanelCount: parseInt(e.target.value) || 0 
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="existing-wattage">Wattage per Panel</Label>
                      <Select
                        value={config.existingPanelWattage.toString()}
                        onValueChange={(value) => 
                          setConfig(prev => ({ 
                            ...prev, 
                            existingPanelWattage: parseInt(value) 
                          }))
                        }
                      >
                        <SelectTrigger id="existing-wattage">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PANEL_WATTAGES.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {config.existingPanelCount > 0 && config.existingPanelWattage > 0 && (
                      <div className="col-span-2">
                        <Badge variant="secondary" className="text-sm">
                          Existing Solar: {((config.existingPanelCount * config.existingPanelWattage) / 1000).toFixed(1)} kW
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Existing Battery */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="has-battery" className="flex items-center gap-2">
                    <Battery className="h-4 w-4 text-green-600" />
                    Has Existing Battery
                  </Label>
                  <Switch
                    id="has-battery"
                    checked={config.existingBattery}
                    onCheckedChange={(checked) => 
                      setConfig(prev => ({ ...prev, existingBattery: checked }))
                    }
                  />
                </div>
                
                {config.existingBattery && (
                  <div className="pl-6 space-y-2">
                    <Label htmlFor="existing-battery">Battery Capacity (kWh)</Label>
                    <Input
                      id="existing-battery"
                      type="number"
                      min="0"
                      step="0.5"
                      value={config.existingBatteryKwh}
                      onChange={(e) => 
                        setConfig(prev => ({ 
                          ...prev, 
                          existingBatteryKwh: parseFloat(e.target.value) || 0 
                        }))
                      }
                      placeholder="e.g., 13.5 for Tesla Powerwall"
                    />
                  </div>
                )}
              </div>

              {/* Existing Inverter */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="has-inverter" className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-purple-600" />
                    Has Existing Inverter
                  </Label>
                  <Switch
                    id="has-inverter"
                    checked={config.existingInverter}
                    onCheckedChange={(checked) => 
                      setConfig(prev => ({ ...prev, existingInverter: checked }))
                    }
                  />
                </div>
                
                {config.existingInverter && (
                  <div className="pl-6 space-y-2">
                    <Label htmlFor="existing-inverter">Inverter Capacity (kW)</Label>
                    <Select
                      value={config.existingInverterKw.toString()}
                      onValueChange={(value) => 
                        setConfig(prev => ({ 
                          ...prev, 
                          existingInverterKw: parseFloat(value) 
                        }))
                      }
                    >
                      <SelectTrigger id="existing-inverter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INVERTER_SIZES.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* New Equipment Tab */}
        <TabsContent value="new" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>New Equipment to Install</CardTitle>
              <CardDescription>Equipment to be purchased and installed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* New Solar Panels */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-yellow-600" />
                  Solar Panels
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-panel-count">Number of Panels</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => 
                          setConfig(prev => ({ 
                            ...prev, 
                            newPanelCount: Math.max(0, prev.newPanelCount - 1) 
                          }))
                        }
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        id="new-panel-count"
                        type="number"
                        min="0"
                        value={config.newPanelCount}
                        onChange={(e) => 
                          setConfig(prev => ({ 
                            ...prev, 
                            newPanelCount: parseInt(e.target.value) || 0 
                          }))
                        }
                        className="text-center"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => 
                          setConfig(prev => ({ 
                            ...prev, 
                            newPanelCount: prev.newPanelCount + 1 
                          }))
                        }
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-panel-wattage">Panel Wattage</Label>
                    <Select
                      value={config.newPanelWattage.toString()}
                      onValueChange={(value) => 
                        setConfig(prev => ({ 
                          ...prev, 
                          newPanelWattage: parseInt(value) 
                        }))
                      }
                    >
                      <SelectTrigger id="new-panel-wattage">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PANEL_WATTAGES.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {config.newPanelCount > 0 && (
                    <div className="col-span-2 flex justify-between items-center">
                      <Badge variant="secondary">
                        New Solar: {((config.newPanelCount * config.newPanelWattage) / 1000).toFixed(1)} kW
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Cost: {formatCurrency(newSolarCost)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* New Battery */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <Battery className="h-4 w-4 text-green-600" />
                  Battery Storage
                </Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Select
                      value={config.newBatteryKwh.toString()}
                      onValueChange={(value) => 
                        setConfig(prev => ({ 
                          ...prev, 
                          newBatteryKwh: parseFloat(value) 
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">No Battery</SelectItem>
                        {BATTERY_SIZES.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={config.newBatteryKwh}
                      onChange={(e) => 
                        setConfig(prev => ({ 
                          ...prev, 
                          newBatteryKwh: parseFloat(e.target.value) || 0 
                        }))
                      }
                      className="w-24"
                      placeholder="Custom"
                    />
                  </div>
                  {config.newBatteryKwh > 0 && (
                    <div className="flex justify-between items-center">
                      <Badge variant="secondary">
                        {config.newBatteryKwh} kWh Storage
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Cost: {formatCurrency(newBatteryCost)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* New Inverter */}
              {!config.existingInverter && (
                <div className="space-y-4">
                  <Label className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-purple-600" />
                    Inverter
                  </Label>
                  <div className="space-y-2">
                    <Select
                      value={config.newInverterKw.toString()}
                      onValueChange={(value) => 
                        setConfig(prev => ({ 
                          ...prev, 
                          newInverterKw: parseFloat(value) 
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INVERTER_SIZES.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {config.newInverterKw > 0 && (
                      <div className="flex justify-between items-center">
                        <Badge variant="secondary">
                          {config.newInverterKw} kW Inverter
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Cost: {formatCurrency(newInverterCost)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <Button
            variant="ghost"
            className="w-full justify-between"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <span className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Advanced Settings
            </span>
            <span>{showAdvanced ? "Hide" : "Show"}</span>
          </Button>
        </CardHeader>
        {showAdvanced && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="backup-hours">Backup Duration (hours)</Label>
                <Input
                  id="backup-hours"
                  type="number"
                  min="0"
                  value={config.backupDurationHrs}
                  onChange={(e) => 
                    setConfig(prev => ({ 
                      ...prev, 
                      backupDurationHrs: parseInt(e.target.value) || 0 
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="critical-load">Critical Load (kW)</Label>
                <Input
                  id="critical-load"
                  type="number"
                  min="0"
                  step="0.5"
                  value={config.criticalLoadKw}
                  onChange={(e) => 
                    setConfig(prev => ({ 
                      ...prev, 
                      criticalLoadKw: parseFloat(e.target.value) || 0 
                    }))
                  }
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* System Summary */}
      <Card className="border-primary">
        <CardHeader>
          <CardTitle>System Summary</CardTitle>
          <CardDescription>Total configuration including existing and new equipment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Solar</p>
              <p className="text-2xl font-bold">{totalSolarKw.toFixed(1)} kW</p>
              <p className="text-xs text-muted-foreground">
                {config.existingPanelCount + config.newPanelCount} panels
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Battery</p>
              <p className="text-2xl font-bold">{totalBatteryKwh.toFixed(1)} kWh</p>
              <p className="text-xs text-muted-foreground">
                {config.backupDurationHrs}hr backup
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Inverter</p>
              <p className="text-2xl font-bold">{totalInverterKw.toFixed(1)} kW</p>
              <p className="text-xs text-muted-foreground">
                {config.existingInverter ? "Existing" : "New"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">New Equipment Cost</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totalCost)}</p>
              <p className="text-xs text-muted-foreground">
                Incl. installation
              </p>
            </div>
          </div>

          {/* Production Analysis */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Production Analysis
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Daily Production: </span>
                <span className="font-medium">{dailyProduction.toFixed(1)} kWh</span>
              </div>
              <div>
                <span className="text-muted-foreground">Daily Usage: </span>
                <span className="font-medium">{dailyUsage.toFixed(1)} kWh</span>
              </div>
              <div>
                <span className="text-muted-foreground">Self-Sufficiency: </span>
                <span className="font-medium">{selfSufficiency.toFixed(0)}%</span>
              </div>
              <div>
                <span className="text-muted-foreground">Battery Runtime: </span>
                <span className="font-medium">
                  {totalBatteryKwh > 0 ? 
                    `${(totalBatteryKwh / config.criticalLoadKw).toFixed(1)} hrs` : 
                    "No backup"
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Validation Messages */}
          {validationErrors.length > 0 && (
            <Alert variant={validationErrors.some(e => !e.includes("Recommended")) ? "destructive" : "default"}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, idx) => (
                    <li key={idx} className="text-sm">{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {validationErrors.length === 0 && totalSolarKw + totalBatteryKwh > 0 && (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                System configuration is valid and ready to save
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={saving || (validationErrors.length > 0 && !validationErrors.every(e => e.includes("Recommended")))}
          className="flex-1"
        >
          {saving ? "Saving..." : "Save Configuration"}
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}