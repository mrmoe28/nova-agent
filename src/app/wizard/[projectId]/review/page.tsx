"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Download, CheckCircle2, AlertTriangle, Edit3, Save, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

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
  const [editedSystem, setEditedSystem] = useState<{
    solarPanelCount: number;
    solarPanelWattage: number;
    batteryKwh: number;
    inverterKw: number;
    backupDurationHrs: number;
  } | null>(null);

  useEffect(() => {
    fetchProject();
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

  const handleEditSystem = () => {
    if (project?.system) {
      setEditedSystem({
        solarPanelCount: project.system.solarPanelCount,
        solarPanelWattage: project.system.solarPanelWattage,
        batteryKwh: project.system.batteryKwh,
        inverterKw: project.system.inverterKw,
        backupDurationHrs: project.system.backupDurationHrs,
      });
      setEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditedSystem(null);
  };

  const calculateCost = (system: {
    solarPanelCount?: number;
    solarPanelWattage?: number;
    batteryKwh?: number;
    inverterKw?: number;
  }) => {
    // Simplified cost calculation - in real app, this should match your sizing API logic
    const solarCost = (system.solarPanelCount || 0) * (system.solarPanelWattage || 0) * 1.5; // $1.5 per watt
    const batteryCost = (system.batteryKwh || 0) * 800; // $800 per kWh
    const inverterCost = (system.inverterKw || 0) * 500; // $500 per kW
    const installationCost = 5000; // Base installation cost
    
    return solarCost + batteryCost + inverterCost + installationCost;
  };

  const handleSaveSystem = async () => {
    if (!editedSystem || !project) return;
    
    // Validation
    const hasSolar = (editedSystem.solarPanelCount || 0) > 0 && (editedSystem.solarPanelWattage || 0) > 0;
    const hasBattery = (editedSystem.batteryKwh || 0) > 0;
    const hasInverter = (editedSystem.inverterKw || 0) > 0;

    if (!hasSolar && !hasBattery) {
      alert("System must have either solar panels or battery storage (or both).");
      return;
    }

    if (!hasInverter) {
      alert("System must have an inverter with capacity greater than 0 kW.");
      return;
    }

    // For battery-only systems, suggest appropriate inverter sizing
    if (!hasSolar && hasBattery && editedSystem.inverterKw < editedSystem.batteryKwh * 0.5) {
      const suggestedInverter = Math.max(5, editedSystem.batteryKwh * 0.5);
      if (!confirm(`For battery-only systems, we recommend an inverter capacity of at least ${suggestedInverter.toFixed(1)} kW. Continue with ${editedSystem.inverterKw} kW?`)) {
        return;
      }
    }
    
    setSaving(true);
    try {
      const totalSolarKw = (editedSystem.solarPanelCount || 0) * (editedSystem.solarPanelWattage || 0) / 1000;
      const estimatedCost = calculateCost(editedSystem);

      const systemData = {
        ...editedSystem,
        totalSolarKw,
        estimatedCostUsd: estimatedCost,
        batteryType: "lithium",
        inverterType: "Hybrid String Inverter",
      };

      const response = await fetch(`/api/projects/${projectId}/system`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(systemData),
      });

      const data = await response.json();
      if (data.success) {
        setProject({
          ...project,
          system: {
            ...project.system!,
            ...systemData,
          }
        });
        setEditing(false);
        setEditedSystem(null);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error updating system:", error);
      alert("Failed to update system");
    } finally {
      setSaving(false);
    }
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
        alert("Failed to generate PDF");
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF");
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
  const installSteps = project.plan
    ? JSON.parse(project.plan.installSteps)
    : [];

  return (
    <div className="mx-auto max-w-5xl">
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

          {editing && editedSystem && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="solarCount">Solar Panel Count</Label>
                  <Input
                    id="solarCount"
                    type="number"
                    min="0"
                    value={editedSystem.solarPanelCount || 0}
                    onChange={(e) => setEditedSystem({
                      ...editedSystem,
                      solarPanelCount: parseInt(e.target.value) || 0
                    })}
                    placeholder="Enter panel count (0 for battery-only)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="solarWattage">Panel Wattage (W)</Label>
                  <Input
                    id="solarWattage"
                    type="number"
                    min="0"
                    value={editedSystem.solarPanelWattage || 0}
                    onChange={(e) => setEditedSystem({
                      ...editedSystem,
                      solarPanelWattage: parseInt(e.target.value) || 0
                    })}
                    placeholder="Enter wattage per panel"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batteryKwh">Battery Storage (kWh)</Label>
                  <Input
                    id="batteryKwh"
                    type="number"
                    min="0"
                    step="0.1"
                    value={editedSystem.batteryKwh || 0}
                    onChange={(e) => setEditedSystem({
                      ...editedSystem,
                      batteryKwh: parseFloat(e.target.value) || 0
                    })}
                    placeholder="Enter battery capacity"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inverterKw">Inverter Capacity (kW)</Label>
                  <Input
                    id="inverterKw"
                    type="number"
                    min="0"
                    step="0.1"
                    value={editedSystem.inverterKw || 0}
                    onChange={(e) => setEditedSystem({
                      ...editedSystem,
                      inverterKw: parseFloat(e.target.value) || 0
                    })}
                    placeholder="Enter inverter capacity"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="backupHours">Backup Duration (hours)</Label>
                  <Input
                    id="backupHours"
                    type="number"
                    min="0"
                    value={editedSystem.backupDurationHrs || 0}
                    onChange={(e) => setEditedSystem({
                      ...editedSystem,
                      backupDurationHrs: parseInt(e.target.value) || 0
                    })}
                    placeholder="Enter backup duration"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estimated Cost</Label>
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrency(calculateCost(editedSystem))}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Project Types:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Battery Only:</strong> Set solar panels to 0, keep battery and inverter</li>
                  <li>• <strong>Solar Only:</strong> Set battery to 0, keep solar panels and inverter</li>
                  <li>• <strong>Full System:</strong> Include all components for complete energy solution</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSaveSystem}
                  disabled={saving}
                  className="flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card>

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
  );
}
