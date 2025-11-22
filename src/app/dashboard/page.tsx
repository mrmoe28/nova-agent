"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Package,
  Zap,
  TrendingUp,
  Building2,
  ArrowRight,
  FileText,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  Circle
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface DashboardStats {
  totalProjects: number;
  totalDistributors: number;
  totalEquipment: number;
  averageSystemSize: number;
}

interface Distributor {
  id: string;
  name: string;
  website: string;
  logoUrl: string | null;
  _count?: {
    equipment: number;
  };
}

interface RecentProject {
  id: string;
  clientName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  system?: {
    totalSolarKw: number;
    estimatedCostUsd: number;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    totalDistributors: 0,
    totalEquipment: 0,
    averageSystemSize: 0,
  });
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch projects with details
      const projectsRes = await fetch("/api/projects");
      const projectsData = await projectsRes.json();

      // Fetch distributors count
      const distributorsRes = await fetch("/api/distributors");
      const distributorsData = await distributorsRes.json();

      const projects = projectsData.projects || [];
      
      setStats({
        totalProjects: projects.length,
        totalDistributors: distributorsData.distributors?.length || 0,
        totalEquipment: distributorsData.distributors?.reduce(
          (sum: number, d: Distributor) => sum + (d._count?.equipment || 0),
          0
        ) || 0,
        averageSystemSize: projects.length > 0 
          ? projects.reduce((sum: number, p: RecentProject) => sum + (p.system?.totalSolarKw || 0), 0) / projects.length
          : 0,
      });

      // Get recent projects (last 10)
      setRecentProjects(projects.slice(0, 10));
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0F1C] via-[#0F1629] to-[#0A0F1C]">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#22D3EE]/10 to-transparent" />
        <div className="py-16 relative max-w-7xl mx-auto w-full">
          <div className="px-6 flex items-center gap-3 mb-4">
            <div className="p-3 bg-[#22D3EE]/20 rounded-xl">
              <Zap className="h-8 w-8 text-[#22D3EE]" />
            </div>
            <h1 className="text-4xl font-bold text-white">
              NovaAgent <span className="text-[#22D3EE]">AI</span>
            </h1>
          </div>
          <p className="px-6 text-xl text-gray-300 max-w-2xl">
            Solar & Battery Energy Planning Platform
          </p>
          <div className="px-6 mt-6 flex gap-4">
            <Button
              onClick={() => router.push("/wizard/new")}
              className="bg-[#22D3EE] hover:bg-[#1BB5CF] text-white px-6 py-6 text-lg"
            >
              Start New Project
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              onClick={() => router.push("/projects")}
              variant="outline"
              className="border-[#22D3EE]/30 text-white hover:bg-[#22D3EE]/10 px-6 py-6 text-lg"
            >
              View Projects
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="py-12 w-full max-w-7xl mx-auto">
        <div className="px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0F1629] border-[#22D3EE]/20 p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-2">Total Projects</p>
                <p className="text-3xl font-bold text-white">{stats.totalProjects}</p>
              </div>
              <div className="p-3 bg-[#22D3EE]/20 rounded-lg">
                <FileText className="h-6 w-6 text-[#22D3EE]" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className="text-green-400">Active</span>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0F1629] border-[#22D3EE]/20 p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-2">Distributors</p>
                <p className="text-3xl font-bold text-white">{stats.totalDistributors}</p>
              </div>
              <div className="p-3 bg-[#22D3EE]/20 rounded-lg">
                <Building2 className="h-6 w-6 text-[#22D3EE]" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-[#22D3EE]" />
              <span className="text-gray-400">Connected</span>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0F1629] border-[#22D3EE]/20 p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-2">Equipment Items</p>
                <p className="text-3xl font-bold text-white">{stats.totalEquipment}</p>
              </div>
              <div className="p-3 bg-[#22D3EE]/20 rounded-lg">
                <Package className="h-6 w-6 text-[#22D3EE]" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-yellow-400" />
              <span className="text-gray-400">In Stock</span>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0F1629] border-[#22D3EE]/20 p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-2">Avg System Size</p>
                <p className="text-3xl font-bold text-white">{stats.averageSystemSize}kW</p>
              </div>
              <div className="p-3 bg-[#22D3EE]/20 rounded-lg">
                <Zap className="h-6 w-6 text-[#22D3EE]" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className="text-green-400">+12% vs last month</span>
            </div>
          </Card>
        </div>

        {/* Recent Projects Section */}
        <div className="px-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <FileText className="h-6 w-6 text-[#22D3EE]" />
              Recent Projects
            </h2>
            <Button
              onClick={() => router.push("/projects")}
              variant="outline"
              className="border-[#22D3EE]/30 text-[#22D3EE] hover:bg-[#22D3EE]/10"
            >
              View All Projects
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          
          {recentProjects.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {recentProjects.map((project) => {
                const getStatusIcon = (status: string) => {
                  switch (status.toLowerCase()) {
                    case 'complete':
                      return <CheckCircle className="h-5 w-5 text-green-400" />;
                    case 'review':
                      return <Clock className="h-5 w-5 text-amber-400" />;
                    default:
                      return <Circle className="h-5 w-5 text-[#22D3EE]" />;
                  }
                };

                const getStatusColor = (status: string) => {
                  switch (status.toLowerCase()) {
                    case 'complete':
                      return 'text-green-400 bg-green-400/10';
                    case 'review':
                      return 'text-amber-400 bg-amber-400/10';
                    default:
                      return 'text-[#22D3EE] bg-[#22D3EE]/10';
                  }
                };

                return (
                  <Card
                    key={project.id}
                    className="bg-gradient-to-br from-[#1a2332] to-[#0F1629] border-[#22D3EE]/20 p-6 hover:border-[#22D3EE]/50 transition-all cursor-pointer group"
                    onClick={() => router.push(`/projects/${project.id}`)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-2 group-hover:text-[#22D3EE] transition-colors">
                          {project.clientName}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(project.status)}
                          <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(project.status)}`}>
                            {project.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-[#22D3EE] transition-colors" />
                    </div>

                    {project.system && (
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-400">System Size</p>
                          <p className="font-semibold text-white">{project.system.totalSolarKw.toFixed(1)} kW</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Estimated Cost</p>
                          <p className="font-semibold text-[#22D3EE]">{formatCurrency(project.system.estimatedCostUsd)}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0F1629] border-[#22D3EE]/20 p-12 text-center">
              <FileText className="h-16 w-16 text-[#22D3EE]/50 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No projects yet</p>
              <Button
                onClick={() => router.push("/wizard/new")}
                className="bg-[#22D3EE] hover:bg-[#1BB5CF] text-white"
              >
                Start Your First Project
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
