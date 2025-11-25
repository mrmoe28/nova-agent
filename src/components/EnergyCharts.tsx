"use client";

import React from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface EnergyChartsProps {
  monthlyData: Array<{
    month: string;
    usage: number;
    cost: number;
    production: number;
  }>;
  savingsData: Array<{
    year: string;
    savings: number;
    netSavings: number;
    cost: number;
  }>;
  energyBreakdown: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  hasSystem: boolean;
}

export default function EnergyCharts({ monthlyData, savingsData, energyBreakdown, hasSystem }: EnergyChartsProps) {
  // Ensure we have data before rendering
  if (!monthlyData || monthlyData.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-600">
        No data available for charts.
      </div>
    );
  }

  // Ensure we're on the client side
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="text-center py-8 text-sm text-gray-600">
        Loading charts...
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-6">
      {/* Monthly Energy Usage & Production Chart */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Monthly Energy Usage & Production</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData} barGap={5} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} label={{ value: 'kWh', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
              formatter={(value: number) => [`${value.toLocaleString()} kWh`, '']}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="usage" fill="#3b82f6" name="Energy Usage" radius={[8, 8, 0, 0]} />
            <Bar dataKey="production" fill="#10b981" name="Solar Production" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Energy Cost Over Time Chart */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Energy Cost Over Time</h4>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} label={{ value: 'Cost ($)', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
              formatter={(value: number) => [formatCurrency(value), 'Monthly Cost']}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Line
              type="monotone"
              dataKey="cost"
              stroke="#ef4444"
              strokeWidth={3}
              name="Monthly Cost"
              dot={{ fill: '#ef4444', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Energy Source Breakdown and Savings - Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Energy Source Breakdown Pie Chart */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Energy Source Breakdown</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={energyBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {energyBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                formatter={(value: number) => [`${value.toLocaleString()} kWh`, '']}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Cost Savings Projection (if system exists) */}
        {hasSystem && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">25-Year Savings Projection</h4>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={savingsData.slice(0, 10)}>
                <defs>
                  <linearGradient id="colorSavingsOverview" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="colorNetSavingsOverview" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="year" stroke="#6b7280" fontSize={10} />
                <YAxis stroke="#6b7280" fontSize={10} label={{ value: 'Savings ($)', angle: -90, position: 'insideLeft', style: { fontSize: '10px' } }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area
                  type="monotone"
                  dataKey="savings"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorSavingsOverview)"
                  name="Cumulative Savings"
                />
                <Area
                  type="monotone"
                  dataKey="netSavings"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorNetSavingsOverview)"
                  name="Net Savings"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

