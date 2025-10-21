"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
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
  ShoppingCart,
  Search,
  DollarSign,
  Star,
  Shield,
  Loader2
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { SYSTEM_SIZING } from "@/lib/config";

interface DistributorProduct {
  id: string;
  name: string;
  category: 'SOLAR_PANEL' | 'BATTERY' | 'INVERTER' | 'MOUNTING' | 'ELECTRICAL';
  manufacturer: string;
  modelNumber: string;
  specifications: Record<string, string | number>;
  unitPrice: number;
  imageUrl?: string;
  inStock: boolean;
  warranty?: string;
  efficiency?: number;
  rating?: number;
  reviews?: number;
  distributorName: string;
  distributorId: string;
}

interface SelectedProduct {
  product: DistributorProduct;
  quantity: number;
  isExisting?: boolean;
}

interface SystemConfig {
  // Selected products from distributors
  selectedSolarPanels: SelectedProduct | null;
  selectedBattery: SelectedProduct | null;
  selectedInverter: SelectedProduct | null;
  selectedMounting: SelectedProduct | null;
  selectedElectrical: SelectedProduct | null;
  
  // Custom/manual entry
  customPanelCount: number;
  customPanelWattage: number;
  customBatteryKwh: number;
  customInverterKw: number;
  
  // System configuration
  backupDurationHrs: number;
  criticalLoadKw: number;
  systemType: 'full' | 'solar-only' | 'battery-only' | 'hybrid' | 'expansion';
  useDistributorProducts: boolean;
}

interface EquipmentEditorEnhancedProps {
  projectId: string;
  distributorId?: string;
  monthlyUsageKwh?: number;
  onSave: (system: {
    totalSolarKw: number;
    batteryKwh: number;
    inverterKw: number;
    backupDurationHrs: number;
    estimatedCostUsd: number;
    selectedProducts: {
      solarPanels: SelectedProduct | null;
      battery: SelectedProduct | null;
      inverter: SelectedProduct | null;
      mounting: SelectedProduct | null;
      electrical: SelectedProduct | null;
    } | null;
    customSpecs: {
      panelCount: number;
      panelWattage: number;
      batteryKwh: number;
      inverterKw: number;
    } | null;
  }) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}

// Mock product data - in real app, this would come from API
const MOCK_PRODUCTS: DistributorProduct[] = [
  {
    id: "1",
    name: "Q.PEAK DUO BLK ML-G10+ 400W",
    category: "SOLAR_PANEL",
    manufacturer: "Qcells",
    modelNumber: "Q.PEAK-DUO-BLK-ML-G10-400",
    specifications: {
      wattage: 400,
      efficiency: 20.6,
      dimensions: "1722 x 1134 x 32mm",
      weight: "22.5kg",
      technology: "Monocrystalline"
    },
    unitPrice: 280,
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop",
    inStock: true,
    warranty: "25 years",
    efficiency: 20.6,
    rating: 4.8,
    reviews: 156,
    distributorName: "Solar Wholesale",
    distributorId: "dist-1"
  },
  {
    id: "2",
    name: "Tesla Powerwall 3",
    category: "BATTERY",
    manufacturer: "Tesla",
    modelNumber: "POWERWALL3",
    specifications: {
      capacity: "13.5kWh",
      power: "11.5kW continuous",
      dimensions: "1150 x 755 x 155mm",
      weight: "130kg",
      chemistry: "Lithium Iron Phosphate"
    },
    unitPrice: 8500,
    imageUrl: "https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?w=200&h=200&fit=crop",
    inStock: true,
    warranty: "10 years",
    rating: 4.9,
    reviews: 342,
    distributorName: "Tesla Energy",
    distributorId: "dist-2"
  },
  {
    id: "3",
    name: "SolarEdge SE7600H-US HD-Wave",
    category: "INVERTER",
    manufacturer: "SolarEdge",
    modelNumber: "SE7600H-US",
    specifications: {
      power: "7.6kW",
      efficiency: 99,
      mppt: 2,
      dimensions: "370 x 385 x 174mm",
      weight: "25.7kg"
    },
    unitPrice: 2200,
    imageUrl: "https://images.unsplash.com/photo-1565514020179-026b92b84bb6?w=200&h=200&fit=crop",
    inStock: true,
    warranty: "12 years",
    efficiency: 99,
    rating: 4.7,
    reviews: 89,
    distributorName: "Solar Wholesale",
    distributorId: "dist-1"
  }
];

export default function EquipmentEditorEnhanced({
  projectId,
  distributorId,
  monthlyUsageKwh = 900,
  onSave,
  onCancel,
  saving = false
}: EquipmentEditorEnhancedProps) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<DistributorProduct[]>(MOCK_PRODUCTS);
  const [filteredProducts, setFilteredProducts] = useState<DistributorProduct[]>(MOCK_PRODUCTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [config, setConfig] = useState<SystemConfig>({
    selectedSolarPanels: null,
    selectedBattery: null,
    selectedInverter: null,
    selectedMounting: null,
    selectedElectrical: null,
    customPanelCount: 0,
    customPanelWattage: 400,
    customBatteryKwh: 0,
    customInverterKw: 5,
    backupDurationHrs: 24,
    criticalLoadKw: 3,
    systemType: 'full',
    useDistributorProducts: true
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Load distributor products
  useEffect(() => {
    if (distributorId) {
      loadDistributorProducts();
    }
  }, [distributorId]);

  const loadDistributorProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/equipment?distributorId=${distributorId}`);
      const data = await response.json();
      if (data.success) {
        setProducts(data.equipment);
        setFilteredProducts(data.equipment);
      }
    } catch (error) {
      console.error("Error loading products:", error);
      // Use mock data as fallback
      setProducts(MOCK_PRODUCTS);
      setFilteredProducts(MOCK_PRODUCTS);
    } finally {
      setLoading(false);
    }
  };

  // Filter products based on search and category
  useEffect(() => {
    let filtered = products;
    
    if (selectedCategory !== "all") {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.modelNumber.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredProducts(filtered);
  }, [searchQuery, selectedCategory, products]);

  // Calculate totals
  const calculateTotals = () => {
    let totalSolarKw = 0;
    let totalBatteryKwh = 0;
    let totalInverterKw = 0;
    let totalCost = 0;

    if (config.useDistributorProducts) {
      // Calculate from selected products
      if (config.selectedSolarPanels) {
        const wattage = config.selectedSolarPanels.product.specifications.wattage as number;
        totalSolarKw = (wattage * config.selectedSolarPanels.quantity) / 1000;
        if (!config.selectedSolarPanels.isExisting) {
          totalCost += config.selectedSolarPanels.product.unitPrice * config.selectedSolarPanels.quantity;
        }
      }
      
      if (config.selectedBattery) {
        const capacity = parseFloat(config.selectedBattery.product.specifications.capacity as string);
        totalBatteryKwh = capacity * config.selectedBattery.quantity;
        if (!config.selectedBattery.isExisting) {
          totalCost += config.selectedBattery.product.unitPrice * config.selectedBattery.quantity;
        }
      }
      
      if (config.selectedInverter) {
        const power = parseFloat(config.selectedInverter.product.specifications.power as string);
        totalInverterKw = power;
        if (!config.selectedInverter.isExisting) {
          totalCost += config.selectedInverter.product.unitPrice;
        }
      }
      
      // Add mounting and electrical
      if (config.selectedMounting && !config.selectedMounting.isExisting) {
        totalCost += config.selectedMounting.product.unitPrice * config.selectedMounting.quantity;
      }
      if (config.selectedElectrical && !config.selectedElectrical.isExisting) {
        totalCost += config.selectedElectrical.product.unitPrice * config.selectedElectrical.quantity;
      }
    } else {
      // Calculate from custom values
      totalSolarKw = (config.customPanelCount * config.customPanelWattage) / 1000;
      totalBatteryKwh = config.customBatteryKwh;
      totalInverterKw = config.customInverterKw;
      
      totalCost = 
        totalSolarKw * 1000 * SYSTEM_SIZING.SOLAR_COST_PER_WATT +
        totalBatteryKwh * SYSTEM_SIZING.BATTERY_COST_PER_KWH +
        totalInverterKw * SYSTEM_SIZING.INVERTER_COST_PER_KW;
    }

    // Add installation cost
    totalCost += SYSTEM_SIZING.INSTALLATION_BASE_COST;

    return {
      totalSolarKw,
      totalBatteryKwh,
      totalInverterKw,
      totalCost
    };
  };

  const { totalSolarKw, totalBatteryKwh, totalInverterKw, totalCost } = calculateTotals();

  // Calculate production metrics
  const dailyProduction = totalSolarKw * SYSTEM_SIZING.PEAK_SUN_HOURS;
  const dailyUsage = monthlyUsageKwh / 30;
  const selfSufficiency = Math.min(100, (dailyProduction / dailyUsage) * 100);

  // Product selection handler
  const handleProductSelect = (product: DistributorProduct, category: string) => {
    const quantity = category === 'SOLAR_PANEL' ? 20 : 1; // Default quantities
    const selectedProduct: SelectedProduct = {
      product,
      quantity,
      isExisting: false
    };

    setConfig(prev => ({
      ...prev,
      [`selected${category.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join('')}`]: selectedProduct
    }));
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
    
    setValidationErrors(errors);
  }, [totalSolarKw, totalBatteryKwh, totalInverterKw]);

  const handleSave = async () => {
    if (validationErrors.length > 0 && !validationErrors.every(e => e.includes("Recommended"))) {
      return;
    }

    const systemData = {
      // Basic system specs
      totalSolarKw,
      batteryKwh: totalBatteryKwh,
      inverterKw: totalInverterKw,
      backupDurationHrs: config.backupDurationHrs,
      estimatedCostUsd: totalCost,
      
      // Selected products
      selectedProducts: config.useDistributorProducts ? {
        solarPanels: config.selectedSolarPanels,
        battery: config.selectedBattery,
        inverter: config.selectedInverter,
        mounting: config.selectedMounting,
        electrical: config.selectedElectrical
      } : null,
      
      // Custom specs
      customSpecs: !config.useDistributorProducts ? {
        panelCount: config.customPanelCount,
        panelWattage: config.customPanelWattage,
        batteryKwh: config.customBatteryKwh,
        inverterKw: config.customInverterKw
      } : null
    };

    await onSave(systemData);
  };

  return (
    <div className="space-y-6">
      {/* Product Selection Mode Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Equipment Selection Mode</CardTitle>
              <CardDescription>Choose products from distributors or enter custom specifications</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="use-distributor">Use Distributor Products</Label>
              <Switch
                id="use-distributor"
                checked={config.useDistributorProducts}
                onCheckedChange={(checked) => 
                  setConfig(prev => ({ ...prev, useDistributorProducts: checked }))
                }
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {config.useDistributorProducts ? (
        <>
          {/* Product Search and Filter */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="SOLAR_PANEL">Solar Panels</SelectItem>
                    <SelectItem value="BATTERY">Batteries</SelectItem>
                    <SelectItem value="INVERTER">Inverters</SelectItem>
                    <SelectItem value="MOUNTING">Mounting</SelectItem>
                    <SelectItem value="ELECTRICAL">Electrical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
          </Card>

          {/* Product Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <Card className="col-span-full">
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2">Loading products...</span>
                </CardContent>
              </Card>
            ) : filteredProducts.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No products found</p>
                </CardContent>
              </Card>
            ) : (
              filteredProducts.map(product => (
                <Card 
                  key={product.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    (config.selectedSolarPanels?.product.id === product.id ||
                     config.selectedBattery?.product.id === product.id ||
                     config.selectedInverter?.product.id === product.id) 
                    ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleProductSelect(product, product.category)}
                >
                  <CardContent className="p-4">
                    {/* Product Image */}
                    <div className="relative h-48 bg-gray-100 rounded-lg mb-4 overflow-hidden">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                            const icon = document.createElement('div');
                            icon.innerHTML = '<svg class="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                            target.parentElement?.appendChild(icon);
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Package className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      {product.inStock && (
                        <Badge className="absolute top-2 right-2 bg-green-600">
                          In Stock
                        </Badge>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="space-y-2">
                      <div>
                        <h3 className="font-semibold text-sm line-clamp-2">{product.name}</h3>
                        <p className="text-xs text-muted-foreground">{product.manufacturer}</p>
                      </div>

                      {/* Ratings */}
                      {product.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs font-medium">{product.rating}</span>
                          <span className="text-xs text-muted-foreground">({product.reviews})</span>
                        </div>
                      )}

                      {/* Key Specs */}
                      <div className="space-y-1">
                        {product.category === 'SOLAR_PANEL' && (
                          <>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Power:</span>
                              <span className="font-medium">{product.specifications.wattage}W</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Efficiency:</span>
                              <span className="font-medium">{product.efficiency}%</span>
                            </div>
                          </>
                        )}
                        {product.category === 'BATTERY' && (
                          <>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Capacity:</span>
                              <span className="font-medium">{product.specifications.capacity}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Power:</span>
                              <span className="font-medium">{product.specifications.power}</span>
                            </div>
                          </>
                        )}
                        {product.category === 'INVERTER' && (
                          <>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Power:</span>
                              <span className="font-medium">{product.specifications.power}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Efficiency:</span>
                              <span className="font-medium">{product.efficiency}%</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Warranty */}
                      {product.warranty && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Shield className="h-3 w-3" />
                          <span>{product.warranty} warranty</span>
                        </div>
                      )}

                      {/* Price */}
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-primary">
                            {formatCurrency(product.unitPrice)}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {product.distributorName}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Selected Products Summary */}
          {(config.selectedSolarPanels || config.selectedBattery || config.selectedInverter) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Selected Equipment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {config.selectedSolarPanels && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Sun className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="font-medium text-sm">{config.selectedSolarPanels.product.name}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfig(prev => ({
                                  ...prev,
                                  selectedSolarPanels: prev.selectedSolarPanels ? {
                                    ...prev.selectedSolarPanels,
                                    quantity: Math.max(1, prev.selectedSolarPanels.quantity - 1)
                                  } : null
                                }));
                              }}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-medium w-12 text-center">
                              {config.selectedSolarPanels.quantity}
                            </span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfig(prev => ({
                                  ...prev,
                                  selectedSolarPanels: prev.selectedSolarPanels ? {
                                    ...prev.selectedSolarPanels,
                                    quantity: prev.selectedSolarPanels.quantity + 1
                                  } : null
                                }));
                              }}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="text-xs text-muted-foreground">panels</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        {formatCurrency(config.selectedSolarPanels.product.unitPrice * config.selectedSolarPanels.quantity)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {((config.selectedSolarPanels.product.specifications.wattage as number) * config.selectedSolarPanels.quantity / 1000).toFixed(1)} kW
                      </p>
                    </div>
                  </div>
                )}
                
                {config.selectedBattery && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Battery className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-sm">{config.selectedBattery.product.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Qty: {config.selectedBattery.quantity}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        {formatCurrency(config.selectedBattery.product.unitPrice * config.selectedBattery.quantity)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {config.selectedBattery.product.specifications.capacity}
                      </p>
                    </div>
                  </div>
                )}
                
                {config.selectedInverter && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Zap className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="font-medium text-sm">{config.selectedInverter.product.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {config.selectedInverter.product.specifications.power}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        {formatCurrency(config.selectedInverter.product.unitPrice)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        /* Custom Specification Entry */
        <Card>
          <CardHeader>
            <CardTitle>Custom Equipment Specifications</CardTitle>
            <CardDescription>Enter equipment details manually</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Solar Panel Count</Label>
                <Input
                  type="number"
                  min="0"
                  value={config.customPanelCount}
                  onChange={(e) => 
                    setConfig(prev => ({ 
                      ...prev, 
                      customPanelCount: parseInt(e.target.value) || 0 
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Panel Wattage</Label>
                <Input
                  type="number"
                  min="0"
                  value={config.customPanelWattage}
                  onChange={(e) => 
                    setConfig(prev => ({ 
                      ...prev, 
                      customPanelWattage: parseInt(e.target.value) || 0 
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Battery Capacity (kWh)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={config.customBatteryKwh}
                  onChange={(e) => 
                    setConfig(prev => ({ 
                      ...prev, 
                      customBatteryKwh: parseFloat(e.target.value) || 0 
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Inverter Capacity (kW)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={config.customInverterKw}
                  onChange={(e) => 
                    setConfig(prev => ({ 
                      ...prev, 
                      customInverterKw: parseFloat(e.target.value) || 0 
                    }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Final System Summary */}
      <Card className="border-primary">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
          <CardTitle className="text-xl">Final System Configuration</CardTitle>
          <CardDescription>Complete summary of your energy system</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* System Specs */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              System Specifications
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Solar Capacity</p>
                <p className="text-2xl font-bold text-yellow-600">{totalSolarKw.toFixed(1)} kW</p>
                {config.selectedSolarPanels && (
                  <p className="text-xs text-muted-foreground">
                    {config.selectedSolarPanels.quantity} panels
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Battery Storage</p>
                <p className="text-2xl font-bold text-green-600">{totalBatteryKwh.toFixed(1)} kWh</p>
                <p className="text-xs text-muted-foreground">
                  {config.backupDurationHrs}hr backup
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Inverter Power</p>
                <p className="text-2xl font-bold text-purple-600">{totalInverterKw.toFixed(1)} kW</p>
                <p className="text-xs text-muted-foreground">
                  Continuous output
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Investment</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(totalCost)}</p>
                <p className="text-xs text-muted-foreground">
                  Incl. installation
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Production Analysis */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Energy Production Analysis
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Daily Production</p>
                <p className="font-semibold">{dailyProduction.toFixed(1)} kWh</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Production</p>
                <p className="font-semibold">{(dailyProduction * 30).toFixed(0)} kWh</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Annual Production</p>
                <p className="font-semibold">{(dailyProduction * 365).toFixed(0)} kWh</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Self-Sufficiency</p>
                <p className="font-semibold">{selfSufficiency.toFixed(0)}%</p>
              </div>
            </div>
            
            {/* Visual Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Energy Independence</span>
                <span>{selfSufficiency.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, selfSufficiency)}%` }}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Financial Summary */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Financial Breakdown
            </h3>
            <div className="space-y-2">
              {config.useDistributorProducts && config.selectedSolarPanels && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Solar Panels ({config.selectedSolarPanels.quantity}x {config.selectedSolarPanels.product.name})
                  </span>
                  <span className="font-medium">
                    {formatCurrency(config.selectedSolarPanels.product.unitPrice * config.selectedSolarPanels.quantity)}
                  </span>
                </div>
              )}
              {config.useDistributorProducts && config.selectedBattery && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Battery Storage ({config.selectedBattery.product.name})
                  </span>
                  <span className="font-medium">
                    {formatCurrency(config.selectedBattery.product.unitPrice * config.selectedBattery.quantity)}
                  </span>
                </div>
              )}
              {config.useDistributorProducts && config.selectedInverter && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Inverter ({config.selectedInverter.product.name})
                  </span>
                  <span className="font-medium">
                    {formatCurrency(config.selectedInverter.product.unitPrice)}
                  </span>
                </div>
              )}
              {!config.useDistributorProducts && (
                <>
                  {totalSolarKw > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Solar System ({totalSolarKw.toFixed(1)} kW)</span>
                      <span className="font-medium">
                        {formatCurrency(totalSolarKw * 1000 * SYSTEM_SIZING.SOLAR_COST_PER_WATT)}
                      </span>
                    </div>
                  )}
                  {totalBatteryKwh > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Battery Storage ({totalBatteryKwh.toFixed(1)} kWh)</span>
                      <span className="font-medium">
                        {formatCurrency(totalBatteryKwh * SYSTEM_SIZING.BATTERY_COST_PER_KWH)}
                      </span>
                    </div>
                  )}
                  {totalInverterKw > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Inverter ({totalInverterKw.toFixed(1)} kW)</span>
                      <span className="font-medium">
                        {formatCurrency(totalInverterKw * SYSTEM_SIZING.INVERTER_COST_PER_KW)}
                      </span>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Installation & Labor</span>
                <span className="font-medium">{formatCurrency(SYSTEM_SIZING.INSTALLATION_BASE_COST)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total System Cost</span>
                <span className="text-lg text-primary">{formatCurrency(totalCost)}</span>
              </div>
            </div>
          </div>

          {/* Estimated Savings */}
          <Alert className="bg-green-50 border-green-200">
            <DollarSign className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <div className="font-semibold mb-1">Estimated Annual Savings</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-green-700">Energy Bill Reduction: </span>
                  <span className="font-medium">
                    {formatCurrency((dailyProduction * 365 * 0.12))} / year
                  </span>
                </div>
                <div>
                  <span className="text-green-700">Payback Period: </span>
                  <span className="font-medium">
                    {(totalCost / (dailyProduction * 365 * 0.12)).toFixed(1)} years
                  </span>
                </div>
              </div>
            </AlertDescription>
          </Alert>

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
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={saving || (validationErrors.length > 0 && !validationErrors.every(e => e.includes("Recommended")))}
          className="flex-1"
        >
          {saving ? "Saving Configuration..." : "Save & Continue"}
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