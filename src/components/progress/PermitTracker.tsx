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
import { formatDate, formatCurrency } from "@/lib/utils";
import { GEORGIA_FEES } from "@/lib/config";
import { FileText, Calendar, Check, Clock, XCircle, AlertCircle, Search, ExternalLink } from "lucide-react";

interface PermitData {
  permitStatus: string | null;
  permitNumber: string | null;
  permitSubmitDate: Date | null;
  permitApprovalDate: Date | null;
  ahjName: string | null;
  ahjContact: string | null;
  permitNotes: string | null;
}

interface PermitTrackerProps {
  projectId: string;
  initialData: PermitData;
  customerAddress?: string;
  ptoAgentUrl?: string;
  onUpdate?: () => void;
}

interface PermitOfficeInfo {
  ahjName: string;
  jurisdiction: string;
  phone?: string;
  website?: string;
  onlinePortalUrl?: string;
  fees: {
    buildingPermit: number;
    electricalPermit: number;
    planReview: number;
    interconnectionFee?: number;
    adminProcessing?: number;
  };
  totalFees: number;
  processingTimeBusinessDays: number;
  notes?: string;
}

const permitStatuses = [
  { value: "not_started", label: "Not Started", variant: "secondary" as const, icon: Clock },
  { value: "submitted", label: "Submitted", variant: "default" as const, icon: FileText },
  { value: "under_review", label: "Under Review", variant: "outline" as const, icon: AlertCircle },
  { value: "approved", label: "Approved", variant: "default" as const, icon: Check, color: "bg-green-500" },
  { value: "rejected", label: "Rejected", variant: "destructive" as const, icon: XCircle },
];

export function PermitTracker({ projectId, initialData, customerAddress, ptoAgentUrl, onUpdate }: PermitTrackerProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [permitOfficeInfo, setPermitOfficeInfo] = useState<PermitOfficeInfo | null>(null);
  const [formData, setFormData] = useState({
    permitStatus: initialData.permitStatus || "not_started",
    permitNumber: initialData.permitNumber || "",
    permitSubmitDate: initialData.permitSubmitDate 
      ? new Date(initialData.permitSubmitDate).toISOString().split('T')[0] 
      : "",
    permitApprovalDate: initialData.permitApprovalDate 
      ? new Date(initialData.permitApprovalDate).toISOString().split('T')[0] 
      : "",
    ahjName: initialData.ahjName || "",
    ahjContact: initialData.ahjContact || "",
    permitNotes: initialData.permitNotes || "",
  });

  const currentStatus = permitStatuses.find(s => s.value === (initialData.permitStatus || "not_started"));
  const StatusIcon = currentStatus?.icon || Clock;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        permitStatus: formData.permitStatus,
        permitNumber: formData.permitNumber || null,
        ahjName: formData.ahjName || null,
        ahjContact: formData.ahjContact || null,
        permitNotes: formData.permitNotes || null,
      };

      if (formData.permitSubmitDate) {
        payload.permitSubmitDate = new Date(formData.permitSubmitDate).toISOString();
      }
      if (formData.permitApprovalDate) {
        payload.permitApprovalDate = new Date(formData.permitApprovalDate).toISOString();
      }

      const response = await fetch(`/api/plans/${projectId}/permits`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success("Permit information updated successfully");
        setEditing(false);
        onUpdate?.();
      } else {
        toast.error(data.error || "Failed to update permit information");
      }
    } catch (error) {
      console.error("Error updating permit:", error);
      toast.error("Failed to update permit information");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickSubmit = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/plans/${projectId}/permits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ahjName: formData.ahjName || undefined,
          ahjContact: formData.ahjContact || undefined,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success("Permit application submitted");
        onUpdate?.();
      } else {
        toast.error(data.error || "Failed to submit permit application");
      }
    } catch (error) {
      console.error("Error submitting permit:", error);
      toast.error("Failed to submit permit application");
    } finally {
      setSaving(false);
    }
  };

  const handleLookupPermitOffice = async () => {
    if (!customerAddress) {
      toast.error("Customer address is required for permit office lookup");
      return;
    }

    setLookingUp(true);
    try {
      const response = await fetch("/api/permits/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: customerAddress }),
      });

      const data = await response.json();
      
      if (data.success && data.office) {
        setPermitOfficeInfo(data.office);
        // Auto-fill AHJ name and contact
        setFormData(prev => ({
          ...prev,
          ahjName: data.office.ahjName,
          ahjContact: data.office.phone || data.office.website || prev.ahjContact,
        }));
        toast.success(`Found: ${data.office.ahjName}`);
      } else {
        toast.error(data.error || "Failed to lookup permit office");
      }
    } catch (error) {
      console.error("Error looking up permit office:", error);
      toast.error("Failed to lookup permit office");
    } finally {
      setLookingUp(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Permit Tracking
            </CardTitle>
            <CardDescription>
              Monitor building permit status and approvals
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
        {/* Current Status */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${currentStatus?.color || "bg-slate-200"}`}>
              <StatusIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Current Status</p>
              <Badge variant={currentStatus?.variant} className="mt-1">
                {currentStatus?.label}
              </Badge>
            </div>
          </div>
          {initialData.permitStatus === "not_started" && !editing && (
            <Button onClick={handleQuickSubmit} disabled={saving}>
              {saving ? "Submitting..." : "Submit Permit"}
            </Button>
          )}
        </div>

        {/* Permit Office Lookup */}
        {customerAddress && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Permit Office Lookup</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLookupPermitOffice}
                disabled={lookingUp}
              >
                <Search className="h-4 w-4 mr-2" />
                {lookingUp ? "Looking up..." : "Find by Address"}
              </Button>
            </div>
            {permitOfficeInfo && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="space-y-2">
                  <div>
                    <p className="font-semibold text-green-900">{permitOfficeInfo.ahjName}</p>
                    <p className="text-sm text-green-700">{permitOfficeInfo.jurisdiction}</p>
                  </div>
                  {permitOfficeInfo.phone && (
                    <p className="text-sm text-green-700">📞 {permitOfficeInfo.phone}</p>
                  )}
                  {permitOfficeInfo.website && (
                    <a
                      href={permitOfficeInfo.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-green-600 hover:underline flex items-center gap-1"
                    >
                      🌐 {permitOfficeInfo.website}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {permitOfficeInfo.onlinePortalUrl && (
                    <a
                      href={permitOfficeInfo.onlinePortalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                    >
                      Submit Online
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  <div className="pt-2 border-t border-green-300">
                    <p className="text-sm font-medium text-green-900">Jurisdiction Fees:</p>
                    <p className="text-xl font-bold text-green-800">
                      {formatCurrency(permitOfficeInfo.totalFees)}
                    </p>
                    <p className="text-xs text-green-600">
                      Processing time: ~{permitOfficeInfo.processingTimeBusinessDays} business days
                    </p>
                  </div>
                  {permitOfficeInfo.notes && (
                    <p className="text-xs text-green-700 italic">{permitOfficeInfo.notes}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PTO Agent Integration */}
        {ptoAgentUrl && (
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-900">PTO Agent Integration</p>
                <p className="text-xs text-purple-600">External permit submission service</p>
              </div>
              <a
                href={ptoAgentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
              >
                Open PTO Agent
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}

        {/* Default Georgia Permit Fees (fallback) */}
        {!permitOfficeInfo && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <p className="text-sm font-medium text-blue-900">Default Georgia Fees</p>
              <ul className="mt-2 space-y-1 text-sm text-blue-700">
                <li>Building Permit: {formatCurrency(GEORGIA_FEES.BUILDING_PERMIT)}</li>
                <li>Electrical Permit: {formatCurrency(GEORGIA_FEES.ELECTRICAL_PERMIT)}</li>
                <li>Plan Review: {formatCurrency(GEORGIA_FEES.PLAN_REVIEW)}</li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900">Additional Fees</p>
              <ul className="mt-2 space-y-1 text-sm text-blue-700">
                <li>Interconnection: {formatCurrency(GEORGIA_FEES.INTERCONNECTION_FEE)}</li>
                <li>Admin Processing: {formatCurrency(GEORGIA_FEES.ADMIN_PROCESSING)}</li>
                <li className="font-semibold pt-1 border-t border-blue-300">
                  Total: {formatCurrency(GEORGIA_FEES.TOTAL)}
                </li>
              </ul>
              <p className="text-xs text-blue-600 mt-2 italic">
                Use "Find by Address" for jurisdiction-specific fees
              </p>
            </div>
          </div>
        )}

        {editing ? (
          <div className="space-y-4">
            {/* Status Selection */}
            <div className="space-y-2">
              <Label htmlFor="permitStatus">Permit Status</Label>
              <Select value={formData.permitStatus} onValueChange={(value) => setFormData({ ...formData, permitStatus: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {permitStatuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Permit Number */}
            <div className="space-y-2">
              <Label htmlFor="permitNumber">Permit Number</Label>
              <Input
                id="permitNumber"
                value={formData.permitNumber}
                onChange={(e) => setFormData({ ...formData, permitNumber: e.target.value })}
                placeholder="e.g., BP-2024-12345"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Submit Date */}
              <div className="space-y-2">
                <Label htmlFor="permitSubmitDate">Submit Date</Label>
                <Input
                  id="permitSubmitDate"
                  type="date"
                  value={formData.permitSubmitDate}
                  onChange={(e) => setFormData({ ...formData, permitSubmitDate: e.target.value })}
                />
              </div>

              {/* Approval Date */}
              <div className="space-y-2">
                <Label htmlFor="permitApprovalDate">Approval Date</Label>
                <Input
                  id="permitApprovalDate"
                  type="date"
                  value={formData.permitApprovalDate}
                  onChange={(e) => setFormData({ ...formData, permitApprovalDate: e.target.value })}
                />
              </div>
            </div>

            {/* AHJ Information */}
            <div className="space-y-2">
              <Label htmlFor="ahjName">Authority Having Jurisdiction (AHJ)</Label>
              <Input
                id="ahjName"
                value={formData.ahjName}
                onChange={(e) => setFormData({ ...formData, ahjName: e.target.value })}
                placeholder="e.g., City of Atlanta Building Department"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ahjContact">AHJ Contact</Label>
              <Input
                id="ahjContact"
                value={formData.ahjContact}
                onChange={(e) => setFormData({ ...formData, ahjContact: e.target.value })}
                placeholder="Phone or email"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="permitNotes">Notes</Label>
              <Textarea
                id="permitNotes"
                value={formData.permitNotes}
                onChange={(e) => setFormData({ ...formData, permitNotes: e.target.value })}
                placeholder="Any additional notes or requirements..."
                rows={3}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {initialData.permitNumber && (
              <div>
                <p className="text-sm text-slate-600">Permit Number</p>
                <p className="font-medium">{initialData.permitNumber}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {initialData.permitSubmitDate && (
                <div>
                  <p className="text-sm text-slate-600 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Submit Date
                  </p>
                  <p className="font-medium">{formatDate(initialData.permitSubmitDate)}</p>
                </div>
              )}

              {initialData.permitApprovalDate && (
                <div>
                  <p className="text-sm text-slate-600 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Approval Date
                  </p>
                  <p className="font-medium">{formatDate(initialData.permitApprovalDate)}</p>
                </div>
              )}
            </div>

            {initialData.ahjName && (
              <div>
                <p className="text-sm text-slate-600">Authority Having Jurisdiction</p>
                <p className="font-medium">{initialData.ahjName}</p>
                {initialData.ahjContact && (
                  <p className="text-sm text-slate-500">{initialData.ahjContact}</p>
                )}
              </div>
            )}

            {initialData.permitNotes && (
              <div>
                <p className="text-sm text-slate-600">Notes</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{initialData.permitNotes}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

