"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Download, CheckCircle2, AlertTriangle } from "lucide-react";
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
          <h2 className="text-lg font-semibold mb-4">System Summary</h2>
          {project.system && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Solar Array</p>
                <p className="text-lg font-semibold">
                  {project.system.solarPanelCount} ×{" "}
                  {project.system.solarPanelWattage}W ={" "}
                  {project.system.totalSolarKw.toFixed(2)} kW
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Battery Storage</p>
                <p className="text-lg font-semibold">
                  {project.system.batteryKwh.toFixed(2)} kWh
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inverter</p>
                <p className="text-lg font-semibold">
                  {project.system.inverterKw.toFixed(2)} kW
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Backup Duration</p>
                <p className="text-lg font-semibold">
                  {project.system.backupDurationHrs} hours
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
