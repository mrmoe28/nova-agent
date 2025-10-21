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
  Users
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

interface Equipment {
  id: string;
  name: string;
  manufacturer: string | null;
  unitPrice: number;
  imageUrl: string | null;
  category: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    totalDistributors: 0,
    totalEquipment: 0,
    averageSystemSize: 0,
  });
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [featuredEquipment, setFeaturedEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch projects count
      const projectsRes = await fetch("/api/projects");
      const projectsData = await projectsRes.json();

      // Fetch distributors with equipment count
      const distributorsRes = await fetch("/api/distributors");
      const distributorsData = await distributorsRes.json();

      // Fetch featured equipment (recent/popular items)
      const equipmentRes = await fetch("/api/equipment?limit=6");
      const equipmentData = await equipmentRes.json();

      setStats({
        totalProjects: projectsData.projects?.length || 0,
        totalDistributors: distributorsData.distributors?.length || 0,
        totalEquipment: distributorsData.distributors?.reduce(
          (sum: number, d: Distributor) => sum + (d._count?.equipment || 0),
          0
        ) || 0,
        averageSystemSize: 10.5, // TODO: Calculate from actual project data
      });

      setDistributors(distributorsData.distributors?.slice(0, 6) || []);
      setFeaturedEquipment(equipmentData.equipment || []);
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
        <div className="container mx-auto px-6 py-16 relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-[#22D3EE]/20 rounded-xl">
              <Zap className="h-8 w-8 text-[#22D3EE]" />
            </div>
            <h1 className="text-4xl font-bold text-white">
              NovaAgent <span className="text-[#22D3EE]">AI</span>
            </h1>
          </div>
          <p className="text-xl text-gray-300 max-w-2xl">
            Solar & Battery Energy Planning Platform
          </p>
          <div className="mt-6 flex gap-4">
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
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
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

        {/* Distributors Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Building2 className="h-6 w-6 text-[#22D3EE]" />
              Trusted Distributors
            </h2>
            <Button
              onClick={() => router.push("/distributors")}
              variant="outline"
              className="border-[#22D3EE]/30 text-[#22D3EE] hover:bg-[#22D3EE]/10"
            >
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {distributors.map((distributor) => (
              <Card
                key={distributor.id}
                className="bg-gradient-to-br from-[#1a2332] to-[#0F1629] border-[#22D3EE]/20 p-6 hover:border-[#22D3EE]/50 transition-all cursor-pointer group"
                onClick={() => router.push("/distributors")}
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#22D3EE]/20 to-[#22D3EE]/5 rounded-lg flex items-center justify-center group-hover:from-[#22D3EE]/30 group-hover:to-[#22D3EE]/10 transition-all">
                    {distributor.logoUrl ? (
                      <img
                        src={distributor.logoUrl}
                        alt={distributor.name}
                        className="w-12 h-12 object-contain"
                        onError={(e) => {
                          const img = e.currentTarget as HTMLImageElement;
                          img.style.display = "none";
                          const parent = img.parentElement;
                          if (parent) {
                            const icon = document.createElement("div");
                            icon.innerHTML = `<svg class="w-8 h-8 text-[#22D3EE]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>`;
                            parent.appendChild(icon.firstChild as Node);
                          }
                        }}
                      />
                    ) : (
                      <Building2 className="h-8 w-8 text-[#22D3EE]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1 group-hover:text-[#22D3EE] transition-colors">
                      {distributor.name}
                    </h3>
                    <p className="text-sm text-gray-400 mb-2 truncate">
                      {distributor.website || "No website"}
                    </p>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-[#22D3EE]" />
                      <span className="text-sm text-gray-400">
                        {distributor._count?.equipment || 0} products
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Featured Equipment Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Package className="h-6 w-6 text-[#22D3EE]" />
              Featured Equipment
            </h2>
            <Button
              onClick={() => router.push("/distributors")}
              variant="outline"
              className="border-[#22D3EE]/30 text-[#22D3EE] hover:bg-[#22D3EE]/10"
            >
              Browse Catalog
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredEquipment.length > 0 ? (
              featuredEquipment.map((equipment) => (
                <Card
                  key={equipment.id}
                  className="bg-gradient-to-br from-[#1a2332] to-[#0F1629] border-[#22D3EE]/20 overflow-hidden hover:border-[#22D3EE]/50 transition-all group"
                >
                  <div className="aspect-video bg-gradient-to-br from-[#22D3EE]/10 to-transparent flex items-center justify-center border-b border-[#22D3EE]/20">
                    {equipment.imageUrl ? (
                      <img
                        src={equipment.imageUrl}
                        alt={equipment.name}
                        className="w-full h-full object-contain p-4"
                        onError={(e) => {
                          const img = e.currentTarget as HTMLImageElement;
                          if (img.src.endsWith("/images/placeholder.svg")) return;
                          img.src = "/images/placeholder.svg";
                        }}
                      />
                    ) : (
                      <Package className="h-16 w-16 text-[#22D3EE]/50" />
                    )}
                  </div>
                  <div className="p-6">
                    <div className="mb-2">
                      <span className="text-xs font-medium text-[#22D3EE] bg-[#22D3EE]/10 px-2 py-1 rounded">
                        {equipment.category.replace(/_/g, " ")}
                      </span>
                    </div>
                    <h3 className="font-semibold text-white mb-1 group-hover:text-[#22D3EE] transition-colors line-clamp-2">
                      {equipment.name}
                    </h3>
                    {equipment.manufacturer && (
                      <p className="text-sm text-gray-400 mb-3">
                        {equipment.manufacturer}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-[#22D3EE]">
                        {formatCurrency(equipment.unitPrice)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[#22D3EE] hover:bg-[#22D3EE]/10"
                      >
                        Details
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="col-span-full bg-gradient-to-br from-[#1a2332] to-[#0F1629] border-[#22D3EE]/20 p-12 text-center">
                <Package className="h-16 w-16 text-[#22D3EE]/50 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">No equipment available yet</p>
                <Button
                  onClick={() => router.push("/distributors")}
                  className="bg-[#22D3EE] hover:bg-[#1BB5CF] text-white"
                >
                  Add Distributors
                </Button>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
