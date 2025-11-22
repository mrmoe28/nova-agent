"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  MotionDiv,
  MotionCard,
  MotionStagger,
  fadeInUp,
  smoothTransition,
} from "@/components/motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Plus,
  Loader2,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  Zap,
  Trash2,
  Grid3X3,
  Table,
  LayoutGrid,
  Building2,
  Calendar,
  DollarSign,
  Eye,
  Target,
  Battery,
  Sun,
  Archive,
  Download,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";
import { BillsModal } from "@/components/BillsModal";

interface Bill {
  id: string;
  fileName: string;
  fileType: string;
  ocrText?: string | null;
  extractedData?: Record<string, unknown> | null;
  uploadedAt: string;
}

interface Analysis {
  id: string;
  monthlyUsageKwh: number;
  peakDemandKw: number;
  averageCostPerKwh: number;
  annualCostUsd: number;
}

interface System {
  id: string;
  solarPanelCount: number;
  solarPanelWattage: number;
  totalSolarKw: number;
  batteryKwh: number;
  batteryType: string;
  inverterKw: number;
  inverterType: string;
  backupDurationHrs: number;
  estimatedCostUsd: number;
  criticalLoadKw: number;
  distributorId?: string;
}

interface BOMItem {
  id: string;
  category: string;
  itemName: string;
  manufacturer?: string;
  modelNumber?: string;
  quantity: number;
  unitPriceUsd: number;
  totalPriceUsd: number;
}

interface Plan {
  id: string;
  installationTimeMonths: number;
  yearlyProductionKwh: number;
  yearlySavingsUsd: number;
  roiYears: number;
}

interface Project {
  id: string;
  clientName: string;
  address?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  bills?: Bill[];
  analysis?: Analysis;
  system?: System;
  bomItems?: BOMItem[];
  plan?: Plan;
  _count: {
    bills: number;
    bomItems: number;
  };
}

interface Distributor {
  id: string;
  name: string;
  equipment?: { id: string; category: string; name: string; unitPrice: number }[];
}

type ViewMode = "cards" | "grid" | "table";

export default function ProjectsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [selectedDistributor, setSelectedDistributor] = useState<string>("default");
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [deletingProject, setDeletingProject] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [recalculatingCosts, setRecalculatingCosts] = useState<Set<string>>(new Set());
  const [showBillsModal, setShowBillsModal] = useState(false);
  const [selectedProjectForBills, setSelectedProjectForBills] = useState<Project | null>(null);

  const handleViewBills = (project: Project) => {
    setSelectedProjectForBills(project);
    setShowBillsModal(true);
  };

  const getNextStep = (status: string) => {
    const steps: Record<string, { label: string; icon: any; href: string; className: string }> = {
      intake: { label: "Upload Bills", icon: FileText, href: "intake", className: "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700" },
      analysis: { label: "Configure System", icon: Zap, href: "sizing", className: "bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700" },
      sizing: { label: "Review BOM", icon: Archive, href: "bom", className: "bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700" },
      bom: { label: "Review & Generate PDF", icon: Download, href: "review", className: "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700" },
      review: { label: "Download Report", icon: Download, href: "review", className: "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700" },
      complete: { label: "View Project", icon: Eye, href: "review", className: "bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800" },
    };
    return steps[status] || steps.intake;
  };

  const toggleProjectExpanded = (projectId: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      intake: { 
        variant: "secondary" as const, 
        label: "Intake", 
        color: "bg-violet-100 dark:bg-violet-950/30 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-800",
        icon: FileText
      },
      analysis: { 
        variant: "outline" as const, 
        label: "Analysis", 
        color: "bg-purple-100 dark:bg-purple-950/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800",
        icon: Target
      },
      sizing: { 
        variant: "outline" as const, 
        label: "Sizing", 
        color: "bg-fuchsia-100 dark:bg-fuchsia-950/30 text-fuchsia-800 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800",
        icon: Zap
      },
      bom: { 
        variant: "outline" as const, 
        label: "BOM", 
        color: "bg-pink-100 dark:bg-pink-950/30 text-pink-800 dark:text-pink-300 border-pink-200 dark:border-pink-800",
        icon: Archive
      },
      review: { 
        variant: "outline" as const, 
        label: "Review", 
        color: "bg-indigo-100 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
        icon: Eye
      },
      complete: { 
        variant: "default" as const, 
        label: "Complete", 
        color: "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        icon: Target
      },
    };
    
    return configs[status as keyof typeof configs] || configs.intake;
  };

  const getStatusBadge = (status: string) => {
    const config = getStatusConfig(status);
    const IconComponent = config.icon;
    
    return (
      <Badge className={`${config.color} font-medium px-3 py-1 flex items-center gap-1.5`}>
        <IconComponent className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const handleDeleteClick = (project: Project) => {
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;
    setDeletingProject(projectToDelete.id);
    try {
      const response = await fetch(`/api/projects/${projectToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setProjects(prevProjects => prevProjects.filter(p => p.id !== projectToDelete.id));
        setExpandedProjects(prev => {
          const newSet = new Set(prev);
          newSet.delete(projectToDelete.id);
          return newSet;
        });
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Failed to delete project");
    } finally {
      setDeletingProject(null);
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setProjectToDelete(null);
  };

  const recalculateProjectCost = useCallback(async (projectId: string) => {
    if (!selectedDistributor || selectedDistributor === "default") return;
    
    setRecalculatingCosts(prev => new Set(prev).add(projectId));
    
    try {
      // Get current project data from state at the time of execution
      setProjects(currentProjects => {
        const project = currentProjects.find(p => p.id === projectId);
        if (!project?.system) {
          setRecalculatingCosts(prev => {
            const newSet = new Set(prev);
            newSet.delete(projectId);
            return newSet;
          });
          return currentProjects;
        }

        // Perform the API call
        fetch("/api/size/recalculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            backupDurationHrs: project.system.backupDurationHrs,
            criticalLoadKw:
              project.system.criticalLoadKw || project.system.totalSolarKw,
            distributorId: selectedDistributor,
          }),
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.success) {
              setProjects((prev) =>
                prev.map((p) =>
                  p.id === projectId
                    ? {
                        ...p,
                        system: {
                          ...p.system!,
                          ...data.system,
                          distributorId: selectedDistributor,
                        },
                      }
                    : p,
                ),
              );
            }
          })
          .catch((error) => {
            console.error("Error recalculating cost:", error);
          })
          .finally(() => {
            setRecalculatingCosts((prev) => {
              const newSet = new Set(prev);
              newSet.delete(projectId);
              return newSet;
            });
          });

        return currentProjects; // Return unchanged for this immediate call
      });
    } catch (error) {
      console.error("Error recalculating cost:", error);
      setRecalculatingCosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(projectId);
        return newSet;
      });
    }
  }, [selectedDistributor]); // Remove projects from dependencies

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      const data = await response.json();
      if (data.success) {
        setProjects(data.projects);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDistributors = async () => {
    try {
      const response = await fetch("/api/distributors");
      const data = await response.json();
      if (data.success) {
        setDistributors(data.distributors);
      }
    } catch (error) {
      console.error("Error fetching distributors:", error);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchDistributors();
  }, []);

  useEffect(() => {
    if (selectedDistributor && selectedDistributor !== "default" && projects.length > 0) {
      projects.forEach(project => {
        if (project.system && project.system.distributorId !== selectedDistributor) {
          recalculateProjectCost(project.id);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDistributor]); // Intentionally omitting projects and recalculateProjectCost to prevent infinite loops

  const renderModernCard = (project: Project) => {
    const isExpanded = expandedProjects.has(project.id);
    const isRecalculating = recalculatingCosts.has(project.id);
    
    return (
      <Card className="group relative overflow-hidden border-0 bg-white dark:bg-gray-900 shadow-sm ring-1 ring-violet-500/10 transition-all duration-300 hover:shadow-lg hover:ring-violet-500/20">
        <Collapsible open={isExpanded} onOpenChange={() => toggleProjectExpanded(project.id)}>
          <CollapsibleTrigger asChild>
            <div className="cursor-pointer">
              <CardHeader className="pb-4">
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/projects/${project.id}`);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-violet-100 dark:hover:bg-violet-900/30"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(project);
                    }}
                    disabled={deletingProject === project.id}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-100 text-red-600"
                  >
                    {deletingProject === project.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="h-12 w-12 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600">
                      <AvatarFallback className="text-white font-semibold">
                        {project.clientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle 
                          className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate hover:text-violet-600 dark:hover:text-violet-400 transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/projects/${project.id}`);
                          }}
                        >
                          {project.clientName}
                        </CardTitle>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-600 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-600 flex-shrink-0" />
                        )}
                      </div>
                      {project.address && (
                        <CardDescription className="text-sm text-gray-600 truncate">
                          {project.address}
                        </CardDescription>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {getStatusBadge(project.status)}
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Calendar className="h-3 w-3 text-gray-600" />
                          {formatDate(project.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div 
                    className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors group/bill"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewBills(project);
                    }}
                  >
                    <FileText className="h-4 w-4 text-blue-600" />
                    <div className="flex-1">
                      <div className="text-lg font-semibold text-gray-900">{project._count.bills}</div>
                      <div className="text-xs text-gray-600">Bills</div>
                    </div>
                    <Eye className="h-3.5 w-3.5 text-blue-600 opacity-0 group-hover/bill:opacity-100 transition-opacity" />
                  </div>
                  <div 
                    className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/projects/${project.id}?tab=bom`);
                    }}
                  >
                    <Archive className="h-4 w-4 text-orange-600" />
                    <div>
                      <div className="text-lg font-semibold text-gray-900">{project._count.bomItems}</div>
                      <div className="text-xs text-gray-600">BOM Items</div>
                    </div>
                  </div>
                  {project.system && (
                    <>
                      <div 
                        className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/projects/${project.id}?tab=panels`);
                        }}
                      >
                        <Sun className="h-4 w-4 text-yellow-600" />
                        <div>
                          <div className="text-lg font-semibold text-gray-900">{project.system.totalSolarKw.toFixed(1)}kW</div>
                          <div className="text-xs text-gray-600">{project.system.solarPanelCount} Panels</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                        <Battery className="h-4 w-4 text-green-600" />
                        <div>
                          <div className="text-lg font-semibold text-gray-900">{project.system.batteryKwh.toFixed(1)}kWh</div>
                          <div className="text-xs text-gray-600">{project.system.backupDurationHrs}hr Backup</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {project.system && (
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">Estimated Cost</span>
                      {isRecalculating && (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      )}
                    </div>
                    <div className="text-2xl font-bold text-green-700">
                      {formatCurrency(project.system.estimatedCostUsd)}
                    </div>
                  </div>
                )}
              </CardContent>
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="border-t bg-gray-50/50">
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {/* Analysis Data */}
                  {project.analysis && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Target className="h-4 w-4 text-purple-600" />
                        Energy Analysis
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-lg border border-gray-100">
                          <div className="text-2xl font-bold text-gray-900">{project.analysis.monthlyUsageKwh.toLocaleString()}</div>
                          <div className="text-xs text-gray-600">kWh/month</div>
                          <div className="text-xs text-gray-500 mt-1">{(project.analysis.monthlyUsageKwh / 30).toFixed(0)} kWh/day</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-gray-100">
                          <div className="text-2xl font-bold text-gray-900">{project.analysis.peakDemandKw}</div>
                          <div className="text-xs text-gray-600">Peak kW</div>
                          <div className="text-xs text-gray-500 mt-1">Max demand</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-gray-100">
                          <div className="text-2xl font-bold text-gray-900">{formatCurrency(project.analysis.averageCostPerKwh)}</div>
                          <div className="text-xs text-gray-600">Avg $/kWh</div>
                          <div className="text-xs text-gray-500 mt-1">{formatCurrency(project.analysis.annualCostUsd / 12)}/mo</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-gray-100">
                          <div className="text-2xl font-bold text-gray-900">{formatCurrency(project.analysis.annualCostUsd)}</div>
                          <div className="text-xs text-gray-600">Annual Cost</div>
                          <div className="text-xs text-gray-500 mt-1">{(project.analysis.monthlyUsageKwh * 12).toLocaleString()} kWh/yr</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Quick Actions */}
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                      <Zap className="h-4 w-4 text-blue-600" />
                      Quick Actions
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewBills(project);
                        }}
                        className="justify-start"
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        View Bills ({project._count.bills})
                      </Button>
                      {project.status === "complete" && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="justify-start"
                        >
                          <Link href={`/wizard/${project.id}/review`}>
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>

                  <Separator className="my-4" />

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3">
                    {(() => {
                      const nextStep = getNextStep(project.status);
                      const StepIcon = nextStep.icon;
                      return (
                        <Button 
                          asChild 
                          className={`${nextStep.className} text-white`}
                        >
                          <Link href={`/wizard/${project.id}/${nextStep.href}`}>
                            <StepIcon className="mr-2 h-4 w-4" />
                            {nextStep.label}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      );
                    })()}
                    <Button 
                      variant="outline" 
                      onClick={() => handleDeleteClick(project)}
                      disabled={deletingProject === project.id}
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                    >
                      {deletingProject === project.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  const renderGridView = (project: Project) => {
    return (
      <Card 
        key={project.id} 
        className="group relative overflow-hidden border-0 bg-white shadow-sm ring-1 ring-gray-950/5 transition-all duration-300 hover:shadow-lg hover:ring-gray-950/10 cursor-pointer"
        onClick={() => router.push(`/projects/${project.id}`)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0">
                <AvatarFallback className="text-white font-semibold text-sm">
                  {project.clientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base font-semibold text-gray-900 truncate">
                  {project.clientName}
                </CardTitle>
                {project.address && (
                  <CardDescription className="text-xs text-gray-600 truncate mt-0.5">
                    {project.address}
                  </CardDescription>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  {getStatusBadge(project.status)}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
              <FileText className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900">{project._count.bills}</div>
                <div className="text-xs text-gray-600">Bills</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg">
              <Archive className="h-3.5 w-3.5 text-orange-600 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900">{project._count.bomItems}</div>
                <div className="text-xs text-gray-600">BOM</div>
              </div>
            </div>
          </div>
          {project.system && (
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
              <span className="text-xs font-medium text-gray-700">Est. Cost</span>
              <div className="text-lg font-bold text-green-700">
                {formatCurrency(project.system.estimatedCostUsd)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderTableView = (project: Project) => {
    return (
      <div
        key={project.id}
        className="group grid grid-cols-12 gap-4 items-center p-4 bg-white border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={() => router.push(`/projects/${project.id}`)}
      >
        <div className="col-span-3 flex items-center gap-3 min-w-0">
          <Avatar className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0">
            <AvatarFallback className="text-white font-semibold text-sm">
              {project.clientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-gray-900 truncate">{project.clientName}</div>
            {project.address && (
              <div className="text-xs text-gray-600 truncate">{project.address}</div>
            )}
          </div>
        </div>
        <div className="col-span-2">
          {getStatusBadge(project.status)}
        </div>
        <div className="col-span-2 text-sm text-gray-700">
          <div className="flex items-center gap-1">
            <FileText className="h-3.5 w-3.5 text-gray-500" />
            {project._count.bills} bills
          </div>
        </div>
        <div className="col-span-2 text-sm text-gray-700">
          <div className="flex items-center gap-1">
            <Archive className="h-3.5 w-3.5 text-gray-500" />
            {project._count.bomItems} items
          </div>
        </div>
        <div className="col-span-2 text-sm font-semibold text-gray-900">
          {project.system ? formatCurrency(project.system.estimatedCostUsd) : "—"}
        </div>
        <div className="col-span-1 flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/projects/${project.id}`);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClick(project);
            }}
            disabled={deletingProject === project.id}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700"
          >
            {deletingProject === project.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
            <div className="absolute inset-0 w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full animate-pulse opacity-50 mx-auto"></div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Projects</h3>
          <p className="text-gray-600">Please wait while we fetch your data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-background">
      <div className="w-full max-w-7xl mx-auto px-6 py-8">
        {/* Modern Header */}
        <MotionDiv variants={fadeInUp} transition={smoothTransition} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
                Projects
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                Manage your energy planning projects with intelligent insights
              </p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm ring-1 ring-violet-500/10">
            <div className="flex items-center gap-4">
              {/* Distributor Selection */}
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-gray-600" />
                <Select value={selectedDistributor} onValueChange={setSelectedDistributor}>
                  <SelectTrigger className="w-64 bg-white border-gray-300 text-gray-900">
                    <SelectValue placeholder="Select distributor for pricing" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default Pricing</SelectItem>
                    {distributors.map((distributor) => (
                      <SelectItem key={distributor.id} value={distributor.id}>
                        {distributor.name}
                        {distributor.equipment && distributor.equipment.length > 0 && (
                          <span className="text-muted-foreground ml-2">
                            ({distributor.equipment.length} products)
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* View Toggle */}
              <div className="flex items-center bg-gray-200 dark:bg-gray-800 rounded-lg p-1 gap-1">
                <Button
                  size="sm"
                  onClick={() => setViewMode("cards")}
                  className={`h-8 px-3 border-0 transition-all ${
                    viewMode === "cards" 
                      ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-sm" 
                      : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-sm"
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={`h-8 px-3 border-0 transition-all ${
                    viewMode === "grid" 
                      ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-sm" 
                      : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-sm"
                  }`}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className={`h-8 px-3 border-0 transition-all ${
                    viewMode === "table" 
                      ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-sm" 
                      : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-sm"
                  }`}
                >
                  <Table className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button asChild className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 text-white shadow-lg shadow-violet-500/30 border-0">
              <Link href="/wizard/new">
                <Plus className="mr-2 h-4 w-4 text-white" />
                New Project
              </Link>
            </Button>
          </div>
        </MotionDiv>

        {/* Projects Content */}
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
              <FolderOpen className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No projects yet</h3>
            <p className="text-gray-600 mb-8 max-w-md">
              Get started by creating your first energy planning project and unlock intelligent insights for your clients
            </p>
            <Button asChild className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 text-white shadow-lg shadow-violet-500/30">
              <Link href="/wizard/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Project
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Workflow Guide Banner */}
            <MotionDiv variants={fadeInUp} transition={{...smoothTransition, delay: 0.1}}>
              <div className="mb-6 bg-gradient-to-r from-violet-50 via-purple-50 to-fuchsia-50 dark:from-violet-950/20 dark:via-purple-950/20 dark:to-fuchsia-950/20 border border-violet-200 dark:border-violet-800 rounded-xl p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 rounded-lg flex items-center justify-center">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Project Workflow</h3>
                  <p className="text-sm text-gray-700 mb-4">
                    Follow these steps to complete your energy planning projects. Click on any project card to view details or continue where you left off.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-950/30 flex items-center justify-center">
                        <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">1</span>
                      </div>
                      <span className="text-gray-700 dark:text-gray-300">Upload Bills</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950/30 flex items-center justify-center">
                        <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">2</span>
                      </div>
                      <span className="text-gray-700 dark:text-gray-300">Configure System</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-6 h-6 rounded-full bg-fuchsia-100 dark:bg-fuchsia-950/30 flex items-center justify-center">
                        <span className="text-xs font-semibold text-fuchsia-600 dark:text-fuchsia-400">3</span>
                      </div>
                      <span className="text-gray-700 dark:text-gray-300">Review BOM</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950/30 flex items-center justify-center">
                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">4</span>
                      </div>
                      <span className="text-gray-700 dark:text-gray-300">Generate PDF</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-gray-700 dark:text-gray-300">Complete</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </MotionDiv>

            {/* Projects Content - Conditional Rendering Based on View Mode */}
            {viewMode === "table" ? (
              <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 items-center p-4 bg-gray-50 border-b border-gray-200 font-semibold text-sm text-gray-700">
                  <div className="col-span-3">Project</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Bills</div>
                  <div className="col-span-2">BOM Items</div>
                  <div className="col-span-2">Est. Cost</div>
                  <div className="col-span-1"></div>
                </div>
                {/* Table Rows */}
                <div>
                  {projects.map((project) => renderTableView(project))}
                </div>
              </div>
            ) : viewMode === "grid" ? (
              <MotionStagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <MotionCard key={project.id} delay={0}>
                    {renderGridView(project)}
                  </MotionCard>
                ))}
              </MotionStagger>
            ) : (
              <MotionStagger className="space-y-4">
                {projects.map((project) => (
                  <MotionCard key={project.id} delay={0}>
                    {renderModernCard(project)}
                  </MotionCard>
                ))}
              </MotionStagger>
            )}
          </>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Delete Project</DialogTitle>
              <DialogDescription className="text-gray-600">
                Are you sure you want to delete the project for <span className="font-semibold">{projectToDelete?.clientName}</span>?
                This action cannot be undone and will permanently remove all project data, bills,
                analysis, BOM items, and related information.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={handleDeleteCancel}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deletingProject !== null}
                className="bg-red-600 hover:bg-red-700"
              >
                {deletingProject ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Project
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bills Modal */}
        {selectedProjectForBills && (
          <BillsModal
            open={showBillsModal}
            onOpenChange={setShowBillsModal}
            projectId={selectedProjectForBills.id}
            bills={selectedProjectForBills.bills || []}
          />
        )}
      </div>
    </div>
  );
}
