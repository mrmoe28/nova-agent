"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Sun, Battery, Zap, CheckCircle2, ArrowRight } from "lucide-react";

interface SystemSize {
  solarPanelCount: number;
  totalSolarKw: number;
  batteryKwh: number;
  inverterKw: number;
  monthlyUsageKwh: number;
  dailyUsageKwh: number;
}

export default function SizingPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const [loading, setLoading] = useState(true);
  const [systemSize, setSystemSize] = useState<SystemSize | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSystemSize();
  }, [projectId]);

  const loadSystemSize = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/system`);
      const data = await response.json();

      if (data.success && data.analysis) {
        const analysis = data.analysis;
        const monthlyUsageKwh = analysis.monthlyUsageKwh || 0;
        const dailyUsageKwh = monthlyUsageKwh / 30;

        // Calculate system size based on energy usage
        const SOLAR_PANEL_WATTAGE = 400;
        const PEAK_SUN_HOURS = 4;
        const SOLAR_SIZING_FACTOR = 1.2;

        const totalSolarKw = (dailyUsageKwh / PEAK_SUN_HOURS) * SOLAR_SIZING_FACTOR;
        const solarPanelCount = Math.ceil((totalSolarKw * 1000) / SOLAR_PANEL_WATTAGE);
        const actualTotalSolarKw = (solarPanelCount * SOLAR_PANEL_WATTAGE) / 1000;

        // Battery sizing (default 24h backup, 3kW critical load)
        const criticalDailyKwh = Math.min(dailyUsageKwh * 0.4, 15);
        const backupDays = 1; // 24 hours
        const BATTERY_OVERHEAD = 1.2;
        const calculatedBatteryKwh = criticalDailyKwh * backupDays * BATTERY_OVERHEAD;
        const batteryKwh = Math.max(5, Math.min(40, calculatedBatteryKwh));

        // Inverter sizing (125% of peak demand)
        const peakDemand = analysis.peakDemandKw || Math.max(5, 3);
        const inverterKw = peakDemand * 1.25;

        setSystemSize({
          solarPanelCount,
          totalSolarKw: actualTotalSolarKw,
          batteryKwh: Math.round(batteryKwh * 10) / 10,
          inverterKw: Math.round(inverterKw * 10) / 10,
          monthlyUsageKwh,
          dailyUsageKwh: Math.round(dailyUsageKwh * 10) / 10,
        });
      } else {
        setError("No energy analysis found. Please upload and analyze bills first.");
      }
    } catch (error) {
      console.error("Error loading system size:", error);
      setError("Failed to load system size calculation.");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    router.push(`/wizard/${projectId}/bom`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-slate-600 text-lg">Calculating system size...</p>
        </div>
      </div>
    );
  }

  if (error || !systemSize) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
        <Card className="max-w-md w-full bg-white border-2 border-red-200 shadow-lg">
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Unable to Calculate</h2>
            <p className="text-slate-600 mb-6">{error || "System size calculation unavailable"}</p>
            <Button
              onClick={() => router.push(`/wizard/${projectId}/intake`)}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              Go Back to Upload Bills
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">System Size Calculation</h1>
          <p className="text-lg text-slate-600">
            Based on your energy usage, here's the recommended system size
          </p>
        </div>

        {/* Energy Usage Summary */}
        <Card className="bg-white border-2 border-slate-200 shadow-lg mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Your Energy Usage</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="text-sm text-slate-600 mb-1">Monthly Usage</div>
                <div className="text-2xl font-bold text-slate-900">{systemSize.monthlyUsageKwh.toFixed(0)} kWh</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="text-sm text-slate-600 mb-1">Daily Usage</div>
                <div className="text-2xl font-bold text-slate-900">{systemSize.dailyUsageKwh.toFixed(1)} kWh</div>
              </div>
            </div>
          </div>
        </Card>

        {/* System Size Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Solar Panels */}
          <Card className="bg-white border-2 border-teal-200 shadow-lg hover:shadow-xl transition-shadow">
            <div className="p-6">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
                <Sun className="h-6 w-6 text-teal-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Solar Panels</h3>
              <div className="space-y-2">
                <div>
                  <div className="text-sm text-slate-600">Panel Count</div>
                  <div className="text-3xl font-bold text-teal-600">{systemSize.solarPanelCount}</div>
                  <div className="text-xs text-slate-500">panels</div>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <div className="text-sm text-slate-600">Total Capacity</div>
                  <div className="text-2xl font-bold text-slate-900">{systemSize.totalSolarKw.toFixed(2)} kW</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Battery */}
          <Card className="bg-white border-2 border-blue-200 shadow-lg hover:shadow-xl transition-shadow">
            <div className="p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Battery className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Battery Storage</h3>
              <div className="space-y-2">
                <div>
                  <div className="text-sm text-slate-600">Capacity</div>
                  <div className="text-3xl font-bold text-blue-600">{systemSize.batteryKwh.toFixed(1)}</div>
                  <div className="text-xs text-slate-500">kWh</div>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <div className="text-sm text-slate-600">Backup Duration</div>
                  <div className="text-2xl font-bold text-slate-900">24 hours</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Inverter */}
          <Card className="bg-white border-2 border-indigo-200 shadow-lg hover:shadow-xl transition-shadow">
            <div className="p-6">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Inverter</h3>
              <div className="space-y-2">
                <div>
                  <div className="text-sm text-slate-600">Capacity</div>
                  <div className="text-3xl font-bold text-indigo-600">{systemSize.inverterKw.toFixed(1)}</div>
                  <div className="text-xs text-slate-500">kW</div>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <div className="text-sm text-slate-600">Type</div>
                  <div className="text-2xl font-bold text-slate-900">Hybrid</div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="bg-gradient-to-r from-teal-50 to-blue-50 border-2 border-teal-200 shadow-lg mb-8">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-6 w-6 text-teal-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">System Sizing Complete</h3>
                <p className="text-slate-700 leading-relaxed">
                  These calculations are based on your actual energy usage. The system is sized to cover 120% of your 
                  daily energy needs, providing room for future growth. The battery capacity is calculated to power 
                  essential circuits for 24 hours during an outage.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/wizard/${projectId}/intake`)}
            className="bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50 px-8 py-6 text-lg"
          >
            Back
          </Button>
          <Button
            onClick={handleContinue}
            className="bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white px-8 py-6 text-lg shadow-lg"
          >
            Choose Equipment
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
