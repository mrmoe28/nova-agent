"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { Zap, Check, Clock, FileText } from "lucide-react";

interface InterconnectionData {
  utilityStatus: string | null;
  utilityName: string | null;
  utilityAccount: string | null;
  interconnectionLimit: number | null;
  applicationDate: Date | null;
  approvalDate: Date | null;
  ptoDate: Date | null;
  netMeteringType: string | null;
}

interface InterconnectionTrackerProps {
  projectId: string;
  initialData: InterconnectionData;
  onUpdate?: () => void;
}

const utilityStatuses = [
  { value: "not_started", label: "Not Started", variant: "secondary" as const },
  { value: "application_submitted", label: "Application Submitted", variant: "default" as const },
  { value: "approved", label: "Approved", variant: "default" as const, color: "bg-blue-500" },
  { value: "pto_received", label: "PTO Received", variant: "default" as const, color: "bg-green-500" },
];

const netMeteringTypes = [
  { value: "net_metering", label: "Net Metering" },
  { value: "net_billing", label: "Net Billing" },
  { value: "feed_in_tariff", label: "Feed-in Tariff" },
];

export function InterconnectionTracker({ projectId, initialData, onUpdate }: InterconnectionTrackerProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    utilityStatus: initialData.utilityStatus || "not_started",
    utilityName: initialData.utilityName || "",
    utilityAccount: initialData.utilityAccount || "",
    interconnectionLimit: initialData.interconnectionLimit?.toString() || "",
    applicationDate: initialData.applicationDate 
      ? new Date(initialData.applicationDate).toISOString().split('T')[0] 
      : "",
    approvalDate: initialData.approvalDate 
      ? new Date(initialData.approvalDate).toISOString().split('T')[0] 
      : "",
    ptoDate: initialData.ptoDate 
      ? new Date(initialData.ptoDate).toISOString().split('T')[0] 
      : "",
    netMeteringType: initialData.netMeteringType || "net_metering",
  });

  const currentStatus = utilityStatuses.find(s => s.value === (initialData.utilityStatus || "not_started"));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        utilityStatus: formData.utilityStatus,
        utilityName: formData.utilityName || null,
        utilityAccount: formData.utilityAccount || null,
        interconnectionLimit: formData.interconnectionLimit ? parseFloat(formData.interconnectionLimit) : null,
        netMeteringType: formData.netMeteringType,
      };

      if (formData.applicationDate) {
        payload.applicationDate = new Date(formData.applicationDate).toISOString();
      }
      if (formData.approvalDate) {
        payload.approvalDate = new Date(formData.approvalDate).toISOString();
      }
      if (formData.ptoDate) {
        payload.ptoDate = new Date(formData.ptoDate).toISOString();
      }

      const response = await fetch(`/api/plans/${projectId}/utility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success("Interconnection information updated successfully");
        setEditing(false);
        onUpdate?.();
      } else {
        toast.error(data.error || "Failed to update interconnection information");
      }
    } catch (error) {
      console.error("Error updating interconnection:", error);
      toast.error("Failed to update interconnection information");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickSubmit = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/plans/${projectId}/utility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          utilityName: formData.utilityName || undefined,
          utilityAccount: formData.utilityAccount || undefined,
          interconnectionLimit: formData.interconnectionLimit ? parseFloat(formData.interconnectionLimit) : undefined,
          netMeteringType: formData.netMeteringType,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success("Utility interconnection application submitted");
        onUpdate?.();
      } else {
        toast.error(data.error || "Failed to submit utility application");
      }
    } catch (error) {
      console.error("Error submitting utility application:", error);
      toast.error("Failed to submit utility application");
    } finally {
      setSaving(false);
    }
  };

  // Calculate progress based on status
  const getStepStatus = (step: string) => {
    const statusOrder = ["not_started", "application_submitted", "approved", "pto_received"];
    const currentIndex = statusOrder.indexOf(initialData.utilityStatus || "not_started");
    const stepIndex = statusOrder.indexOf(step);
    
    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "current";
    return "upcoming";
  };

  const steps = [
    { id: "not_started", label: "Not Started", icon: Clock },
    { id: "application_submitted", label: "Application Submitted", icon: FileText },
    { id: "approved", label: "Approved", icon: Check },
    { id: "pto_received", label: "PTO Received", icon: Zap },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Utility Interconnection
            </CardTitle>
            <CardDescription>
              Track utility interconnection application and Permission to Operate (PTO)
            </CardDescription>
          </div>
          {!editing ? (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Edit Details
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Stepper */}
        <div className="relative">
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-200">
            <div 
              className="h-full bg-blue-500 transition-all duration-500"
              style={{ 
                width: `${(utilityStatuses.findIndex(s => s.value === initialData.utilityStatus) / (utilityStatuses.length - 1)) * 100}%` 
              }}
            />
          </div>
          <div className="relative flex justify-between">
            {steps.map((step, index) => {
              const status = getStepStatus(step.id);
              const StepIcon = step.icon;
              
              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div 
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors
                      ${status === "completed" ? "bg-blue-500 border-blue-500" : ""}
                      ${status === "current" ? "bg-white border-blue-500" : ""}
                      ${status === "upcoming" ? "bg-white border-slate-200" : ""}
                    `}
                  >
                    <StepIcon 
                      className={`h-5 w-5 ${
                        status === "completed" ? "text-white" : 
                        status === "current" ? "text-blue-500" : 
                        "text-slate-400"
                      }`}
                    />
                  </div>
                  <div className="mt-2 text-xs text-center max-w-[80px]">
                    <p className={`font-medium ${status === "current" ? "text-blue-600" : "text-slate-600"}`}>
                      {step.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Status Badge */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm text-slate-600">Current Status</p>
              <Badge variant={currentStatus?.variant} className="mt-1">
                {currentStatus?.label}
              </Badge>
            </div>
          </div>
          {initialData.utilityStatus === "not_started" && !editing && (
            <Button onClick={handleQuickSubmit} disabled={saving}>
              {saving ? "Submitting..." : "Submit Application"}
            </Button>
          )}
        </div>

        {editing ? (
          <div className="space-y-4">
            {/* Status Selection */}
            <div className="space-y-2">
              <Label htmlFor="utilityStatus">Interconnection Status</Label>
              <Select value={formData.utilityStatus} onValueChange={(value) => setFormData({ ...formData, utilityStatus: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {utilityStatuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Utility Name */}
            <div className="space-y-2">
              <Label htmlFor="utilityName">Utility Company</Label>
              <Input
                id="utilityName"
                value={formData.utilityName}
                onChange={(e) => setFormData({ ...formData, utilityName: e.target.value })}
                placeholder="e.g., Georgia Power"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Account Number */}
              <div className="space-y-2">
                <Label htmlFor="utilityAccount">Account Number</Label>
                <Input
                  id="utilityAccount"
                  value={formData.utilityAccount}
                  onChange={(e) => setFormData({ ...formData, utilityAccount: e.target.value })}
                  placeholder="Account #"
                />
              </div>

              {/* Interconnection Limit */}
              <div className="space-y-2">
                <Label htmlFor="interconnectionLimit">Interconnection Limit (kW)</Label>
                <Input
                  id="interconnectionLimit"
                  type="number"
                  step="0.1"
                  value={formData.interconnectionLimit}
                  onChange={(e) => setFormData({ ...formData, interconnectionLimit: e.target.value })}
                  placeholder="e.g., 10"
                />
              </div>
            </div>

            {/* Net Metering Type */}
            <div className="space-y-2">
              <Label htmlFor="netMeteringType">Net Metering Type</Label>
              <Select value={formData.netMeteringType} onValueChange={(value) => setFormData({ ...formData, netMeteringType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {netMeteringTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Application Date */}
              <div className="space-y-2">
                <Label htmlFor="applicationDate">Application Date</Label>
                <Input
                  id="applicationDate"
                  type="date"
                  value={formData.applicationDate}
                  onChange={(e) => setFormData({ ...formData, applicationDate: e.target.value })}
                />
              </div>

              {/* Approval Date */}
              <div className="space-y-2">
                <Label htmlFor="approvalDate">Approval Date</Label>
                <Input
                  id="approvalDate"
                  type="date"
                  value={formData.approvalDate}
                  onChange={(e) => setFormData({ ...formData, approvalDate: e.target.value })}
                />
              </div>

              {/* PTO Date */}
              <div className="space-y-2">
                <Label htmlFor="ptoDate">PTO Date</Label>
                <Input
                  id="ptoDate"
                  type="date"
                  value={formData.ptoDate}
                  onChange={(e) => setFormData({ ...formData, ptoDate: e.target.value })}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {initialData.utilityName && (
              <div>
                <p className="text-sm text-slate-600">Utility Company</p>
                <p className="font-medium">{initialData.utilityName}</p>
                {initialData.utilityAccount && (
                  <p className="text-sm text-slate-500">Account: {initialData.utilityAccount}</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {initialData.interconnectionLimit && (
                <div>
                  <p className="text-sm text-slate-600">Interconnection Limit</p>
                  <p className="font-medium">{initialData.interconnectionLimit} kW</p>
                </div>
              )}

              {initialData.netMeteringType && (
                <div>
                  <p className="text-sm text-slate-600">Net Metering Type</p>
                  <p className="font-medium capitalize">{initialData.netMeteringType.replace(/_/g, " ")}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              {initialData.applicationDate && (
                <div>
                  <p className="text-sm text-slate-600">Applied</p>
                  <p className="font-medium text-sm">{formatDate(initialData.applicationDate)}</p>
                </div>
              )}

              {initialData.approvalDate && (
                <div>
                  <p className="text-sm text-slate-600">Approved</p>
                  <p className="font-medium text-sm">{formatDate(initialData.approvalDate)}</p>
                </div>
              )}

              {initialData.ptoDate && (
                <div>
                  <p className="text-sm text-slate-600">PTO Received</p>
                  <p className="font-medium text-sm">{formatDate(initialData.ptoDate)}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

