"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Loader2, FolderOpen, ChevronDown, ChevronRight, FileText, Zap, ClipboardList, Calculator, Trash2, Grid3X3, Table, LayoutGrid, Building2 } from "lucide-react";

interface Bill {
  id: string;
  fileName: string;
  fileType: string;
  ocrText?: string;
  extractedData?: any;
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
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [selectedDistributor, setSelectedDistributor] = useState<string>("");
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [deletingProject, setDeletingProject] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [recalculatingCosts, setRecalculatingCosts] = useState<Set<string>>(new Set());

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

  const parseExtractedData = (extractedData: any) => {
    if (!extractedData) return null;
    try {
      return typeof extractedData === 'string' ? JSON.parse(extractedData) : extractedData;
    } catch {
      return null;
    }
  };

  const getBOMTotal = (bomItems?: BOMItem[]) => {
    if (!bomItems) return 0;
    return bomItems.reduce((sum, item) => sum + item.totalPriceUsd, 0);
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      intake: { variant: "secondary" as const, label: "Intake" },
      analysis: { variant: "outline" as const, label: "Analysis" },
      sizing: { variant: "outline" as const, label: "Sizing" },
      bom: { variant: "outline" as const, label: "BOM" },
      review: { variant: "outline" as const, label: "Review" },
      complete: { variant: "default" as const, label: "Complete" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.intake;
    return <Badge variant={config.variant}>{config.label}</Badge>;
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

  const recalculateProjectCost = async (projectId: string) => {
    if (!selectedDistributor) return;
    
    setRecalculatingCosts(prev => new Set(prev).add(projectId));
    
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project?.system) return;

      // Call the sizing API with distributor to recalculate
      const response = await fetch('/api/size', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId,
          backupDurationHrs: project.system.backupDurationHrs,
          criticalLoadKw: project.system.totalSolarKw, // Using total solar as proxy
          distributorId: selectedDistributor
        })
      });

      const data = await response.json();
      if (data.success) {
        // Update the project in state
        setProjects(prev => prev.map(p => 
          p.id === projectId 
            ? { ...p, system: { ...p.system!, ...data.system } }
            : p
        ));
      }
    } catch (error) {
      console.error("Error recalculating cost:", error);
    } finally {
      setRecalculatingCosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(projectId);
        return newSet;
      });
    }
  };

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
    // Auto-recalculate costs when distributor changes
    if (selectedDistributor && projects.length > 0) {
      projects.forEach(project => {
        if (project.system && project.system.distributorId !== selectedDistributor) {
          recalculateProjectCost(project.id);
        }
      });
    }
  }, [selectedDistributor]);

  // Render functions for different views
  const renderProjectCard = (project: Project, isCompact: boolean = false) => {
    const isExpanded = expandedProjects.has(project.id);
    const bomTotal = getBOMTotal(project.bomItems);
    const isRecalculating = recalculatingCosts.has(project.id);
    
    return (
      <Card key={project.id} className={`overflow-hidden shadow-md hover:shadow-lg transition-shadow ${isCompact ? 'h-80' : ''}`}>
        <Collapsible open={isExpanded && !isCompact} onOpenChange={() => !isCompact && toggleProjectExpanded(project.id)}>
          <CollapsibleTrigger asChild disabled={isCompact}>
            <div className="p-4 hover:bg-gray-50 cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {!isCompact && (isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ))}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm truncate">
                        {project.clientName}
                      </h3>
                      {project.address && (
                        <p className="text-xs text-muted-foreground truncate">
                          {project.address}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {getStatusBadge(project.status)}
                  <div className="text-xs text-muted-foreground text-right">
                    <div>{project._count.bills} bills</div>
                    <div>{project._count.bomItems} items</div>
                  </div>
                </div>
              </div>
              
              {project.system && (
                <div className="mt-3 pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-muted-foreground">
                      {project.system.totalSolarKw}kW Solar • {project.system.batteryKwh}kWh Battery
                    </div>
                    <div className="flex items-center gap-2">
                      {isRecalculating && (
                        <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                      )}
                      <div className="text-sm font-semibold text-green-600">
                        {formatCurrency(project.system.estimatedCostUsd)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-2 flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {formatDate(project.createdAt)}
                </span>
                <div className="flex gap-1">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-6 px-2 text-xs"
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link href={`/wizard/${project.id}/intake`}>View</Link>
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    className="h-6 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(project);
                    }}
                    disabled={deletingProject === project.id}
                  >
                    {deletingProject === project.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CollapsibleTrigger>
          
          {!isCompact && (
            <CollapsibleContent>
              <div className="border-t bg-gray-50/50 p-4 space-y-4">
                {/* Bills and OCR Data */}
                {project.bills && project.bills.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <h4 className="font-semibold text-sm">Uploaded Bills</h4>
                    </div>
                    <div className="grid gap-2">
                      {project.bills.slice(0, 2).map((bill) => {
                        const extractedData = parseExtractedData(bill.extractedData);
                        return (
                          <div key={bill.id} className="bg-white p-2 rounded border text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-900">{bill.fileName}</span>
                              <Badge variant="outline" className="text-xs">{bill.fileType.toUpperCase()}</Badge>
                            </div>
                            {extractedData && (
                              <div className="mt-1 text-gray-600 grid grid-cols-2 gap-1">
                                {extractedData.monthlyUsageKwh && (
                                  <div>Usage: {extractedData.monthlyUsageKwh} kWh</div>
                                )}
                                {extractedData.totalCost && (
                                  <div>Cost: {formatCurrency(extractedData.totalCost)}</div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {project.bills.length > 2 && (
                        <div className="text-xs text-gray-500">+{project.bills.length - 2} more bills</div>
                      )}
                    </div>
                  </div>
                )}

                {/* System Design Summary */}
                {project.system && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4 text-yellow-600" />
                      <h4 className="font-semibold text-sm">System Design</h4>
                    </div>
                    <div className="bg-white p-2 rounded border text-xs">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="font-semibold text-gray-900">{project.system.solarPanelCount}</div>
                          <div className="text-gray-600">Panels</div>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{project.system.batteryKwh} kWh</div>
                          <div className="text-gray-600">Battery</div>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{project.system.backupDurationHrs}h</div>
                          <div className="text-gray-600">Backup</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button asChild size="sm" className="flex-1">
                    <Link href={`/wizard/${project.id}/intake`}>
                      {project.status === "complete" ? "View Project" : "Continue"}
                    </Link>
                  </Button>
                  {project.status === "complete" && (
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link href={`/wizard/${project.id}/review`}>Report</Link>
                    </Button>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          )}
        </Collapsible>
      </Card>
    );
  };

  const renderCardsView = () => (
    <div className="space-y-4">
      {projects.map((project) => renderProjectCard(project, false))}
    </div>
  );

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {projects.map((project) => renderProjectCard(project, true))}
    </div>
  );

  const renderTableView = () => (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Client</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">System</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-900">Estimated Cost</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Created</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {projects.map((project) => {
              const isRecalculating = recalculatingCosts.has(project.id);
              return (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-sm text-gray-900">{project.clientName}</div>
                      {project.address && (
                        <div className="text-xs text-gray-600 truncate max-w-xs">{project.address}</div>
                      )}
                      <div className="text-xs text-gray-500">
                        {project._count.bills} bills • {project._count.bomItems} BOM items
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(project.status)}
                  </td>
                  <td className="px-4 py-3">
                    {project.system ? (
                      <div className="text-sm">
                        <div className="text-gray-900">{project.system.totalSolarKw}kW Solar</div>
                        <div className="text-xs text-gray-600">
                          {project.system.batteryKwh}kWh • {project.system.backupDurationHrs}h backup
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">No system designed</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {project.system ? (
                      <div className="flex items-center justify-end gap-2">
                        {isRecalculating && (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        )}
                        <span className="font-semibold text-green-600">
                          {formatCurrency(project.system.estimatedCostUsd)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {formatDate(project.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/wizard/${project.id}/intake`}>View</Link>
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleDeleteClick(project)}
                        disabled={deletingProject === project.id}
                      >
                        {deletingProject === project.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your NovaAgent energy planning projects
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Distributor Selection */}
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedDistributor} onValueChange={setSelectedDistributor}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select distributor for pricing" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Default Pricing</SelectItem>
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
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            <Button
              variant={viewMode === "cards" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("cards")}
              className="h-8 px-3"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="h-8 px-3"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="h-8 px-3"
            >
              <Table className="h-4 w-4" />
            </Button>
          </div>

          <Button asChild>
            <Link href="/wizard/new">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Link>
          </Button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Get started by creating your first energy planning project
          </p>
          <Button asChild>
            <Link href="/wizard/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Project
            </Link>
          </Button>
        </div>
      ) : (
        <>
          {viewMode === "cards" && renderCardsView()}
          {viewMode === "grid" && renderGridView()}
          {viewMode === "table" && renderTableView()}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the project for {projectToDelete?.clientName}?
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
    </div>
  );
}