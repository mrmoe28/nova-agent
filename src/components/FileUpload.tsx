"use client"

import { useState, useCallback } from "react"
import { Upload, FileText, X, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"

interface UploadedFile {
  id: string
  fileName: string
  fileType: string
  uploadedAt: Date
  ocrProcessed?: boolean
  usingFallbackData?: boolean
}

interface FileUploadProps {
  projectId: string
  onUploadComplete?: (bills: UploadedFile[]) => void
}

export default function FileUpload({ projectId, onUploadComplete }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      const files = Array.from(e.dataTransfer.files)
      await uploadFiles(files)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projectId]
  )

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files)
      await uploadFiles(files)
    }
  }

  const uploadFiles = async (files: File[]) => {
    setUploading(true)

    try {
      const uploaded: UploadedFile[] = []

      for (const file of files) {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("projectId", projectId)

        // Show loading toast for long-running OCR
        toast.loading(`Uploading ${file.name}...`, {
          description: "OCR processing may take up to 1 minute for PDFs",
          id: `upload-${file.name}`,
        })

        // OCR processing can take 60+ seconds, so use a generous timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 minute timeout

        try {
          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
            signal: controller.signal,
          })

          clearTimeout(timeoutId)

          if (!response.ok) {
            throw new Error(`Upload failed with status ${response.status}`)
          }

          const data = await response.json()

          // Dismiss loading toast
          toast.dismiss(`upload-${file.name}`)

          if (data.success) {
            uploaded.push(data.bill)

            // Show appropriate toast based on upload status
            if (data.warning) {
              toast.warning(`${file.name} uploaded with issues`, {
                description: data.warning,
                duration: 6000,
              })
            } else if (data.bill.ocrProcessed) {
              toast.success(`${file.name} uploaded successfully`, {
                description: "OCR processing completed",
              })
            } else {
              toast.success(`${file.name} uploaded`, {
                description: "File saved successfully",
              })
            }
          } else {
            toast.error(`Failed to upload ${file.name}`, {
              description: data.error,
            })
          }
        } catch (uploadError) {
          clearTimeout(timeoutId)

          // Dismiss loading toast
          toast.dismiss(`upload-${file.name}`)

          if (uploadError instanceof Error && uploadError.name === 'AbortError') {
            toast.error(`Upload timeout for ${file.name}`, {
              description: "OCR processing is taking longer than expected. Please try again.",
              duration: 6000,
            })
          } else {
            toast.error(`Failed to upload ${file.name}`, {
              description: uploadError instanceof Error ? uploadError.message : "Unknown error occurred",
            })
          }
        }
      }

      const newFiles = [...uploadedFiles, ...uploaded]
      setUploadedFiles(newFiles)
      onUploadComplete?.(newFiles)
    } catch (error) {
      console.error("Error uploading files:", error)
      toast.error("Upload failed", {
        description: "An unexpected error occurred. Please try again.",
      })
    } finally {
      setUploading(false)
    }
  }

  const removeFile = (id: string) => {
    const newFiles = uploadedFiles.filter((f) => f.id !== id)
    setUploadedFiles(newFiles)
    onUploadComplete?.(newFiles)
  }

  return (
    <div className="space-y-4">
      <Card
        className={`relative border-2 border-dashed p-8 transition-colors ${
          dragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          {uploading ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Uploading files...</p>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-muted-foreground/50" />
              <div>
                <p className="text-sm font-medium">
                  Drag and drop files here, or click to browse
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Supports PDF, JPG, PNG, and CSV (max 10MB per file)
                </p>
                <p className="mt-2 flex items-center justify-center gap-1 text-xs font-medium text-cyan-600">
                  <CheckCircle className="h-3 w-3" />
                  PDF files recommended for best OCR accuracy
                </p>
              </div>
              <input
                type="file"
                id="file-upload"
                className="hidden"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.csv"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              <Button asChild variant="outline" disabled={uploading}>
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  Browse Files
                </label>
              </Button>
            </>
          )}
        </div>
      </Card>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Uploaded Files ({uploadedFiles.length})</h3>
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <Card key={file.id} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.fileName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{file.fileType}</span>
                      <span>·</span>
                      <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                      {file.ocrProcessed && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            OCR Success
                          </span>
                        </>
                      )}
                      {file.usingFallbackData && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1 text-amber-600">
                            <AlertCircle className="h-3 w-3" />
                            Demo Data
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(file.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
