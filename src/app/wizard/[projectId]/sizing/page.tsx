"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function SizingPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.projectId as string
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    backupDurationHrs: 24,
    criticalLoadKw: 3,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/size", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          ...formData,
        }),
      })

      const data = await response.json()

      if (data.success) {
        router.push(`/wizard/${projectId}/bom`)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error("Error sizing system:", error)
      alert("Failed to size system")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">System Sizing & Configuration</h1>
        <p className="mt-2 text-muted-foreground">
          Configure backup duration and critical load requirements
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="backupDurationHrs">
              Backup Duration (hours)
            </Label>
            <Input
              id="backupDurationHrs"
              type="number"
              min="1"
              max="168"
              value={formData.backupDurationHrs}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  backupDurationHrs: parseInt(e.target.value),
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Recommended: 24h (1 day), 48h (2 days), or 72h (3 days)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="criticalLoadKw">
              Critical Load (kW)
            </Label>
            <Input
              id="criticalLoadKw"
              type="number"
              step="0.1"
              min="0.5"
              max="20"
              value={formData.criticalLoadKw}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  criticalLoadKw: parseFloat(e.target.value),
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Essential circuits to keep powered during outage (refrigerator,
              lights, internet, etc.)
            </p>
          </div>

          <div className="rounded-lg bg-muted p-4">
            <h3 className="font-semibold">What happens next?</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>• Solar panel array will be sized for daily usage</li>
              <li>• Battery capacity calculated for backup duration</li>
              <li>• Inverter sized for peak demand + critical loads</li>
              <li>• Equipment BOM generated with pricing</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/wizard/${projectId}/intake`)}
            >
              Back
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                "Calculate System Size"
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
