"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Loader2, Upload, FileText } from "lucide-react"

export default function IntakePage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.projectId as string
  const [processing, setProcessing] = useState(false)

  const handleSkipToAnalysis = async () => {
    setProcessing(true)
    try {
      // For demo purposes, we'll skip file upload and go straight to analysis
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      })

      const data = await response.json()

      if (data.success) {
        router.push(`/wizard/${projectId}/sizing`)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error("Error:", error)
      alert("Failed to analyze")
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

      <Card className="p-8">
        <div className="flex flex-col items-center justify-center space-y-6 text-center">
          <div className="rounded-full bg-muted p-6">
            <Upload className="h-12 w-12 text-muted-foreground" />
          </div>

          <div>
            <h3 className="text-lg font-semibold">Upload Power Bills</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Drag and drop files here or click to browse
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Supports PDF, JPG, PNG, and CSV (1-12 months recommended)
            </p>
          </div>

          <div className="w-full border-2 border-dashed border-muted-foreground/25 rounded-lg p-12">
            <div className="flex flex-col items-center gap-4">
              <FileText className="h-16 w-16 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                File upload interface (OCR integration coming soon)
              </p>
              <Button variant="outline" disabled>
                <Upload className="mr-2 h-4 w-4" />
                Browse Files
              </Button>
            </div>
          </div>

          <div className="flex w-full gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/projects")}
              className="flex-1"
            >
              Save & Exit
            </Button>
            <Button
              onClick={handleSkipToAnalysis}
              disabled={processing}
              className="flex-1"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Use Demo Data & Continue"
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Demo mode uses simulated usage data for testing purposes
          </p>
        </div>
      </Card>
    </div>
  )
}
