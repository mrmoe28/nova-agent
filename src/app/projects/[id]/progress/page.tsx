import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProgressOverview } from "@/components/progress/ProgressOverview";
import { PermitTracker } from "@/components/progress/PermitTracker";
import { InterconnectionTracker } from "@/components/progress/InterconnectionTracker";
import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";

interface ProgressPageProps {
  params: Promise<{ id: string }>;
}

async function getProjectProgress(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      clientName: true,
    },
  });

  if (!project) {
    return null;
  }

  const plan = await prisma.plan.findUnique({
    where: { projectId },
    select: {
      id: true,
      projectId: true,
      installationPhase: true,
      installStartDate: true,
      installCompleteDate: true,
      materialDeliveryDate: true,
      permitStatus: true,
      permitNumber: true,
      permitSubmitDate: true,
      permitApprovalDate: true,
      ahjName: true,
      ahjContact: true,
      permitNotes: true,
      utilityStatus: true,
      utilityName: true,
      utilityAccount: true,
      interconnectionLimit: true,
      applicationDate: true,
      approvalDate: true,
      ptoDate: true,
      netMeteringType: true,
    },
  });

  if (!plan) {
    return null;
  }

  // Get task statistics
  const tasks = await prisma.planTask.findMany({
    where: { planId: plan.id },
  });

  const taskStats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === "completed").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    blocked: tasks.filter((t) => t.status === "blocked").length,
    notStarted: tasks.filter((t) => t.status === "not_started").length,
  };

  const progressPercentage =
    taskStats.total > 0
      ? Math.round((taskStats.completed / taskStats.total) * 100)
      : 0;

  // Get inspection statistics
  const inspections = await prisma.planInspection.findMany({
    where: { planId: plan.id },
  });

  const inspectionStats = {
    total: inspections.length,
    passed: inspections.filter((i) => i.status === "passed").length,
    failed: inspections.filter((i) => i.status === "failed").length,
    scheduled: inspections.filter((i) => i.status === "scheduled").length,
    pending: inspections.filter((i) => i.status === "pending").length,
  };

  return {
    project,
    plan,
    stats: {
      phase: plan.installationPhase || "pre_install",
      progressPercentage,
      taskStats,
      inspectionStats,
      dates: {
        materialDelivery: plan.materialDeliveryDate,
        installStart: plan.installStartDate,
        installComplete: plan.installCompleteDate,
      },
    },
  };
}

export default async function ProgressPage({ params }: ProgressPageProps) {
  const { id } = await params;
  const data = await getProjectProgress(id);

  if (!data) {
    notFound();
  }

  const { project, plan, stats } = data;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Link href={`/projects/${id}`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Project
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold">Installation Progress</h1>
            <p className="text-slate-600">
              Client: {project.clientName}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Progress Overview */}
        <ProgressOverview
          stats={stats}
          permitStatus={plan.permitStatus}
          utilityStatus={plan.utilityStatus}
        />

        {/* Detailed Tracking Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="permits">Permits</TabsTrigger>
            <TabsTrigger value="interconnection">Interconnection</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <PermitTracker
                projectId={id}
                initialData={{
                  permitStatus: plan.permitStatus,
                  permitNumber: plan.permitNumber,
                  permitSubmitDate: plan.permitSubmitDate,
                  permitApprovalDate: plan.permitApprovalDate,
                  ahjName: plan.ahjName,
                  ahjContact: plan.ahjContact,
                  permitNotes: plan.permitNotes,
                }}
              />
              <InterconnectionTracker
                projectId={id}
                initialData={{
                  utilityStatus: plan.utilityStatus,
                  utilityName: plan.utilityName,
                  utilityAccount: plan.utilityAccount,
                  interconnectionLimit: plan.interconnectionLimit,
                  applicationDate: plan.applicationDate,
                  approvalDate: plan.approvalDate,
                  ptoDate: plan.ptoDate,
                  netMeteringType: plan.netMeteringType,
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="permits">
            <PermitTracker
              projectId={id}
              initialData={{
                permitStatus: plan.permitStatus,
                permitNumber: plan.permitNumber,
                permitSubmitDate: plan.permitSubmitDate,
                permitApprovalDate: plan.permitApprovalDate,
                ahjName: plan.ahjName,
                ahjContact: plan.ahjContact,
                permitNotes: plan.permitNotes,
              }}
            />
          </TabsContent>

          <TabsContent value="interconnection">
            <InterconnectionTracker
              projectId={id}
              initialData={{
                utilityStatus: plan.utilityStatus,
                utilityName: plan.utilityName,
                utilityAccount: plan.utilityAccount,
                interconnectionLimit: plan.interconnectionLimit,
                applicationDate: plan.applicationDate,
                approvalDate: plan.approvalDate,
                ptoDate: plan.ptoDate,
                netMeteringType: plan.netMeteringType,
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

