"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Download, CheckCircle2, AlertTriangle, Edit3, FileText, Calendar, Building2, Zap, ClipboardList, Users, DollarSign, Search, Shield, FileEdit, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import dynamic from "next/dynamic";

// Dynamically import the enhanced equipment editor to avoid SSR issues
const EquipmentEditorEnhanced = dynamic(
  () => import("@/components/equipment-editor-enhanced"),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }
);

interface ProjectData {
  id: string;
  clientName: string;
  address: string | null;
  system: {
    solarPanelCount: number;
    solarPanelWattage: number;
    totalSolarKw: number;
    batteryKwh: number;
    inverterKw: number;
    backupDurationHrs: number;
    estimatedCostUsd: number;
  } | null;
  plan: {
    necChecks: string;
    warnings: string | null;
    installSteps: string;
    timeline: string | null;
    laborHoursEst: number | null;
  } | null;
}

export default function ReviewPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [siteSurvey, setSiteSurvey] = useState<any>(null);
  const [permit, setPermit] = useState<any>(null);
  const [utility, setUtility] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [crew, setCrew] = useState<any[]>([]);
  const [costBreakdown, setCostBreakdown] = useState<any>(null);
  const [risks, setRisks] = useState<any[]>([]);
  const [changeOrders, setChangeOrders] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);

  useEffect(() => {
    fetchProject();
    fetchEnhancedData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      const data = await response.json();

      if (data.success) {
        setProject(data.project);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error fetching project:", error);
      alert("Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  const fetchEnhancedData = async () => {
    try {
      // Fetch site survey
      const surveyRes = await fetch(`/api/plans/${projectId}/site-survey`);
      if (surveyRes.ok) {
        const surveyData = await surveyRes.json();
        if (surveyData.success) setSiteSurvey(surveyData.siteSurvey);
      }

      // Fetch permit data
      const permitRes = await fetch(`/api/plans/${projectId}/permits`);
      if (permitRes.ok) {
        const permitData = await permitRes.json();
        if (permitData.success) setPermit(permitData.permit);
      }

      // Fetch utility data
      const utilityRes = await fetch(`/api/plans/${projectId}/utility`);
      if (utilityRes.ok) {
        const utilityData = await utilityRes.json();
        if (utilityData.success) setUtility(utilityData.utility);
      }

      // Fetch tasks
      const tasksRes = await fetch(`/api/plans/${projectId}/tasks`);
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        if (tasksData.success) setTasks(tasksData.tasks);
      }

      // Fetch inspections
      const inspectionsRes = await fetch(`/api/plans/${projectId}/inspections`);
      if (inspectionsRes.ok) {
        const inspectionsData = await inspectionsRes.json();
        if (inspectionsData.success) setInspections(inspectionsData.inspections);
      }

      // Fetch crew
      const crewRes = await fetch(`/api/plans/${projectId}/crew`);
      if (crewRes.ok) {
        const crewData = await crewRes.json();
        if (crewData.success) setCrew(crewData.crew);
      }

      // Fetch cost breakdown
      const costRes = await fetch(`/api/plans/${projectId}/cost-breakdown`);
      if (costRes.ok) {
        const costData = await costRes.json();
        if (costData.success) setCostBreakdown(costData.costBreakdown);
      }

      // Fetch risks
      const risksRes = await fetch(`/api/plans/${projectId}/risks`);
      if (risksRes.ok) {
        const risksData = await risksRes.json();
        if (risksData.success) setRisks(risksData.risks);
      }

      // Fetch change orders
      const changeOrdersRes = await fetch(`/api/plans/${projectId}/change-orders`);
      if (changeOrdersRes.ok) {
        const changeOrdersData = await changeOrdersRes.json();
        if (changeOrdersData.success) setChangeOrders(changeOrdersData.changeOrders);
      }

      // Fetch progress
      const progressRes = await fetch(`/api/plans/${projectId}/progress`);
      if (progressRes.ok) {
        const progressData = await progressRes.json();
        if (progressData.success) setProgress(progressData.progress);
      }
    } catch (error) {
      console.error("Error fetching enhanced data:", error);
    }
  };

  const handleEditSystem = () => {
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
  };


  const handleGeneratePDF = async () => {
    setGenerating(true);
    try {
      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${project?.clientName.replace(/\s+/g, "_")}_NovaAgent_Report.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        // Navigate to projects page after successful PDF generation
        setTimeout(() => {
          router.push("/projects");
        }, 1000);
      } else {
        const errorData = await response.json();
        console.error("PDF generation failed:", errorData);
        alert(`Failed to generate PDF: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return <div>Project not found</div>;
  }

  const necChecks = project.plan ? JSON.parse(project.plan.necChecks) : [];
  const warnings = project.plan?.warnings
    ? JSON.parse(project.plan.warnings)
    : [];
  const installStepsRaw = project.plan
    ? JSON.parse(project.plan.installSteps)
    : [];
  // Handle both old string format and new object format
  const installSteps = installStepsRaw.map((step: any, idx: number) => 
    typeof step === "string" ? step : step.title || step
  );

  return (
    <div className="w-screen -ml-[50vw] left-1/2 relative min-h-screen bg-background">
      <div className="w-full max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Project Review</h1>
        <p className="mt-2 text-muted-foreground">
          Review the complete NovaAgent energy plan for {project.clientName}
        </p>
      </div>

      <div className="space-y-6">
        {/* System Summary */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">System Summary</h2>
            {!editing && project.system && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditSystem}
                className="flex items-center gap-2"
              >
                <Edit3 className="h-4 w-4" />
                Edit Equipment
              </Button>
            )}
          </div>
          
          {project.system && !editing && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Solar Array</p>
                <p className="text-lg font-semibold">
                  {project.system.solarPanelCount > 0 ? (
                    <>
                      {project.system.solarPanelCount} ×{" "}
                      {project.system.solarPanelWattage}W ={" "}
                      {project.system.totalSolarKw.toFixed(2)} kW
                    </>
                  ) : (
                    <span className="text-muted-foreground">No Solar Panels</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Battery Storage</p>
                <p className="text-lg font-semibold">
                  {project.system.batteryKwh > 0 ? (
                    `${project.system.batteryKwh.toFixed(2)} kWh`
                  ) : (
                    <span className="text-muted-foreground">No Battery Storage</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inverter</p>
                <p className="text-lg font-semibold">
                  {project.system.inverterKw > 0 ? (
                    `${project.system.inverterKw.toFixed(2)} kW`
                  ) : (
                    <span className="text-muted-foreground">No Inverter</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Backup Duration</p>
                <p className="text-lg font-semibold">
                  {project.system.backupDurationHrs > 0 ? (
                    `${project.system.backupDurationHrs} hours`
                  ) : (
                    <span className="text-muted-foreground">No Backup</span>
                  )}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm text-muted-foreground">Estimated Cost</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(project.system.estimatedCostUsd)}
                </p>
              </div>
            </div>
          )}

          {editing && (
            <EquipmentEditorEnhanced
              projectId={projectId}
              distributorId="dist-1"
              monthlyUsageKwh={900}
              onSave={async (systemData) => {
                setSaving(true);
                try {
                  const response = await fetch(`/api/projects/${projectId}/system`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      solarPanelCount: systemData.selectedProducts?.solarPanels?.quantity || 0,
                      solarPanelWattage: systemData.selectedProducts?.solarPanels?.product.specifications.wattage || 400,
                      totalSolarKw: systemData.totalSolarKw,
                      batteryKwh: systemData.batteryKwh,
                      inverterKw: systemData.inverterKw,
                      backupDurationHrs: systemData.backupDurationHrs,
                      estimatedCostUsd: systemData.estimatedCostUsd,
                      batteryType: "lithium",
                      inverterType: "Hybrid String Inverter",
                      criticalLoadKw: 3,
                      selectedProducts: systemData.selectedProducts,
                      customSpecs: systemData.customSpecs
                    }),
                  });

                  const data = await response.json();
                  if (data.success) {
                    await fetchProject();
                    setEditing(false);
                  } else {
                    alert(`Error: ${data.error}`);
                  }
                } catch (error) {
                  console.error("Error updating system:", error);
                  alert("Failed to update system");
                } finally {
                  setSaving(false);
                }
              }}
              onCancel={handleCancelEdit}
              saving={saving}
            />
          )}
        </Card>

        {/* Site Survey */}
        {siteSurvey && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Site Assessment</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {siteSurvey.roofType && (
                <div>
                  <p className="text-sm text-muted-foreground">Roof Type</p>
                  <p className="font-semibold capitalize">{siteSurvey.roofType}</p>
                </div>
              )}
              {siteSurvey.roofPitch && (
                <div>
                  <p className="text-sm text-muted-foreground">Roof Pitch</p>
                  <p className="font-semibold">{siteSurvey.roofPitch}°</p>
                </div>
              )}
              {siteSurvey.availableArea && (
                <div>
                  <p className="text-sm text-muted-foreground">Available Area</p>
                  <p className="font-semibold">{siteSurvey.availableArea.toFixed(0)} sq ft</p>
                </div>
              )}
              {siteSurvey.structuralNotes && (
                <div className="sm:col-span-2">
                  <p className="text-sm text-muted-foreground">Structural Notes</p>
                  <p className="text-sm">{siteSurvey.structuralNotes}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Permit Status */}
        {permit && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Permit Status</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${
                  permit.permitStatus === "approved" ? "bg-green-500" :
                  permit.permitStatus === "submitted" || permit.permitStatus === "under_review" ? "bg-yellow-500" :
                  permit.permitStatus === "rejected" ? "bg-red-500" :
                  "bg-gray-400"
                }`} />
                <div>
                  <p className="font-semibold capitalize">
                    {permit.permitStatus?.replace("_", " ") || "Not Started"}
                  </p>
                  {permit.permitNumber && (
                    <p className="text-sm text-muted-foreground">
                      Permit #: {permit.permitNumber}
                    </p>
                  )}
                </div>
              </div>
              {permit.ahjName && (
                <div>
                  <p className="text-sm text-muted-foreground">AHJ</p>
                  <p className="font-semibold">{permit.ahjName}</p>
                  {permit.ahjContact && (
                    <p className="text-sm text-muted-foreground">{permit.ahjContact}</p>
                  )}
                </div>
              )}
              {permit.permitSubmitDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="text-sm">
                    {new Date(permit.permitSubmitDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              {permit.permitApprovalDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-sm">
                    {new Date(permit.permitApprovalDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Utility Interconnection */}
        {utility && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Utility Interconnection</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${
                  utility.utilityStatus === "pto_received" ? "bg-green-500" :
                  utility.utilityStatus === "approved" ? "bg-blue-500" :
                  utility.utilityStatus === "application_submitted" ? "bg-yellow-500" :
                  "bg-gray-400"
                }`} />
                <div>
                  <p className="font-semibold capitalize">
                    {utility.utilityStatus?.replace("_", " ") || "Not Started"}
                  </p>
                </div>
              </div>
              {utility.utilityName && (
                <div>
                  <p className="text-sm text-muted-foreground">Utility Company</p>
                  <p className="font-semibold">{utility.utilityName}</p>
                </div>
              )}
              {utility.interconnectionLimit && (
                <div>
                  <p className="text-sm text-muted-foreground">Interconnection Limit</p>
                  <p className="font-semibold">{utility.interconnectionLimit} kW</p>
                </div>
              )}
              {utility.applicationDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Application Date</p>
                  <p className="text-sm">
                    {new Date(utility.applicationDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              {utility.ptoDate && (
                <div>
                  <p className="text-sm text-muted-foreground">PTO Received</p>
                  <p className="text-sm font-semibold text-green-600">
                    {new Date(utility.ptoDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Task Management */}
        {tasks.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Installation Tasks</h2>
            </div>
            <div className="space-y-3">
              {tasks.slice(0, 5).map((task: any) => (
                <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  <div className={`h-2 w-2 rounded-full mt-2 ${
                    task.status === "completed" ? "bg-green-500" :
                    task.status === "in_progress" ? "bg-blue-500" :
                    task.status === "blocked" ? "bg-red-500" :
                    "bg-gray-400"
                  }`} />
                  <div className="flex-1">
                    <p className="font-medium">{task.title}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="capitalize">{task.phase}</span>
                      <span className="capitalize">{task.status?.replace("_", " ")}</span>
                      {task.dueDate && (
                        <span>
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {tasks.length > 5 && (
                <p className="text-sm text-muted-foreground text-center">
                  +{tasks.length - 5} more tasks
                </p>
              )}
            </div>
          </Card>
        )}

        {/* Inspections */}
        {inspections.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Search className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Inspections</h2>
            </div>
            <div className="space-y-3">
              {inspections.map((inspection: any) => (
                <div key={inspection.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  <div className={`h-2 w-2 rounded-full mt-2 ${
                    inspection.status === "passed" ? "bg-green-500" :
                    inspection.status === "failed" ? "bg-red-500" :
                    inspection.status === "scheduled" ? "bg-blue-500" :
                    "bg-gray-400"
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium capitalize">{inspection.type} Inspection</p>
                      <span className="text-sm text-muted-foreground capitalize">
                        {inspection.status?.replace("_", " ")}
                      </span>
                    </div>
                    {inspection.scheduledDate && (
                      <p className="text-sm text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        Scheduled: {new Date(inspection.scheduledDate).toLocaleDateString()}
                      </p>
                    )}
                    {inspection.actualDate && (
                      <p className="text-sm text-muted-foreground">
                        Completed: {new Date(inspection.actualDate).toLocaleDateString()}
                      </p>
                    )}
                    {inspection.inspector && (
                      <p className="text-sm text-muted-foreground">
                        Inspector: {inspection.inspector}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Crew Assignments */}
        {crew.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Crew Assignments</h2>
            </div>
            <div className="space-y-3">
              {crew.map((member: any) => (
                <div key={member.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  <div className="flex-1">
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{member.role}</p>
                    {member.email && (
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    )}
                    {member.assignedTasks && member.assignedTasks.length > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {member.assignedTasks.length} task(s) assigned
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Cost Breakdown */}
        {costBreakdown && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Cost Breakdown</h2>
            </div>
            <div className="space-y-2">
              {costBreakdown.permits && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Permits</span>
                  <span className="font-semibold">{formatCurrency(costBreakdown.permits)}</span>
                </div>
              )}
              {costBreakdown.materials && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Materials</span>
                  <span className="font-semibold">{formatCurrency(costBreakdown.materials)}</span>
                </div>
              )}
              {costBreakdown.labor && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Labor</span>
                  <span className="font-semibold">{formatCurrency(costBreakdown.labor)}</span>
                </div>
              )}
              {costBreakdown.inspections && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Inspections</span>
                  <span className="font-semibold">{formatCurrency(costBreakdown.inspections)}</span>
                </div>
              )}
              {costBreakdown.contingency && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Contingency</span>
                  <span className="font-semibold">{formatCurrency(costBreakdown.contingency)}</span>
                </div>
              )}
              {costBreakdown.total && (
                <div className="flex justify-between pt-2 border-t mt-2">
                  <span className="font-semibold">Total</span>
                  <span className="text-lg font-bold text-primary">{formatCurrency(costBreakdown.total)}</span>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Progress Summary */}
        {progress && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Installation Progress</h2>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Overall Progress</span>
                  <span className="text-sm font-bold text-primary">
                    {progress.progressPercentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all"
                    style={{ width: `${progress.progressPercentage}%` }}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Phase</p>
                  <p className="font-semibold capitalize">
                    {progress.phase?.replace("_", " ") || "Pre-Install"}
                  </p>
                </div>
                {progress.taskStats && (
                  <div>
                    <p className="text-sm text-muted-foreground">Tasks</p>
                    <p className="font-semibold">
                      {progress.taskStats.completed} / {progress.taskStats.total} completed
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Risk Management */}
        {risks.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Risk Management</h2>
            </div>
            <div className="space-y-3">
              {risks.map((risk: any) => (
                <div key={risk.id} className="p-3 rounded-lg border">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium">{risk.title}</p>
                    <div className="flex gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        risk.severity === "high" || risk.severity === "critical" ? "bg-red-100 text-red-800" :
                        risk.severity === "medium" ? "bg-yellow-100 text-yellow-800" :
                        "bg-blue-100 text-blue-800"
                      }`}>
                        {risk.severity}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Impact: {risk.impact}
                  </p>
                  {risk.mitigation && (
                    <p className="text-sm">
                      <span className="font-medium">Mitigation:</span> {risk.mitigation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Change Orders */}
        {changeOrders.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileEdit className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Change Orders</h2>
            </div>
            <div className="space-y-3">
              {changeOrders.map((co: any) => (
                <div key={co.id} className="p-3 rounded-lg border">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium">{co.description}</p>
                    <span className={`text-xs px-2 py-1 rounded ${
                      co.status === "approved" ? "bg-green-100 text-green-800" :
                      co.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {co.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Reason: {co.reason}
                  </p>
                  <div className="flex gap-4 text-sm">
                    <span className="font-medium">
                      Cost Change: {formatCurrency(co.costChange)}
                    </span>
                    {co.scheduleImpact > 0 && (
                      <span className="text-muted-foreground">
                        Schedule Impact: +{co.scheduleImpact} days
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* NEC Compliance */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">NEC Compliance Checks</h2>
          <div className="space-y-3">
            {necChecks.map(
              (
                check: { code: string; description: string; status: string },
                idx: number,
              ) => (
                <div key={idx} className="flex items-start gap-3">
                  {check.status === "pass" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium">{check.code}</p>
                    <p className="text-sm text-muted-foreground">
                      {check.description}
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>

          {warnings.length > 0 && (
            <div className="mt-6 rounded-lg bg-amber-50 p-4 border border-amber-200">
              <h3 className="font-semibold text-amber-900 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Warnings
              </h3>
              <ul className="mt-2 space-y-1">
                {warnings.map((warning: string, idx: number) => (
                  <li key={idx} className="text-sm text-amber-800">
                    • {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* Installation Timeline */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Installation Plan</h2>
          {project.plan && (
            <>
              <div className="mb-4 grid gap-4 sm:grid-cols-2">
                {project.plan.timeline && (
                  <div>
                    <p className="text-sm text-muted-foreground">Timeline</p>
                    <p className="font-semibold">{project.plan.timeline}</p>
                  </div>
                )}
                {project.plan.laborHoursEst && (
                  <div>
                    <p className="text-sm text-muted-foreground">Labor Hours</p>
                    <p className="font-semibold">
                      {project.plan.laborHoursEst.toFixed(1)} hours
                    </p>
                  </div>
                )}
              </div>
              <ol className="space-y-2">
                {installSteps.map((step: string, idx: number) => (
                  <li key={idx} className="flex gap-3 text-sm">
                    <span className="font-semibold text-muted-foreground">
                      {idx + 1}.
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </Card>

        {/* Actions */}
        <Card className="p-6 bg-gradient-to-br from-[#0A0F1C] to-gray-900">
          <div className="text-white">
            <h2 className="text-lg font-semibold mb-2">
              Generate NovaAgent Report
            </h2>
            <p className="text-cyan-100/80 text-sm mb-6">
              Create a professional PDF with complete system specifications,
              BOM, NEC compliance checks, and installation plan
            </p>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                onClick={() => router.push(`/wizard/${projectId}/bom`)}
              >
                Back to BOM
              </Button>
              <Button
                onClick={handleGeneratePDF}
                disabled={generating}
                className="flex-1 bg-[#22D3EE] text-black hover:bg-[#6EE7F9]"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Download NovaAgent Report
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
      </div>
    </div>
  );
}
