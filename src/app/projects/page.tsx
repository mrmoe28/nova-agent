"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Loader2, FolderOpen, ChevronDown, ChevronRight, FileText, Zap, ClipboardList, Calculator, Trash2 } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

interface Bill {
  id: string;
  fileName: string;
  fileType: string;
  ocrText: string | null;
  extractedData: string | null;
  uploadedAt: string;
}

interface Analysis {
  id: string;
  monthlyUsageKwh: number;
  peakDemandKw: number;
  averageCostPerKwh: number;
  annualCostUsd: number;
  recommendations: string;
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
  criticalLoadKw: number;
  estimatedCostUsd: number;
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
  necChecks: string;
  warnings: string | null;
  installSteps: string;
  timeline: string | null;
  laborHoursEst: number | null;
  permitNotes: string | null;
}

interface Project {
  id: string;
  clientName: string;
  address: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  bills: Bill[];
  analysis: Analysis | null;
  system: System | null;
  bomItems: BOMItem[];
  plan: Plan | null;
  _count: {
    bills: number;
    bomItems: number;
  };
}

export default function ProjectsPage() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [deletingProject, setDeletingProject] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const toggleProjectExpanded = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const parseExtractedData = (extractedData: string | null) => {
    if (!extractedData) return null;
    try {
      return JSON.parse(extractedData);
    } catch {
      return null;
    }
  };

  const getBOMTotal = (bomItems: BOMItem[]) => {
    if (!bomItems || bomItems.length === 0) return 0;
    return bomItems.reduce((total, item) => total + item.totalPriceUsd, 0);
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
        // Remove the deleted project from the list
        setProjects(prevProjects => 
          prevProjects.filter(p => p.id !== projectToDelete.id)
        );
        // Remove from expanded projects if expanded
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

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      const data = await response.json();

      if (data.success) {
        setProjects(data.projects);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      alert("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      intake: "bg-blue-100 text-blue-800",
      analysis: "bg-purple-100 text-purple-800",
      sizing: "bg-yellow-100 text-yellow-800",
      bom: "bg-orange-100 text-orange-800",
      plan: "bg-cyan-100 text-cyan-800",
      review: "bg-indigo-100 text-indigo-800",
      complete: "bg-green-100 text-green-800",
    };

    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          statusColors[status] || "bg-gray-100 text-gray-800"
        }`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

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
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your NovaAgent energy planning projects
          </p>
        </div>
        <Button asChild>
          <Link href="/wizard/new">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card className="p-12 text-center">
          <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No projects yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first NovaAgent project to get started
          </p>
          <Button asChild className="mt-6">
            <Link href="/wizard/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Project
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => {
            const isExpanded = expandedProjects.has(project.id);
            const bomTotal = getBOMTotal(project.bomItems);
            
            return (
              <Card key={project.id} className="overflow-hidden">
                <Collapsible open={isExpanded} onOpenChange={() => toggleProjectExpanded(project.id)}>
                  <CollapsibleTrigger asChild>
                    <div className="p-5 hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-center justify-between">
                <div className="flex-1">
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div>
                              <h3 className="font-semibold text-lg">
                    {project.clientName}
                  </h3>
                  {project.address && (
                                <p className="text-sm text-muted-foreground">
                      {project.address}
                    </p>
                  )}
                </div>
              </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(project.status)}
                          <div className="text-right text-sm text-muted-foreground">
                            <div>{project._count.bills} bills</div>
                            <div>{project._count.bomItems} BOM items</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Created {formatDate(project.createdAt)}
                        </span>
                        {project.system && (
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(project.system.estimatedCostUsd)} estimated
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="border-t bg-gray-50/50 p-5 space-y-6">
                      
                      {/* Bills and OCR Data */}
                      {project.bills && project.bills.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <FileText className="h-4 w-4 text-blue-600" />
                            <h4 className="font-semibold">Uploaded Bills & OCR Data</h4>
                          </div>
                          <div className="grid gap-3">
                            {project.bills.map((bill) => {
                              const extractedData = parseExtractedData(bill.extractedData);
                              return (
                                <div key={bill.id} className="bg-white p-3 rounded-lg border">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-sm text-gray-900">{bill.fileName}</span>
                                    <Badge variant="outline">{bill.fileType.toUpperCase()}</Badge>
                                  </div>
                                  {extractedData && (
                                    <div className="text-xs text-gray-600 grid grid-cols-2 gap-2">
                                      {extractedData.monthlyUsageKwh && (
                                        <div className="text-gray-700">Usage: {extractedData.monthlyUsageKwh} kWh/month</div>
                                      )}
                                      {extractedData.totalCost && (
                                        <div className="text-gray-700">Cost: {formatCurrency(extractedData.totalCost)}</div>
                                      )}
                                      {extractedData.billingPeriod && (
                                        <div className="text-gray-700">Period: {extractedData.billingPeriod}</div>
                                      )}
                                      {extractedData.accountNumber && (
                                        <div className="text-gray-700">Account: {extractedData.accountNumber}</div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Analysis Data */}
                      {project.analysis && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Calculator className="h-4 w-4 text-purple-600" />
                            <h4 className="font-semibold">Energy Analysis</h4>
                          </div>
                          <div className="bg-white p-3 rounded-lg border">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Monthly Usage</span>
                                <div className="font-semibold text-gray-900">{Math.round(project.analysis.monthlyUsageKwh)} kWh</div>
                              </div>
                              <div>
                                <span className="text-gray-600">Peak Demand</span>
                                <div className="font-semibold text-gray-900">{project.analysis.peakDemandKw.toFixed(1)} kW</div>
                              </div>
                              <div>
                                <span className="text-gray-600">Avg Cost/kWh</span>
                                <div className="font-semibold text-gray-900">{formatCurrency(project.analysis.averageCostPerKwh)}</div>
                              </div>
                              <div>
                                <span className="text-gray-600">Annual Cost</span>
                                <div className="font-semibold text-gray-900">{formatCurrency(project.analysis.annualCostUsd)}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* System Design */}
                      {project.system && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Zap className="h-4 w-4 text-yellow-600" />
                            <h4 className="font-semibold">System Design</h4>
                          </div>
                          <div className="bg-white p-3 rounded-lg border">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Solar Array</span>
                                <div className="font-semibold text-gray-900">
                                  {project.system.solarPanelCount} × {project.system.solarPanelWattage}W
                                </div>
                                <div className="text-xs text-gray-500">
                                  {project.system.totalSolarKw.toFixed(2)} kW total
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-600">Battery</span>
                                <div className="font-semibold text-gray-900">{project.system.batteryKwh.toFixed(1)} kWh</div>
                                <div className="text-xs text-gray-500">{project.system.batteryType}</div>
                              </div>
                              <div>
                                <span className="text-gray-600">Inverter</span>
                                <div className="font-semibold text-gray-900">{project.system.inverterKw.toFixed(1)} kW</div>
                                <div className="text-xs text-gray-500">{project.system.inverterType}</div>
                              </div>
                              <div>
                                <span className="text-gray-600">Backup Duration</span>
                                <div className="font-semibold text-gray-900">{project.system.backupDurationHrs}h</div>
                                <div className="text-xs text-gray-500">
                                  {project.system.criticalLoadKw}kW critical load
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600">Estimated System Cost</span>
                                <span className="text-lg font-bold text-green-600">
                                  {formatCurrency(project.system.estimatedCostUsd)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* BOM Items */}
                      {project.bomItems && project.bomItems.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <ClipboardList className="h-4 w-4 text-orange-600" />
                            <h4 className="font-semibold">Bill of Materials</h4>
                          </div>
                          <div className="bg-white rounded-lg border overflow-hidden">
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-semibold">Category</th>
                                    <th className="px-3 py-2 text-left font-semibold">Item</th>
                                    <th className="px-3 py-2 text-center font-semibold">Qty</th>
                                    <th className="px-3 py-2 text-right font-semibold">Unit Price</th>
                                    <th className="px-3 py-2 text-right font-semibold">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {project.bomItems.map((item) => (
                                    <tr key={item.id} className="border-t">
                                      <td className="px-3 py-2">
                                        <Badge variant="outline" className="text-xs">
                                          {item.category}
                                        </Badge>
                                      </td>
                                      <td className="px-3 py-2">
                                        <div className="font-medium text-gray-900">{item.itemName}</div>
                                        {item.manufacturer && (
                                          <div className="text-xs text-gray-600">
                                            {item.manufacturer} - {item.modelNumber}
                                          </div>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-center text-gray-900">{item.quantity}</td>
                                      <td className="px-3 py-2 text-right text-gray-900">
                                        {formatCurrency(item.unitPriceUsd)}
                                      </td>
                                      <td className="px-3 py-2 text-right font-semibold text-gray-900">
                                        {formatCurrency(item.totalPriceUsd)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot className="bg-gray-50 border-t-2">
                                  <tr>
                                    <td colSpan={4} className="px-3 py-2 font-semibold">Total BOM Cost</td>
                                    <td className="px-3 py-2 text-right font-bold text-green-600">
                                      {formatCurrency(bomTotal)}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
              </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-4 border-t">
                        <Button asChild size="sm">
                <Link href={`/wizard/${project.id}/intake`}>
                  {project.status === "complete" ? "View Project" : "Continue"}
                </Link>
              </Button>
                        {project.status === "complete" && (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/wizard/${project.id}/review`}>
                              Download Report
                            </Link>
                          </Button>
                        )}
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDeleteClick(project)}
                          disabled={deletingProject === project.id}
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
                  </CollapsibleContent>
                </Collapsible>
            </Card>
            );
          })}
        </div>
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
