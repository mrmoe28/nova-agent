"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import FileUpload from "@/components/FileUpload"

export default function IntakePage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.projectId as string
  const [processing, setProcessing] = useState(false)
  const [hasFiles, setHasFiles] = useState(false)

  const handleUploadComplete = (bills: { id: string; fileName: string; fileType: string; uploadedAt: Date }[]) => {
    setHasFiles(bills.length > 0)
  }

  const handleContinue = async () => {
    setProcessing(true)
    try {
      // First, process all bills with OCR
      const ocrResponse = await fetch(`/api/ocr?projectId=${projectId}`)
      const ocrData = await ocrResponse.json()

      if (!ocrData.success) {
        alert(`OCR Error: ${ocrData.error}`)
        setProcessing(false)
        return
      }

      console.log(`Processed ${ocrData.processed} bills with OCR`)

      // Then analyze the extracted data
      const analyzeResponse = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      })

      const analyzeData = await analyzeResponse.json()

      if (analyzeData.success) {
        router.push(`/wizard/${projectId}/sizing`)
      } else {
        alert(`Analysis Error: ${analyzeData.error}`)
      }
    } catch (error) {
      console.error("Error:", error)
      alert("Failed to analyze bills")
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Bill Upload & Intake</h1>
        <p className="mt-2 text-muted-foreground">
          Upload power bills (PDF, images, or CSV) for analysis
        </p>
      </div>

      <Card className="p-6">
        <FileUpload projectId={projectId} onUploadComplete={handleUploadComplete} />

        <div className="mt-6 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/projects")}
            className="flex-1"
          >
            Save & Exit
          </Button>
          <Button
            onClick={handleContinue}
            disabled={processing || !hasFiles}
            className="flex-1"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing & Analyzing...
              </>
            ) : (
              "Process Bills & Continue"
            )}
          </Button>
        </div>
        {!hasFiles && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Please upload at least one bill to continue
          </p>
        )}
      </Card>
    </div>
  )
}
