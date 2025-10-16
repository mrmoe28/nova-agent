"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plus, Loader2, FolderOpen } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface Project {
  id: string
  clientName: string
  address: string | null
  status: string
  createdAt: string
  updatedAt: string
  _count: {
    bills: number
    bomItems: number
  }
}

export default function ProjectsPage() {
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects")
      const data = await response.json()

      if (data.success) {
        setProjects(data.projects)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error("Error fetching projects:", error)
      alert("Failed to load projects")
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      intake: "bg-blue-100 text-blue-800",
      analysis: "bg-purple-100 text-purple-800",
      sizing: "bg-yellow-100 text-yellow-800",
      bom: "bg-orange-100 text-orange-800",
      plan: "bg-cyan-100 text-cyan-800",
      review: "bg-indigo-100 text-indigo-800",
      complete: "bg-green-100 text-green-800",
    }

    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          statusColors[status] || "bg-gray-100 text-gray-800"
        }`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your NovaAgent energy planning projects
          </p>
        </div>
        <Button asChild>
          <Link href="/wizard/new">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card className="p-12 text-center">
          <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No projects yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first NovaAgent project to get started
          </p>
          <Button asChild className="mt-6">
            <Link href="/wizard/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Project
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="p-5 hover:shadow-lg transition-shadow">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg line-clamp-1">
                    {project.clientName}
                  </h3>
                  {project.address && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                      {project.address}
                    </p>
                  )}
                </div>
              </div>

              <div className="mb-4">{getStatusBadge(project.status)}</div>

              <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                <span>Created {formatDate(project.createdAt)}</span>
              </div>

              <Button asChild className="w-full" size="sm">
                <Link href={`/wizard/${project.id}/intake`}>
                  {project.status === "complete" ? "View Project" : "Continue"}
                </Link>
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
