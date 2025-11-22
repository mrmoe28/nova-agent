"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  FileText,
  Zap,
  Battery,
  DollarSign,
  Calculator,
  Clock,
  TrendingUp,
  Settings,
  Archive,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Edit,
  Share2,
  Trash2,
  Copy
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatCurrency } from "@/lib/utils";
import { BillAnalysisCard } from "@/components/BillAnalysisCard";
import { BOMItemsModal } from "@/components/BOMItemsModal";
import { BillsModal } from "@/components/BillsModal";
import { PanelManagementModal } from "@/components/PanelManagementModal";
import dynamic from "next/dynamic";

// Dynamically import charts to avoid SSR issues with recharts
const EnergyCharts = dynamic(
  () => import("@/components/EnergyCharts"),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8 min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div className="text-sm text-muted-foreground">Loading charts...</div>
        </div>
      </div>
    )
  }
);

interface Project {
  id: string;
  customerName: string;
  customerAddress: string;
  status: string;
  createdAt: string;
  system?: {
    id: string;
    solarPanelCount: number;
    solarPanelWattage: number;
    totalSolarKw: number;
    batteryKwh: number;
    inverterKw: number;
    backupDurationHrs: number;
    estimatedCostUsd: number;
    batteryType?: string;
    inverterType?: string;
  };
  analysis?: {
    id: string;
    monthlyUsageKwh: number;
    peakDemandKw: number | null;
    averageCostPerKwh: number;
    annualCostUsd: number;
  };
  bills?: Array<{
    id: string;
    fileName: string;
    fileType: string;
    uploadedAt: string;
    ocrText?: string;
    extractedData?: Record<string, unknown>;
  }>;
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
  notes: string | null;
}

interface Plan {
  id: string;
  necChecks: Record<string, unknown>[];
  warnings: Record<string, unknown>[];
  installSteps: string[];
  timeline: string;
  laborHoursEst: number;
  permitNotes: string;
}

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Modal states
  const [showBOMModal, setShowBOMModal] = useState(false);
  const [showBillsModal, setShowBillsModal] = useState(false);
  const [showPanelModal, setShowPanelModal] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set(['cost', 'energyAnalysis', 'monthlyUsage', 'costOverTime']));
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const fetchProjectDetails = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch project details
      const projectResponse = await fetch(`/api/projects/${projectId}`);
      const projectData = await projectResponse.json();
      
      if (projectData.success) {
        setProject(projectData.project);
        
        // Fetch BOM items if available
        if (projectData.project.status !== 'intake') {
          const bomResponse = await fetch('/api/bom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId }),
          });
          const bomData = await bomResponse.json();
          if (bomData.success) {
            setBomItems(bomData.bomItems);
          }
          
          // Fetch installation plan if available
          const planResponse = await fetch('/api/plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId }),
          });
          const planData = await planResponse.json();
          if (planData.success) {
            setPlan(planData.plan);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching project details:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjectDetails();
  }, [fetchProjectDetails]);

  // Handle URL tab parameter to auto-open modals
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && project) {
      switch (tab) {
        case 'bills':
          setShowBillsModal(true);
          break;
        case 'bom':
          setShowBOMModal(true);
          break;
        case 'panels':
          setShowPanelModal(true);
          break;
      }
    }
  }, [searchParams, project]);

  const getSystemTypeLabel = () => {
    if (!project?.system) return "Not Configured";
    const { totalSolarKw, batteryKwh } = project.system;
    
    if (totalSolarKw > 0 && batteryKwh > 0) return "Solar + Battery";
    if (totalSolarKw > 0) return "Solar Only";
    if (batteryKwh > 0) return "Battery Only";
    return "System Pending";
  };

  // Calculate system specs from BOM items (actual equipment selected)
  const calculateSystemFromBOM = () => {
    if (bomItems.length === 0) return null;

    // Extract solar panels
    const solarPanels = bomItems.filter(item => 
      item.category.toLowerCase().includes('solar') || 
      item.category === 'SOLAR_PANEL'
    );
    
    // Extract batteries
    const batteries = bomItems.filter(item => 
      item.category.toLowerCase().includes('battery') || 
      item.category === 'BATTERY'
    );
    
    // Extract inverters
    const inverters = bomItems.filter(item => 
      item.category.toLowerCase().includes('inverter') || 
      item.category === 'INVERTER'
    );

    // Calculate total solar capacity
    let totalSolarKw = 0;
    let solarPanelCount = 0;
    solarPanels.forEach(panel => {
      // Try to extract wattage from model number or name
      const wattageMatch = (panel.modelNumber + ' ' + panel.itemName).match(/(\d+)\s*w/i);
      const wattage = wattageMatch ? parseInt(wattageMatch[1]) : 400; // Default to 400W
      totalSolarKw += (panel.quantity * wattage) / 1000;
      solarPanelCount += panel.quantity;
    });

    // Calculate total battery capacity
    let totalBatteryKwh = 0;
    batteries.forEach(battery => {
      // Try to extract kWh from model number or name
      const kwhMatch = (battery.modelNumber + ' ' + battery.itemName).match(/(\d+\.?\d*)\s*kwh/i);
      const kwh = kwhMatch ? parseFloat(kwhMatch[1]) : 10; // Default to 10kWh
      totalBatteryKwh += kwh * battery.quantity;
    });

    // Calculate total inverter capacity
    let totalInverterKw = 0;
    inverters.forEach(inverter => {
      // Try to extract kW from model number or name
      const kwMatch = (inverter.modelNumber + ' ' + inverter.itemName).match(/(\d+\.?\d*)\s*kw/i);
      const kw = kwMatch ? parseFloat(kwMatch[1]) : 5; // Default to 5kW
      totalInverterKw += kw * inverter.quantity;
    });

    return {
      totalSolarKw: totalSolarKw || (project?.system?.totalSolarKw || 0),
      solarPanelCount: solarPanelCount || (project?.system?.solarPanelCount || 0),
      batteryKwh: totalBatteryKwh || (project?.system?.batteryKwh || 0),
      inverterKw: totalInverterKw || (project?.system?.inverterKw || 0),
      backupDurationHrs: project?.system?.backupDurationHrs || 24,
    };
  };

  const calculateEnergyMetrics = () => {
    // Use BOM-based calculations if available, otherwise fall back to system table
    const systemSpecs = calculateSystemFromBOM();
    if (!systemSpecs && !project?.system) return null;
    
    const specs = systemSpecs || (project?.system || null);
    if (!specs) return null;
    
    const dailySolarProduction = specs.totalSolarKw * 4; // Assume 4 peak sun hours
    const criticalLoadKw = specs.batteryKwh / Math.max(specs.backupDurationHrs, 1);
    
    return {
      dailySolarProduction,
      criticalLoadKw,
      monthlyProduction: dailySolarProduction * 30,
      annualProduction: dailySolarProduction * 365,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading project details...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Project Not Found</h2>
        <p className="text-muted-foreground mb-4">The requested project could not be found.</p>
        <Button onClick={() => router.push('/projects')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
      </div>
    );
  }

  const systemFromBOM = calculateSystemFromBOM();
  const energyMetrics = calculateEnergyMetrics();
  const totalBomCost = bomItems.reduce((sum, item) => sum + item.totalPriceUsd, 0);
  
  // Only use BOM cost - no hardcoded labor or permit fees
  const totalProjectCost = totalBomCost;
  
  // Use BOM-calculated system specs for display
  const displaySystem = systemFromBOM || project.system;

  // Prepare chart data
  const prepareMonthlyUsageData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const baseUsage = project.analysis?.monthlyUsageKwh || 1200;
    
    // Generate monthly data with seasonal variation
    return months.map((month, index) => {
      // Seasonal variation: higher in summer (Jun-Aug) and winter (Dec-Feb)
      const seasonalFactor = index >= 5 && index <= 7 ? 1.2 : // Summer
                            index === 11 || index <= 1 ? 1.15 : // Winter
                            0.9; // Spring/Fall
      
      const usage = baseUsage * seasonalFactor;
      const cost = usage * (project.analysis?.averageCostPerKwh || 0.15);
      
      return {
        month,
        usage: Math.round(usage),
        cost: Math.round(cost * 100) / 100,
        production: energyMetrics ? energyMetrics.monthlyProduction * seasonalFactor * 0.8 : 0, // Solar varies with season
      };
    });
  };

  const prepareCostSavingsData = () => {
    const years = [];
    const annualCost = project.analysis?.annualCostUsd || 2160;
    const annualProduction = energyMetrics ? energyMetrics.annualProduction : 0;
    const monthlyUsage = project.analysis?.monthlyUsageKwh || 1200;
    const annualUsage = monthlyUsage * 12;
    
    // Calculate solar coverage percentage
    const solarCoverage = annualProduction > 0 ? Math.min((annualProduction / annualUsage) * 100, 100) : 0;
    const annualSavings = (annualCost * solarCoverage) / 100;
    const systemCost = project.system?.estimatedCostUsd || 0;
    
    for (let year = 1; year <= 25; year++) {
      const cumulativeSavings = annualSavings * year;
      const netSavings = cumulativeSavings - systemCost;
      years.push({
        year: `Year ${year}`,
        savings: Math.round(cumulativeSavings),
        netSavings: Math.round(netSavings),
        cost: systemCost,
      });
    }
    
    return years;
  };

  const prepareEnergyBreakdown = () => {
    const monthlyUsage = project.analysis?.monthlyUsageKwh || 1200;
    const monthlyProduction = energyMetrics ? energyMetrics.monthlyProduction : 0;
    const gridUsage = Math.max(0, monthlyUsage - monthlyProduction);
    const solarUsage = Math.min(monthlyUsage, monthlyProduction);
    
    return [
      { name: 'Solar Production', value: Math.round(solarUsage), color: '#10b981' },
      { name: 'Grid Purchase', value: Math.round(gridUsage), color: '#ef4444' },
    ];
  };

  const monthlyData = prepareMonthlyUsageData();
  const savingsData = prepareCostSavingsData();
  const energyBreakdown = prepareEnergyBreakdown();

  const toggleCard = (cardId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const handleShare = () => {
    if (navigator.share && project) {
      navigator.share({
        title: `Energy Plan for ${project.customerName}`,
        text: `View the energy planning project for ${project.customerName}`,
        url: window.location.href,
      }).catch(() => {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
    setDropdownOpen(false);
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete the project for ${project?.customerName}?`)) {
      // Add delete logic here
      router.push('/projects');
    }
    setDropdownOpen(false);
  };

  return (
    <div className="w-screen -ml-[50vw] left-1/2 relative min-h-screen bg-gradient-to-b from-[#0A0F1C] via-[#0f1829] to-[#0A0F1C]">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f15_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f15_1px,transparent_1px)] bg-[size:14px_24px]" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/20 rounded-full blur-[100px]" />
      <div className="relative w-full p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/projects')}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">{project.customerName}</h1>
            <p className="text-gray-300">{project.customerAddress}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-white/10 text-white border-white/20">{getSystemTypeLabel()}</Badge>
          <Badge 
            variant={project.status === 'completed' ? 'default' : 'outline'}
            className={project.status === 'completed' ? 'bg-green-500 text-white' : 'bg-white/10 text-white border-white/20'}
          >
            {project.status}
          </Badge>
          {/* Dropdown Menu */}
          <div className="relative" ref={dropdownRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="text-white hover:bg-white/10"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                <div className="py-1">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      // Add edit logic
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={handleShare}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      setDropdownOpen(false);
                      alert('Link copied to clipboard!');
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Link
                  </button>
                  <div className="border-t border-gray-200 my-1"></div>
                  <button
                    onClick={handleDelete}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow bg-white/95 backdrop-blur-sm"
          onClick={() => setShowBillsModal(true)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Bills</p>
                <p className="text-xl font-semibold text-gray-900">{project.bills?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow bg-white/95 backdrop-blur-sm"
          onClick={() => setShowPanelModal(true)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Zap className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Solar</p>
                <p className="text-xl font-semibold text-gray-900">
                  {displaySystem?.totalSolarKw ? displaySystem.totalSolarKw.toFixed(2) : '0.00'}kW
                </p>
                <p className="text-xs text-gray-600">
                  {displaySystem?.solarPanelCount || 0} Panels
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/95 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Battery className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Battery</p>
                <p className="text-xl font-semibold text-gray-900">
                  {displaySystem?.batteryKwh ? displaySystem.batteryKwh.toFixed(2) : '0.00'}kWh
                </p>
                <p className="text-xs text-gray-600">
                  {displaySystem?.backupDurationHrs || 0}hr Backup
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow bg-white/95 backdrop-blur-sm"
          onClick={() => setShowBOMModal(true)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Archive className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">BOM Items</p>
                <p className="text-xl font-semibold text-gray-900">{bomItems.length}</p>
                <p className="text-xs text-gray-600">
                  {formatCurrency(bomItems.reduce((sum, item) => sum + item.totalPriceUsd, 0))} Total
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <BOMItemsModal
        open={showBOMModal}
        onOpenChange={setShowBOMModal}
        projectId={projectId}
        bomItems={bomItems}
        onItemsChange={setBomItems}
      />

      <BillsModal
        open={showBillsModal}
        onOpenChange={setShowBillsModal}
        projectId={projectId}
        bills={project?.bills || []}
      />

      <PanelManagementModal
        open={showPanelModal}
        onOpenChange={setShowPanelModal}
        projectId={projectId}
        system={project?.system}
        onSystemChange={(updatedSystem) => {
          if (project) {
            setProject({
              ...project,
              system: updatedSystem,
            });
          }
        }}
      />

      {/* Main Content */}
      <div className="space-y-6">
        <Collapsible open={expandedCards.has('cost')} onOpenChange={() => toggleCard('cost')}>
          <Card className="bg-white/95 backdrop-blur-sm">
            <CollapsibleTrigger asChild>
              <CardContent className="p-4 cursor-pointer hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <DollarSign className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Estimated Cost</p>
                      <p className="text-xl font-semibold text-gray-900">
                        {formatCurrency(totalProjectCost)}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    {expandedCards.has('cost') ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 pb-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Total Equipment Cost</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalBomCost)}</p>
                  <p className="text-xs text-gray-500 mt-1">Based on selected BOM items</p>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-green-600 rounded-xl p-1.5">
          <TabsTrigger 
            value="overview" 
            className="text-white data-[state=active]:bg-white data-[state=active]:text-green-600 hover:bg-green-700 hover:text-white transition-all duration-200 rounded-lg"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="equipment" 
            className="text-white data-[state=active]:bg-white data-[state=active]:text-green-600 hover:bg-green-700 hover:text-white transition-all duration-200 rounded-lg"
          >
            Equipment
          </TabsTrigger>
          <TabsTrigger 
            value="bills" 
            className="text-white data-[state=active]:bg-white data-[state=active]:text-green-600 hover:bg-green-700 hover:text-white transition-all duration-200 rounded-lg"
          >
            Bills
          </TabsTrigger>
          <TabsTrigger 
            value="energy" 
            className="text-white data-[state=active]:bg-white data-[state=active]:text-green-600 hover:bg-green-700 hover:text-white transition-all duration-200 rounded-lg"
          >
            Energy
          </TabsTrigger>
          <TabsTrigger 
            value="installation" 
            className="text-white data-[state=active]:bg-white data-[state=active]:text-green-600 hover:bg-green-700 hover:text-white transition-all duration-200 rounded-lg"
          >
            Installation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Energy Analysis Section with Charts */}
          <Collapsible open={expandedCards.has('energyAnalysis')} onOpenChange={() => toggleCard('energyAnalysis')}>
            <Card className="bg-white/95 backdrop-blur-sm">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                      Energy Analysis
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      {expandedCards.has('energyAnalysis') ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-6">
                  {/* Four Metric Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg border border-gray-100">
                      <div className="text-2xl font-bold text-gray-900">
                        {(project.analysis?.monthlyUsageKwh || 1200).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">kWh/month</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {((project.analysis?.monthlyUsageKwh || 1200) / 30).toFixed(0)} kWh/day
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-100">
                      <div className="text-2xl font-bold text-gray-900">
                        {project.analysis?.peakDemandKw || 8.5}
                      </div>
                      <div className="text-xs text-gray-600">Peak kW</div>
                      <div className="text-xs text-gray-500 mt-1">Max demand</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-100">
                      <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(project.analysis?.averageCostPerKwh || 0.15)}
                      </div>
                      <div className="text-xs text-gray-600">Avg $/kWh</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatCurrency((project.analysis?.annualCostUsd || 2160) / 12)}/mo
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-100">
                      <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(project.analysis?.annualCostUsd || 2160)}
                      </div>
                      <div className="text-xs text-gray-600">Annual Cost</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {((project.analysis?.monthlyUsageKwh || 1200) * 12).toLocaleString()} kWh/yr
                      </div>
                    </div>
                  </div>

                  {/* Charts Section - Dynamically loaded to avoid SSR issues */}
                  {monthlyData && monthlyData.length > 0 ? (
                    <EnergyCharts 
                      monthlyData={monthlyData}
                      savingsData={savingsData}
                      energyBreakdown={energyBreakdown}
                      hasSystem={!!project.system}
                    />
                  ) : (
                    <div className="text-center py-8 text-sm text-gray-600">
                      Preparing chart data...
                    </div>
                  )}
                  {!project.analysis && (
                    <p className="text-center text-sm text-gray-600 py-2 mt-4">
                      Using estimated data. Upload bills to see actual usage and costs.
                    </p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* System Overview - Display from BOM */}
          {displaySystem && (
            <Collapsible open={expandedCards.has('system')} onOpenChange={() => toggleCard('system')}>
              <Card className="bg-white/95 backdrop-blur-sm">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <Settings className="h-5 w-5" />
                      System Configuration {systemFromBOM && <Badge variant="outline" className="ml-2 text-xs">From BOM</Badge>}
                    </CardTitle>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        {expandedCards.has('system') ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">
                      Solar Array
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-gray-900">
                        <span>Panel Count:</span>
                        <span className="font-semibold">{displaySystem.solarPanelCount || 0}</span>
                      </div>
                      <div className="flex justify-between text-gray-900">
                        <span>Total Capacity:</span>
                        <span className="font-semibold">{displaySystem.totalSolarKw ? displaySystem.totalSolarKw.toFixed(2) : '0.00'} kW</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">
                      Battery Storage
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-gray-900">
                        <span>Capacity:</span>
                        <span className="font-semibold">{displaySystem.batteryKwh ? displaySystem.batteryKwh.toFixed(2) : '0.00'} kWh</span>
                      </div>
                      <div className="flex justify-between text-gray-900">
                        <span>Backup Duration:</span>
                        <span className="font-semibold">{displaySystem.backupDurationHrs || 24} hrs</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">
                      Inverter
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-gray-900">
                        <span>Capacity:</span>
                        <span className="font-semibold">{displaySystem.inverterKw ? displaySystem.inverterKw.toFixed(2) : '0.00'} kW</span>
                      </div>
                    </div>
                  </div>
                </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Cost Breakdown - BOM Only */}
          <Collapsible open={expandedCards.has('costBreakdown')} onOpenChange={() => toggleCard('costBreakdown')}>
            <Card className="bg-white/95 backdrop-blur-sm">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <Calculator className="h-5 w-5" />
                      Equipment Cost
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      {expandedCards.has('costBreakdown') ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-xl font-bold text-gray-900">
                  <span>Total Equipment Cost:</span>
                  <span className="text-green-600">
                    {formatCurrency(totalBomCost)}
                  </span>
                </div>
                <p className="text-sm text-gray-600">Based on selected BOM items only</p>
              </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </TabsContent>

        <TabsContent value="equipment" className="space-y-4">
          <Collapsible open={expandedCards.has('equipment')} onOpenChange={() => toggleCard('equipment')}>
            <Card className="bg-white/95 backdrop-blur-sm">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-gray-900">Bill of Materials</CardTitle>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      {expandedCards.has('equipment') ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
              {bomItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 text-gray-900">Category</th>
                        <th className="text-left py-3 text-gray-900">Item</th>
                        <th className="text-left py-3 text-gray-900">Model</th>
                        <th className="text-right py-3 text-gray-900">Qty</th>
                        <th className="text-right py-3 text-gray-900">Unit Price</th>
                        <th className="text-right py-3 text-gray-900">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bomItems.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="py-3 capitalize">
                            <Badge variant="outline">{item.category}</Badge>
                          </td>
                          <td className="py-3">
                            <div>
                              <p className="font-medium text-gray-900">{item.itemName}</p>
                              {item.manufacturer && (
                                <p className="text-sm text-gray-600">{item.manufacturer}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 font-mono text-sm text-gray-900">{item.modelNumber}</td>
                          <td className="py-3 text-right text-gray-900">{item.quantity}</td>
                          <td className="py-3 text-right text-gray-900">{formatCurrency(item.unitPriceUsd)}</td>
                          <td className="py-3 text-right font-semibold text-gray-900">
                            {formatCurrency(item.totalPriceUsd)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2">
                        <td colSpan={5} className="py-3 text-right font-semibold text-gray-900">
                          Total Equipment Cost:
                        </td>
                        <td className="py-3 text-right text-lg font-bold text-gray-900">
                          {formatCurrency(totalBomCost)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="text-center text-gray-600 py-8">
                  No equipment list generated yet.
                </p>
              )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </TabsContent>

        <TabsContent value="bills" className="space-y-4">
          {project.bills && project.bills.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Uploaded Bills & Analysis</h3>
                <Badge variant="outline" className="bg-white/10 text-white border-white/20">{project.bills.length} bill(s)</Badge>
              </div>
              <div className="space-y-4">
                {project.bills.map((bill) => (
                  <BillAnalysisCard key={bill.id} bill={bill} />
                ))}
              </div>
              
              {/* Energy Usage Summary */}
              <Collapsible open={expandedCards.has('usageSummary')} onOpenChange={() => toggleCard('usageSummary')}>
                <Card className="bg-white/95 backdrop-blur-sm">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-gray-900">
                          <TrendingUp className="h-5 w-5" />
                          Usage Analysis Summary
                        </CardTitle>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          {expandedCards.has('usageSummary') ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent>
                  {(() => {
                    const billsWithUsage = project.bills.filter(b => b.extractedData?.kwhUsed);
                    if (billsWithUsage.length === 0) {
                      return (
                        <p className="text-center text-gray-600 py-4">
                          No usage data available from uploaded bills.
                        </p>
                      );
                    }

                    const totalUsage = billsWithUsage.reduce((sum, bill) =>
                      sum + (Number(bill.extractedData?.kwhUsed) || 0), 0);
                    const avgMonthlyUsage = totalUsage / billsWithUsage.length;
                    const totalCost = billsWithUsage.reduce((sum, bill) =>
                      sum + (Number(bill.extractedData?.totalAmount) || 0), 0);
                    const avgRate = totalCost / totalUsage;

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {Math.round(avgMonthlyUsage).toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600">Avg Monthly kWh</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            ${avgRate.toFixed(3)}
                          </div>
                          <div className="text-sm text-gray-600">Avg Rate per kWh</div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {Math.round(avgMonthlyUsage * 12).toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600">Est. Annual kWh</div>
                        </div>
                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">
                            {formatCurrency(totalCost / billsWithUsage.length * 12)}
                          </div>
                          <div className="text-sm text-gray-600">Est. Annual Cost</div>
                        </div>
                      </div>
                    );
                  })()}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </>
          ) : (
            <Card className="bg-white/95 backdrop-blur-sm">
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-gray-900">No Bills Uploaded</h3>
                <p className="text-gray-600 mb-4">
                  Upload utility bills to analyze energy usage and optimize system sizing.
                </p>
                <Button onClick={() => router.push(`/wizard/${project.id}/intake`)}>
                  Upload Bills
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="energy" className="space-y-4">
          {/* All Energy Charts - Dynamically loaded to avoid SSR issues */}
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                Energy Analysis Charts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EnergyCharts 
                monthlyData={monthlyData}
                savingsData={savingsData}
                energyBreakdown={energyBreakdown}
                hasSystem={!!project.system}
              />
              {!project.analysis && (
                <p className="text-center text-sm text-gray-600 py-2 mt-4">
                  Using estimated data. Upload bills to see actual usage and costs.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Solar Production & Load Analysis */}
          <Collapsible open={expandedCards.has('energy')} onOpenChange={() => toggleCard('energy')}>
            <Card className="bg-white/95 backdrop-blur-sm">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <Settings className="h-5 w-5" />
                      System Performance Metrics
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      {expandedCards.has('energy') ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  {energyMetrics ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-lg">Solar Production</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                            <span className="text-gray-700">Daily Production:</span>
                            <span className="font-semibold text-green-700">
                              {energyMetrics.dailySolarProduction.toFixed(1)} kWh
                            </span>
                          </div>
                          <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                            <span className="text-gray-700">Monthly Production:</span>
                            <span className="font-semibold text-green-700">
                              {energyMetrics.monthlyProduction.toFixed(0)} kWh
                            </span>
                          </div>
                          <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                            <span className="text-gray-700">Annual Production:</span>
                            <span className="font-semibold text-green-700">
                              {energyMetrics.annualProduction.toFixed(0)} kWh
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-semibold text-lg">Load Analysis</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between p-3 bg-blue-50 rounded-lg">
                            <span className="text-gray-700">Critical Load:</span>
                            <span className="font-semibold text-blue-700">
                              {energyMetrics.criticalLoadKw.toFixed(1)} kW
                            </span>
                          </div>
                          <div className="flex justify-between p-3 bg-blue-50 rounded-lg">
                            <span className="text-gray-700">Backup Duration:</span>
                            <span className="font-semibold text-blue-700">
                              {project.system?.backupDurationHrs} hours
                            </span>
                          </div>
                          <div className="flex justify-between p-3 bg-blue-50 rounded-lg">
                            <span className="text-gray-700">Battery Capacity:</span>
                            <span className="font-semibold text-blue-700">
                              {project.system?.batteryKwh} kWh
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-gray-600 py-8">
                      System sizing not completed yet.
                    </p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </TabsContent>

        <TabsContent value="installation" className="space-y-4">
          <Collapsible open={expandedCards.has('installation')} onOpenChange={() => toggleCard('installation')}>
            <Card className="bg-white/95 backdrop-blur-sm">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <Clock className="h-5 w-5" />
                      Installation Plan
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      {expandedCards.has('installation') ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
              {plan ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3 text-gray-900">Project Timeline</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-gray-900">
                          <span>Duration:</span>
                          <span className="font-semibold">{plan.timeline}</span>
                        </div>
                        <div className="flex justify-between text-gray-900">
                          <span>Labor Hours:</span>
                          <span className="font-semibold">{plan.laborHoursEst} hours</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3 text-gray-900">Permits</h4>
                      <p className="text-sm text-gray-600">{plan.permitNotes}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3 text-gray-900">Installation Steps</h4>
                    <div className="space-y-2">
                      {plan.installSteps.map((step, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                            {index + 1}
                          </div>
                          <p className="text-gray-900">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {plan.warnings && plan.warnings.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3 text-orange-600">Warnings</h4>
                      <div className="space-y-2">
                        {plan.warnings.map((warning, index) => (
                          <div key={index} className="p-3 bg-orange-50 border border-orange-200 rounded">
                            <p className="text-orange-800">{JSON.stringify(warning)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-gray-600 py-8">
                  Installation plan not generated yet.
                </p>
              )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
