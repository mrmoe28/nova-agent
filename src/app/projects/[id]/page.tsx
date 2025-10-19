"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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
  Settings
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { BillAnalysisCard } from "@/components/BillAnalysisCard";

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
  const projectId = params.id as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

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

  const getSystemTypeLabel = () => {
    if (!project?.system) return "Not Configured";
    const { totalSolarKw, batteryKwh } = project.system;
    
    if (totalSolarKw > 0 && batteryKwh > 0) return "Solar + Battery";
    if (totalSolarKw > 0) return "Solar Only";
    if (batteryKwh > 0) return "Battery Only";
    return "System Pending";
  };

  const calculateEnergyMetrics = () => {
    if (!project?.system) return null;
    
    const { totalSolarKw, batteryKwh, backupDurationHrs } = project.system;
    const dailySolarProduction = totalSolarKw * 4; // Assume 4 peak sun hours
    const criticalLoadKw = batteryKwh / Math.max(backupDurationHrs, 1);
    
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

  const energyMetrics = calculateEnergyMetrics();
  const totalBomCost = bomItems.reduce((sum, item) => sum + item.totalPriceUsd, 0);

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/projects')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{project.customerName}</h1>
            <p className="text-muted-foreground">{project.customerAddress}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{getSystemTypeLabel()}</Badge>
          <Badge 
            variant={project.status === 'completed' ? 'default' : 'outline'}
          >
            {project.status}
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bills</p>
                <p className="text-xl font-semibold">{project.bills?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Zap className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Solar</p>
                <p className="text-xl font-semibold">
                  {project.system?.totalSolarKw || 0}kW
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Battery className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Battery</p>
                <p className="text-xl font-semibold">
                  {project.system?.batteryKwh || 0}kWh
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estimated Cost</p>
                <p className="text-xl font-semibold">
                  {formatCurrency(project.system?.estimatedCostUsd || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="bills">Bills</TabsTrigger>
          <TabsTrigger value="energy">Energy</TabsTrigger>
          <TabsTrigger value="installation">Installation</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* System Overview */}
          {project.system && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Solar Array
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Panel Count:</span>
                        <span className="font-semibold">{project.system.solarPanelCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Panel Wattage:</span>
                        <span className="font-semibold">{project.system.solarPanelWattage}W</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Capacity:</span>
                        <span className="font-semibold">{project.system.totalSolarKw}kW</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Battery Storage
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Capacity:</span>
                        <span className="font-semibold">{project.system.batteryKwh}kWh</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Type:</span>
                        <span className="font-semibold">{project.system.batteryType || 'Lithium'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Backup Duration:</span>
                        <span className="font-semibold">{project.system.backupDurationHrs}hrs</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Inverter
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Capacity:</span>
                        <span className="font-semibold">{project.system.inverterKw}kW</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Type:</span>
                        <span className="font-semibold">{project.system.inverterType || 'Hybrid String'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cost Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Cost Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-lg">
                  <span>Equipment Total:</span>
                  <span className="font-semibold">{formatCurrency(totalBomCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Installation Labor:</span>
                  <span className="font-semibold">
                    {formatCurrency((plan?.laborHoursEst || 0) * 150)} ({plan?.laborHoursEst || 0}hrs)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Permits & Fees:</span>
                  <span className="font-semibold">{formatCurrency(2500)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-xl font-bold">
                  <span>Total Project Cost:</span>
                  <span className="text-green-600">
                    {formatCurrency(project.system?.estimatedCostUsd || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bill of Materials</CardTitle>
            </CardHeader>
            <CardContent>
              {bomItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3">Category</th>
                        <th className="text-left py-3">Item</th>
                        <th className="text-left py-3">Model</th>
                        <th className="text-right py-3">Qty</th>
                        <th className="text-right py-3">Unit Price</th>
                        <th className="text-right py-3">Total</th>
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
                              <p className="font-medium">{item.itemName}</p>
                              {item.manufacturer && (
                                <p className="text-sm text-muted-foreground">{item.manufacturer}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 font-mono text-sm">{item.modelNumber}</td>
                          <td className="py-3 text-right">{item.quantity}</td>
                          <td className="py-3 text-right">{formatCurrency(item.unitPriceUsd)}</td>
                          <td className="py-3 text-right font-semibold">
                            {formatCurrency(item.totalPriceUsd)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2">
                        <td colSpan={5} className="py-3 text-right font-semibold">
                          Total Equipment Cost:
                        </td>
                        <td className="py-3 text-right text-lg font-bold">
                          {formatCurrency(totalBomCost)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No equipment list generated yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bills" className="space-y-4">
          {project.bills && project.bills.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Uploaded Bills & Analysis</h3>
                <Badge variant="outline">{project.bills.length} bill(s)</Badge>
              </div>
              <div className="space-y-4">
                {project.bills.map((bill) => (
                  <BillAnalysisCard key={bill.id} bill={bill} />
                ))}
              </div>
              
              {/* Energy Usage Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Usage Analysis Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const billsWithUsage = project.bills.filter(b => b.extractedData?.kwhUsed);
                    if (billsWithUsage.length === 0) {
                      return (
                        <p className="text-center text-muted-foreground py-4">
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
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Bills Uploaded</h3>
                <p className="text-muted-foreground mb-4">
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Energy Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {energyMetrics ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Solar Production</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Daily Production:</span>
                        <span className="font-semibold">
                          {energyMetrics.dailySolarProduction.toFixed(1)} kWh
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Monthly Production:</span>
                        <span className="font-semibold">
                          {energyMetrics.monthlyProduction.toFixed(0)} kWh
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Annual Production:</span>
                        <span className="font-semibold">
                          {energyMetrics.annualProduction.toFixed(0)} kWh
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold">Load Analysis</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Critical Load:</span>
                        <span className="font-semibold">
                          {energyMetrics.criticalLoadKw.toFixed(1)} kW
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Backup Duration:</span>
                        <span className="font-semibold">
                          {project.system?.backupDurationHrs} hours
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Battery Capacity:</span>
                        <span className="font-semibold">
                          {project.system?.batteryKwh} kWh
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  System sizing not completed yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="installation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Installation Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              {plan ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">Project Timeline</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Duration:</span>
                          <span className="font-semibold">{plan.timeline}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Labor Hours:</span>
                          <span className="font-semibold">{plan.laborHoursEst} hours</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Permits</h4>
                      <p className="text-sm text-muted-foreground">{plan.permitNotes}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Installation Steps</h4>
                    <div className="space-y-2">
                      {plan.installSteps.map((step, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                            {index + 1}
                          </div>
                          <p>{step}</p>
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
                <p className="text-center text-muted-foreground py-8">
                  Installation plan not generated yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
