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
      // Analyze uploaded bills
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
      alert("Failed to analyze bills")
    } finally {
      setProcessing(false)
    }
  }

  const handleDemoMode = async () => {
    setProcessing(true)
    try {
      // Use demo data (skip file upload)
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

      <Card className="p-6">
        <FileUpload projectId={projectId} onUploadComplete={handleUploadComplete} />

        <div className="mt-6 flex flex-col gap-3">
          <div className="flex gap-3">
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
                  Analyzing...
                </>
              ) : (
                "Analyze Bills & Continue"
              )}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={handleDemoMode}
            disabled={processing}
            className="w-full"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Use Demo Data (Skip Upload)"
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Demo mode uses simulated usage data for testing
          </p>
        </div>
      </Card>
    </div>
  )
}
