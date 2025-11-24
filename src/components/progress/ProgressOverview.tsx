"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/utils";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar,
  ListChecks,
  FileCheck,
  TrendingUp 
} from "lucide-react";

interface ProgressStats {
  phase: string;
  progressPercentage: number;
  taskStats: {
    total: number;
    completed: number;
    inProgress: number;
    blocked: number;
    notStarted: number;
  };
  inspectionStats: {
    total: number;
    passed: number;
    failed: number;
    scheduled: number;
    pending: number;
  };
  dates: {
    materialDelivery: Date | null;
    installStart: Date | null;
    installComplete: Date | null;
  };
}

interface ProgressOverviewProps {
  stats: ProgressStats;
  permitStatus?: string | null;
  utilityStatus?: string | null;
}

const phaseLabels: Record<string, string> = {
  pre_install: "Pre-Installation",
  material_delivery: "Material Delivery",
  site_prep: "Site Preparation",
  electrical: "Electrical Work",
  mounting: "Mounting & Racking",
  panel_install: "Panel Installation",
  inverter_install: "Inverter Installation",
  final_inspection: "Final Inspection",
  complete: "Complete",
};

const phaseVariants: Record<string, "secondary" | "default" | "outline"> = {
  pre_install: "secondary",
  material_delivery: "default",
  site_prep: "default",
  electrical: "default",
  mounting: "default",
  panel_install: "default",
  inverter_install: "default",
  final_inspection: "outline",
  complete: "default",
};

const statusLabels: Record<string, string> = {
  not_started: "Not Started",
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
  application_submitted: "Application Submitted",
  pto_received: "PTO Received",
};

export function ProgressOverview({ stats, permitStatus, utilityStatus }: ProgressOverviewProps) {
  const currentPhase = phaseLabels[stats.phase] || "Pre-Installation";
  const phaseVariant = phaseVariants[stats.phase] || "secondary";

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Overall Installation Progress
          </CardTitle>
          <CardDescription>
            Current phase and completion status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Current Phase</p>
              <Badge variant={phaseVariant} className="mt-1">
                {currentPhase}
              </Badge>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-blue-600">{stats.progressPercentage}%</p>
              <p className="text-sm text-slate-600">Complete</p>
            </div>
          </div>
          <Progress value={stats.progressPercentage} className="h-3" />
        </CardContent>
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tasks Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold">{stats.taskStats.completed}</span>
                <span className="text-sm text-slate-600">/ {stats.taskStats.total}</span>
              </div>
              <div className="space-y-1 text-xs">
                {stats.taskStats.inProgress > 0 && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-blue-500" />
                    <span>{stats.taskStats.inProgress} in progress</span>
                  </div>
                )}
                {stats.taskStats.blocked > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-3 w-3 text-red-500" />
                    <span>{stats.taskStats.blocked} blocked</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inspections Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Inspections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold">{stats.inspectionStats.passed}</span>
                <span className="text-sm text-slate-600">/ {stats.inspectionStats.total}</span>
              </div>
              <div className="space-y-1 text-xs">
                {stats.inspectionStats.scheduled > 0 && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-blue-500" />
                    <span>{stats.inspectionStats.scheduled} scheduled</span>
                  </div>
                )}
                {stats.inspectionStats.failed > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-3 w-3 text-red-500" />
                    <span>{stats.inspectionStats.failed} failed</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Permit Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Permit Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge 
                variant={
                  permitStatus === "approved" ? "default" : 
                  permitStatus === "rejected" ? "destructive" : 
                  "secondary"
                }
                className="w-full justify-center py-2"
              >
                {statusLabels[permitStatus || "not_started"] || "Not Started"}
              </Badge>
              {permitStatus === "approved" && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Ready for installation</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Utility Interconnection Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Interconnection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge 
                variant={
                  utilityStatus === "pto_received" || utilityStatus === "approved" ? "default" : 
                  "secondary"
                }
                className="w-full justify-center py-2"
              >
                {statusLabels[utilityStatus || "not_started"] || "Not Started"}
              </Badge>
              {utilityStatus === "pto_received" && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>System can be energized</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Dates Timeline */}
      {(stats.dates.materialDelivery || stats.dates.installStart || stats.dates.installComplete) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Key Dates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.dates.materialDelivery && (
                <div className="flex items-center gap-3">
                  <div className="w-32 text-sm text-slate-600">Material Delivery</div>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="font-medium">{formatDate(stats.dates.materialDelivery)}</span>
                  </div>
                </div>
              )}
              {stats.dates.installStart && (
                <div className="flex items-center gap-3">
                  <div className="w-32 text-sm text-slate-600">Installation Start</div>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="font-medium">{formatDate(stats.dates.installStart)}</span>
                  </div>
                </div>
              )}
              {stats.dates.installComplete && (
                <div className="flex items-center gap-3">
                  <div className="w-32 text-sm text-slate-600">Installation Complete</div>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="font-medium">{formatDate(stats.dates.installComplete)}</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

