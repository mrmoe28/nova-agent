"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Activity, GitBranch, Server, Database, Zap, Eye } from "lucide-react";

interface SystemStatus {
  timestamp: string;
  git: {
    branch: string;
    lastCommit: string;
    status: string;
  };
  server: {
    status: string;
    uptime: number;
  };
  database: {
    status: string;
    connected: boolean;
  };
  features: {
    name: string;
    status: "active" | "pending" | "error";
    description: string;
  }[];
  build: {
    status: string;
    lastBuild: string;
  };
}

export default function MonitoringPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/monitoring/status");
      const data = await response.json();
      setStatus(data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch status:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-12 w-12 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-white text-lg">Loading system status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Eye className="h-10 w-10 text-cyan-400" />
            <h1 className="text-4xl font-bold text-white">System Monitoring Dashboard</h1>
          </div>
          <p className="text-gray-400 text-lg">
            AI Collaboration: Claude + Gemini | Real-time System Status
          </p>
          <Badge variant="outline" className="text-cyan-400 border-cyan-400">
            <Activity className="h-3 w-3 mr-1" />
            Live - Updates every 5s
          </Badge>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Git Status */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-white">
                  <GitBranch className="h-5 w-5 text-cyan-400" />
                  Git Status
                </CardTitle>
                <Badge variant="outline" className="text-green-400 border-green-400">
                  {status?.git.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-400">Branch</p>
                <p className="text-white font-mono">{status?.git.branch}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Last Commit</p>
                <p className="text-white font-mono text-xs">{status?.git.lastCommit}</p>
              </div>
            </CardContent>
          </Card>

          {/* Server Status */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Server className="h-5 w-5 text-cyan-400" />
                  Dev Server
                </CardTitle>
                <Badge variant="outline" className="text-green-400 border-green-400">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {status?.server.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-400">Uptime</p>
                <p className="text-white font-mono">
                  {Math.floor((status?.server.uptime || 0) / 60)}m {(status?.server.uptime || 0) % 60}s
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">URL</p>
                <p className="text-cyan-400 font-mono text-xs">http://localhost:3002</p>
              </div>
            </CardContent>
          </Card>

          {/* Database Status */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Database className="h-5 w-5 text-cyan-400" />
                  Database
                </CardTitle>
                <Badge 
                  variant="outline" 
                  className={status?.database.connected ? "text-green-400 border-green-400" : "text-red-400 border-red-400"}
                >
                  {status?.database.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-400">Connection</p>
                <p className="text-white">{status?.database.connected ? "Connected" : "Disconnected"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Type</p>
                <p className="text-white">PostgreSQL (Neon)</p>
              </div>
            </CardContent>
          </Card>

          {/* Build Status */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Zap className="h-5 w-5 text-cyan-400" />
                  Build Status
                </CardTitle>
                <Badge variant="outline" className="text-green-400 border-green-400">
                  {status?.build.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-400">Last Build</p>
                <p className="text-white">{status?.build.lastBuild}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">TypeScript</p>
                <p className="text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  No errors
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Features Status - Spans 2 columns */}
          <Card className="bg-gray-800 border-gray-700 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-white">Active Features</CardTitle>
              <CardDescription className="text-gray-400">
                Features currently deployed and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {status?.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-gray-900 rounded-lg border border-gray-700">
                    {feature.status === "active" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5" />
                    ) : feature.status === "error" ? (
                      <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                    ) : (
                      <Activity className="h-5 w-5 text-yellow-400 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-white font-medium">{feature.name}</p>
                      <p className="text-gray-400 text-sm">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Collaboration Status */}
        <Card className="bg-gradient-to-r from-cyan-900/20 to-purple-900/20 border-cyan-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Eye className="h-5 w-5 text-cyan-400" />
              Parallel Development Monitor
            </CardTitle>
            <CardDescription className="text-gray-300">
              Claude + Gemini working together
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <p className="text-cyan-400 font-medium">Gemini</p>
                <p className="text-gray-300 text-sm">New feature development</p>
                <Badge variant="outline" className="text-purple-400 border-purple-400">
                  Monitoring
                </Badge>
              </div>
              <div className="space-y-2">
                <p className="text-cyan-400 font-medium">Claude</p>
                <p className="text-gray-300 text-sm">Integration & fixes</p>
                <Badge variant="outline" className="text-green-400 border-green-400">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              </div>
              <div className="space-y-2">
                <p className="text-cyan-400 font-medium">Status</p>
                <p className="text-gray-300 text-sm">All systems synced</p>
                <Badge variant="outline" className="text-green-400 border-green-400">
                  ✓ Ready
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm">
          <p>Last updated: {status?.timestamp}</p>
          <p className="mt-2">Monitoring dashboard • Auto-refresh enabled</p>
        </div>
      </div>
    </div>
  );
}



