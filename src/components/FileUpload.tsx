"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Upload,
  FileText,
  X,
  Loader2,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UploadedFile {
  id: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
  ocrProcessed?: boolean;
}

interface FileUploadProps {
  projectId: string;
  onUploadComplete?: (bills: UploadedFile[]) => void;
}

export default function FileUpload({
  projectId,
  onUploadComplete,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<string>("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    const loadExistingBills = async () => {
      try {
        const response = await fetch(`/api/upload?projectId=${projectId}`);
        const data = await response.json();

        if (data.success && Array.isArray(data.bills)) {
          const mappedBills: UploadedFile[] = data.bills.map((bill: Record<string, unknown>) => ({
            id: bill.id as string,
            fileName: bill.fileName as string,
            fileType: bill.fileType as string,
            uploadedAt: new Date(bill.uploadedAt as string).toISOString(),
            ocrProcessed: !!bill.ocrText,
          }));

          setUploadedFiles(mappedBills);
          onUploadComplete?.(mappedBills);
        }
      } catch (error) {
        console.error("Error loading bills:", error);
        toast.error("Failed to load existing bills", {
          description: "Please refresh and try again.",
        });
      }
    };

    loadExistingBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const files = Array.from(e.dataTransfer.files);
      await uploadFiles(files);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projectId],
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      await uploadFiles(files);
    }
  };

  const uploadFiles = async (files: File[]) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      const uploaded: UploadedFile[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCurrentFile(file.name);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("projectId", projectId);

        // Simulate progress updates (since we can't track actual upload progress with FormData)
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 90) return prev;
            return prev + 10;
          });
        }, 1000);

        try {
          // OCR processing can take 60+ seconds, so use a generous timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          clearInterval(progressInterval);
          setUploadProgress(100);

          if (!response.ok) {
            throw new Error(`Upload failed with status ${response.status}`);
          }

          const data = await response.json();

          if (data.success) {
            const normalizedBill: UploadedFile = {
              id: data.bill.id,
              fileName: data.bill.fileName,
              fileType: data.bill.fileType,
              uploadedAt: new Date(data.bill.uploadedAt).toISOString(),
              ocrProcessed: data.bill.ocrProcessed,
            };

            uploaded.push(normalizedBill);

            // Show success toast
            if (normalizedBill.ocrProcessed) {
              toast.success(`${file.name} uploaded successfully`, {
                description: "OCR processing completed",
              });
            } else {
              toast.success(`${file.name} uploaded`, {
                description: "File saved successfully",
              });
            }
          } else {
            toast.error(`Failed to upload ${file.name}`, {
              description: data.error,
            });
          }
        } catch (uploadError) {
          clearInterval(progressInterval);

          if (
            uploadError instanceof Error &&
            uploadError.name === "AbortError"
          ) {
            toast.error(`Upload timeout for ${file.name}`, {
              description:
                "OCR processing is taking longer than expected. Please try again.",
              duration: 6000,
            });
          } else {
            toast.error(`Failed to upload ${file.name}`, {
              description:
                uploadError instanceof Error
                  ? uploadError.message
                  : "Unknown error occurred",
            });
          }
        }
      }

      const newFiles = [...uploadedFiles, ...uploaded];
      setUploadedFiles(newFiles);
      onUploadComplete?.(newFiles);
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("Upload failed", {
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setCurrentFile("");
    }
  };

  const removeFile = async (id: string) => {
    try {
      setRemovingId(id);
      const response = await fetch(`/api/bills/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to delete bill");
      }

      const newFiles = uploadedFiles.filter((f) => f.id !== id);
      setUploadedFiles(newFiles);
      onUploadComplete?.(newFiles);
      toast.success("Bill removed");
    } catch (error) {
      console.error("Error removing bill:", error);
      toast.error("Failed to remove bill", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card
        className={cn(
          "relative overflow-hidden border-2 border-dashed transition-all duration-200",
          dragActive
            ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950 shadow-lg scale-[1.02]"
            : "border-muted-foreground/25 hover:border-cyan-400 hover:shadow-md",
          uploading && "pointer-events-none opacity-75",
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <CardContent className="p-12">
          <div className="flex flex-col items-center gap-6 text-center">
            {uploading ? (
              <>
                {/* Upload Progress */}
                <div className="relative">
                  <div className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 p-4">
                    <Loader2 className="h-12 w-12 animate-spin text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 rounded-full bg-white dark:bg-gray-950 p-1">
                    <Clock className="h-5 w-5 text-cyan-600" />
                  </div>
                </div>

                <div className="w-full max-w-md space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {currentFile}
                    </span>
                    <span className="text-cyan-600 font-semibold">
                      {uploadProgress}%
                    </span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    OCR processing may take up to 1 minute for PDFs...
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Upload Icon */}
                <div className="relative">
                  <div
                    className={cn(
                      "rounded-full bg-gradient-to-br p-6 transition-all duration-200",
                      dragActive
                        ? "from-cyan-500 to-blue-600 shadow-xl scale-110"
                        : "from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900",
                    )}
                  >
                    <Upload
                      className={cn(
                        "h-12 w-12 transition-colors duration-200",
                        dragActive
                          ? "text-white"
                          : "text-gray-400 dark:text-gray-600",
                      )}
                    />
                  </div>
                  {dragActive && (
                    <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping" />
                  )}
                </div>

                {/* Upload Text */}
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {dragActive
                      ? "Drop files here"
                      : "Drag and drop files here"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or click browse to select files
                  </p>
                </div>

                {/* Supported Formats */}
                <Alert className="max-w-md bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Supports:</strong> PDF, JPG, PNG, CSV (max 10MB per
                    file)
                    <br />
                    <strong>Recommended:</strong> PDF files for best OCR
                    accuracy
                  </AlertDescription>
                </Alert>

                {/* Browse Button */}
                <div className="flex flex-col gap-3">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.csv"
                    onChange={handleFileSelect}
                    disabled={uploading}
                  />
                  <Button
                    asChild
                    size="lg"
                    className="bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="mr-2 h-5 w-5" />
                      Browse Files
                    </label>
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Uploaded Files
            </h3>
            <Badge variant="secondary" className="text-sm">
              {uploadedFiles.length}{" "}
              {uploadedFiles.length === 1 ? "file" : "files"}
            </Badge>
          </div>

          <div className="grid gap-3">
            {uploadedFiles.map((file) => (
              <Card
                key={file.id}
                className="group hover:shadow-md transition-all duration-200 border-l-4"
                style={{
                  borderLeftColor: file.ocrProcessed ? "#10b981" : "#6b7280",
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* File Thumbnail/Icon */}
                    <div className="flex-shrink-0">
                      {file.fileType.toLowerCase() === 'pdf' ? (
                        <div className="relative w-20 h-20 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
                          <iframe
                            src={`/api/files/bills/${file.id}#page=1&zoom=50`}
                            className="w-full h-full border-0"
                            title={`Preview of ${file.fileName}`}
                            onError={(e) => {
                              // Fallback to icon if iframe fails
                              const container = e.currentTarget.parentElement;
                              if (container) {
                                container.innerHTML = `
                                  <div class="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                                    <svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                                    </svg>
                                  </div>
                                `;
                              }
                            }}
                          />
                        </div>
                      ) : file.fileType.toLowerCase().match(/^(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img
                          src={`/api/files/bills/${file.id}`}
                          alt={file.fileName}
                          className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                          onError={(e) => {
                            const img = e.currentTarget;
                            img.style.display = 'none';
                            const container = img.parentElement;
                            if (container) {
                              container.innerHTML = `
                                <div class="w-20 h-20 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                  <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                  </svg>
                                </div>
                              `;
                            }
                          }}
                        />
                      ) : (
                        <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-3 w-20 h-20 flex items-center justify-center">
                          <FileText className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {file.fileName}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs capitalize">
                          {file.fileType}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(file.uploadedAt).toLocaleDateString()}
                        </span>

                        {file.ocrProcessed && (
                          <Badge className="text-xs bg-green-50 text-green-700 dark:text-green-400 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            OCR Success
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Remove Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(file.id)}
                      disabled={removingId === file.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400 disabled:opacity-50"
                    >
                      {removingId === file.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
