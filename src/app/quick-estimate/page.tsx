'use client';

/**
 * Quick Estimate Mode - Single-page instant solar quote
 * Provides immediate system sizing and cost estimates without full wizard
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function QuickEstimatePage() {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [monthlyBill, setMonthlyBill] = useState('');
  const [monthlyUsage, setMonthlyUsage] = useState('');
  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate inputs
      const bill = parseFloat(monthlyBill);
      const usage = parseFloat(monthlyUsage);

      if (!address || isNaN(bill) || isNaN(usage)) {
        throw new Error('Please fill in all fields with valid values');
      }

      // Call quick estimate API
      const response = await fetch('/api/quick-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          monthlyBill: bill,
          monthlyUsageKwh: usage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate estimate');
      }

      const data = await response.json();
      setEstimate(data.estimate);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const startFullQuote = () => {
    router.push('/wizard/new');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Get Your Solar Estimate in 60 Seconds
          </h1>
          <p className="text-lg text-gray-600">
            No commitment required. Instant results.
          </p>
        </div>

        {/* Quick Estimate Form */}
        {!estimate && (
          <div className="bg-white rounded-lg shadow-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  Property Address
                </label>
                <input
                  type="text"
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St, Atlanta, GA 30301"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="monthlyBill" className="block text-sm font-medium text-gray-700 mb-2">
                    Average Monthly Electric Bill
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-500">$</span>
                    <input
                      type="number"
                      id="monthlyBill"
                      value={monthlyBill}
                      onChange={(e) => setMonthlyBill(e.target.value)}
                      placeholder="150"
                      min="0"
                      step="0.01"
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="monthlyUsage" className="block text-sm font-medium text-gray-700 mb-2">
                    Average Monthly Usage (kWh)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="monthlyUsage"
                      value={monthlyUsage}
                      onChange={(e) => setMonthlyUsage(e.target.value)}
                      placeholder="1000"
                      min="0"
                      step="1"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                    <span className="absolute right-3 top-3 text-gray-500">kWh</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
              >
                {loading ? 'Calculating...' : 'Get Instant Estimate'}
              </button>
            </form>
          </div>
        )}

        {/* Estimate Results */}
        {estimate && (
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-xl p-8 text-white">
              <h2 className="text-3xl font-bold mb-4">Your Solar Estimate</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-blue-100 text-sm mb-1">System Size</p>
                  <p className="text-4xl font-bold">{estimate.systemSizeKw.toFixed(1)} kW</p>
                </div>
                <div>
                  <p className="text-blue-100 text-sm mb-1">Estimated Cost</p>
                  <p className="text-4xl font-bold">${estimate.systemCost.toLocaleString()}</p>
                  <p className="text-sm text-blue-100">After tax credit: ${estimate.netCostAfterTaxCredit.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-blue-100 text-sm mb-1">Annual Savings</p>
                  <p className="text-4xl font-bold">${estimate.annualSavings.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Details Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-semibold mb-4 text-gray-900">System Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Panel Count</span>
                    <span className="font-semibold">{estimate.panelCount} panels</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Battery Size</span>
                    <span className="font-semibold">{estimate.batterySizeKwh} kWh</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Inverter Size</span>
                    <span className="font-semibold">{estimate.inverterSizeKw.toFixed(1)} kW</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Annual Production</span>
                    <span className="font-semibold">{estimate.annualProductionKwh.toLocaleString()} kWh</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-semibold mb-4 text-gray-900">Financial Benefits</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payback Period</span>
                    <span className="font-semibold">{estimate.paybackPeriod.toFixed(1)} years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">25-Year ROI</span>
                    <span className="font-semibold text-green-600">{estimate.roi25Year.toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">25-Year Savings</span>
                    <span className="font-semibold">${estimate.totalSavings25Year.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Offset Percentage</span>
                    <span className="font-semibold">{estimate.offsetPercentage.toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Ready to Go Solar?</h3>
              <p className="text-gray-600 mb-6">
                Get a detailed quote with equipment selection, financing options, and installation timeline.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={startFullQuote}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-200"
                >
                  Get Detailed Quote
                </button>
                <button
                  onClick={() => setEstimate(null)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-8 rounded-lg transition duration-200"
                >
                  Try Another Address
                </button>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="text-center text-sm text-gray-500">
              <p>
                This is an estimate based on standard assumptions. Actual costs and savings may vary.
                A detailed site assessment is required for accurate pricing.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
