"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { 
  Upload, 
  Mail, 
  FileText, 
  Trash2, 
  Eye, 
  Download,
  Send,
  CheckCircle2,
  Clock,
  XCircle
} from "lucide-react";

interface PlansetDocument {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: Date;
  submittedToAHJ: boolean;
  submittedAt?: Date;
  status: "pending" | "submitted" | "approved" | "rejected" | "revision_needed";
}

interface PlansetUploaderProps {
  projectId: string;
  ahjEmail?: string;
  ahjName?: string;
  documents: PlansetDocument[];
  onDocumentsChange?: () => void;
}

export function PlansetUploader({ 
  projectId, 
  ahjEmail, 
  ahjName,
  documents,
  onDocumentsChange 
}: PlansetUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [emailForm, setEmailForm] = useState({
    to: ahjEmail || "",
    subject: `Solar Installation Permit Application - Project ${projectId.slice(0, 8)}`,
    message: `Dear ${ahjName || "Building Department"},\n\nPlease find attached our planset for the solar installation project.\n\nProject Details:\n- Project ID: ${projectId}\n- System Type: Solar + Battery\n\nWe look forward to your review and approval.\n\nBest regards`,
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file type
      if (file.type !== "application/pdf") {
        toast.error("Only PDF files are allowed");
        return;
      }
      
      // Check file size (max 25MB)
      if (file.size > 25 * 1024 * 1024) {
        toast.error("File size must be less than 25MB");
        return;
      }

      setSelectedFile(file);
      toast.success(`Selected: ${file.name}`);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("projectId", projectId);
      formData.append("documentType", "planset");

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Planset uploaded successfully");
        setSelectedFile(null);
        onDocumentsChange?.();
      } else {
        toast.error(data.error || "Failed to upload planset");
      }
    } catch (error) {
      console.error("Error uploading planset:", error);
      toast.error("Failed to upload planset");
    } finally {
      setUploading(false);
    }
  };

  const handleSendEmail = async (documentId: string) => {
    if (!emailForm.to) {
      toast.error("Please enter permit office email address");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/permits/send-planset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          documentId,
          to: emailForm.to,
          subject: emailForm.subject,
          message: emailForm.message,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Planset sent to ${emailForm.to}`);
        onDocumentsChange?.();
      } else {
        toast.error(data.error || "Failed to send email");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error("Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Document deleted");
        onDocumentsChange?.();
      } else {
        toast.error(data.error || "Failed to delete document");
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: any, color?: string }> = {
      pending: { variant: "secondary", icon: Clock },
      submitted: { variant: "default", icon: Send, color: "bg-blue-500" },
      approved: { variant: "default", icon: CheckCircle2, color: "bg-green-500" },
      rejected: { variant: "destructive", icon: XCircle },
      revision_needed: { variant: "outline", icon: FileText },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Planset Submission
        </CardTitle>
        <CardDescription>
          Upload and submit construction plansets to the permit office
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Upload Planset</Label>
            <Badge variant="outline">PDF Only, Max 25MB</Badge>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                disabled={uploading}
                className="cursor-pointer"
              />
            </div>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>

          {selectedFile && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Selected:</strong> {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            </div>
          )}
        </div>

        {/* Email Configuration */}
        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold">Email Configuration</Label>
          
          <div className="space-y-2">
            <Label htmlFor="ahjEmail">Permit Office Email</Label>
            <Input
              id="ahjEmail"
              type="email"
              value={emailForm.to}
              onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
              placeholder="permits@county.gov"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Email Subject</Label>
            <Input
              id="subject"
              value={emailForm.subject}
              onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Email Message</Label>
            <Textarea
              id="message"
              value={emailForm.message}
              onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
              rows={6}
              className="font-mono text-sm"
            />
          </div>
        </div>

        {/* Uploaded Documents List */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Uploaded Documents</Label>
            <Badge>{documents.length} Document{documents.length !== 1 ? "s" : ""}</Badge>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No plansets uploaded yet</p>
              <p className="text-sm">Upload your construction plans above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-5 w-5 text-red-500 flex-shrink-0" />
                        <p className="font-medium truncate">{doc.fileName}</p>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{(doc.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                        <span>•</span>
                        <span>Uploaded {formatDate(doc.uploadedAt)}</span>
                      </div>
                      {doc.submittedAt && (
                        <p className="text-sm text-gray-600 mt-1">
                          Submitted {formatDate(doc.submittedAt)}
                        </p>
                      )}
                      <div className="mt-2">
                        {getStatusBadge(doc.status)}
                      </div>
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/api/documents/${doc.id}/download`, "_blank")}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/api/documents/${doc.id}/download?download=true`, "_blank")}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {!doc.submittedToAHJ && (
                        <Button
                          size="sm"
                          onClick={() => handleSendEmail(doc.id)}
                          disabled={sending || !emailForm.to}
                        >
                          <Mail className="h-4 w-4 mr-1" />
                          {sending ? "Sending..." : "Send"}
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(doc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

