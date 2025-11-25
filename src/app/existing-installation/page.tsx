'use client';

/**
 * Existing Installation Intake - Retroactive Permitting
 * For customers who already have solar installed and need permits
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ExistingInstallationPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [clientInfo, setClientInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  const [systemInfo, setSystemInfo] = useState({
    installationDate: '',
    systemSizeKw: '',
    panelCount: '',
    panelManufacturer: '',
    panelModel: '',
    panelWattage: '400',
    inverterManufacturer: '',
    inverterModel: '',
    inverterSizeKw: '',
    inverterType: 'string' as const,
    hasBattery: false,
    batteryManufacturer: '',
    batteryModel: '',
    batterySizeKwh: '',
    installerName: '',
    installerLicense: '',
    installationType: 'roof_mount' as const,
    roofType: 'composition' as const,
    propertyAddress: '',
    hasSystemPhotos: false,
    hasElectricalDiagram: false,
    hasRoofPhotos: false,
    hasInverterDatasheet: false,
    hasPanelDatasheet: false,
  });

  const [permitPlan, setPermitPlan] = useState<any>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/retroactive-permitting/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientInfo: {
            ...clientInfo,
            address: clientInfo.address || systemInfo.propertyAddress,
          },
          systemInfo: {
            ...systemInfo,
            installationDate: systemInfo.installationDate || new Date().toISOString(),
            systemSizeKw: parseFloat(systemInfo.systemSizeKw),
            panelCount: parseInt(systemInfo.panelCount),
            panelWattage: parseInt(systemInfo.panelWattage),
            inverterSizeKw: parseFloat(systemInfo.inverterSizeKw),
            batterySizeKwh: systemInfo.hasBattery ? parseFloat(systemInfo.batterySizeKwh || '0') : 0,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create project');
      }

      const data = await response.json();
      setPermitPlan(data.plan);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Already Have Solar Installed?
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Get your existing system properly permitted and approved
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step >= s
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-16 h-1 ${
                      step > s ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>Client Info</span>
            <span>System Details</span>
            <span>Permit Plan</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Step 1: Client Information */}
        {step === 1 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Your Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={clientInfo.name}
                  onChange={(e) =>
                    setClientInfo({ ...clientInfo, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={clientInfo.email}
                  onChange={(e) =>
                    setClientInfo({ ...clientInfo, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={clientInfo.phone}
                  onChange={(e) =>
                    setClientInfo({ ...clientInfo, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Address *
                </label>
                <input
                  type="text"
                  value={clientInfo.address}
                  onChange={(e) => {
                    setClientInfo({ ...clientInfo, address: e.target.value });
                    setSystemInfo({ ...systemInfo, propertyAddress: e.target.value });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!clientInfo.name || !clientInfo.email || !clientInfo.phone || !clientInfo.address}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to System Details
              </button>
            </div>
          </div>
        )}

        {/* Step 2: System Information */}
        {step === 2 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Existing System Details</h2>

            <div className="space-y-6">
              {/* Installation Info */}
              <div className="border-b pb-4">
                <h3 className="font-medium mb-3">Installation Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Installation Date (approximate)
                    </label>
                    <input
                      type="date"
                      value={systemInfo.installationDate}
                      onChange={(e) =>
                        setSystemInfo({ ...systemInfo, installationDate: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      System Size (kW) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={systemInfo.systemSizeKw}
                      onChange={(e) =>
                        setSystemInfo({ ...systemInfo, systemSizeKw: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Solar Panels */}
              <div className="border-b pb-4">
                <h3 className="font-medium mb-3">Solar Panels</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Number of Panels *
                    </label>
                    <input
                      type="number"
                      value={systemInfo.panelCount}
                      onChange={(e) =>
                        setSystemInfo({ ...systemInfo, panelCount: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Panel Wattage
                    </label>
                    <input
                      type="number"
                      value={systemInfo.panelWattage}
                      onChange={(e) =>
                        setSystemInfo({ ...systemInfo, panelWattage: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Panel Manufacturer
                    </label>
                    <input
                      type="text"
                      value={systemInfo.panelManufacturer}
                      onChange={(e) =>
                        setSystemInfo({ ...systemInfo, panelManufacturer: e.target.value })
                      }
                      placeholder="e.g., LG, Canadian Solar"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Panel Model
                    </label>
                    <input
                      type="text"
                      value={systemInfo.panelModel}
                      onChange={(e) =>
                        setSystemInfo({ ...systemInfo, panelModel: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              {/* Inverter */}
              <div className="border-b pb-4">
                <h3 className="font-medium mb-3">Inverter</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Inverter Manufacturer *
                    </label>
                    <input
                      type="text"
                      value={systemInfo.inverterManufacturer}
                      onChange={(e) =>
                        setSystemInfo({ ...systemInfo, inverterManufacturer: e.target.value })
                      }
                      placeholder="e.g., SolarEdge, Enphase"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Inverter Model
                    </label>
                    <input
                      type="text"
                      value={systemInfo.inverterModel}
                      onChange={(e) =>
                        setSystemInfo({ ...systemInfo, inverterModel: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Inverter Size (kW)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={systemInfo.inverterSizeKw}
                      onChange={(e) =>
                        setSystemInfo({ ...systemInfo, inverterSizeKw: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Inverter Type
                    </label>
                    <select
                      value={systemInfo.inverterType}
                      onChange={(e) =>
                        setSystemInfo({ ...systemInfo, inverterType: e.target.value as any })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="string">String Inverter</option>
                      <option value="micro">Microinverters</option>
                      <option value="hybrid">Hybrid Inverter</option>
                      <option value="central">Central Inverter</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Battery (Optional) */}
              <div className="border-b pb-4">
                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    checked={systemInfo.hasBattery}
                    onChange={(e) =>
                      setSystemInfo({ ...systemInfo, hasBattery: e.target.checked })
                    }
                    className="mr-2"
                  />
                  <h3 className="font-medium">System includes battery storage</h3>
                </div>

                {systemInfo.hasBattery && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Battery Manufacturer
                      </label>
                      <input
                        type="text"
                        value={systemInfo.batteryManufacturer}
                        onChange={(e) =>
                          setSystemInfo({ ...systemInfo, batteryManufacturer: e.target.value })
                        }
                        placeholder="e.g., Tesla, LG"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Battery Model
                      </label>
                      <input
                        type="text"
                        value={systemInfo.batteryModel}
                        onChange={(e) =>
                          setSystemInfo({ ...systemInfo, batteryModel: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Battery Size (kWh)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={systemInfo.batterySizeKwh}
                        onChange={(e) =>
                          setSystemInfo({ ...systemInfo, batterySizeKwh: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Documentation Checklist */}
              <div>
                <h3 className="font-medium mb-3">Documentation Available</h3>
                <div className="space-y-2">
                  {[
                    { key: 'hasSystemPhotos', label: 'Photos of installed system' },
                    { key: 'hasElectricalDiagram', label: 'Electrical diagram or plans' },
                    { key: 'hasRoofPhotos', label: 'Roof condition photos' },
                    { key: 'hasInverterDatasheet', label: 'Inverter datasheet/specs' },
                    { key: 'hasPanelDatasheet', label: 'Panel datasheet/specs' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={systemInfo[key as keyof typeof systemInfo] as boolean}
                        onChange={(e) =>
                          setSystemInfo({ ...systemInfo, [key]: e.target.checked })
                        }
                        className="mr-2"
                      />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !systemInfo.systemSizeKw || !systemInfo.panelCount || !systemInfo.inverterManufacturer}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Generate Permit Plan'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Permit Plan */}
        {step === 3 && permitPlan && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Your Permit Completion Plan</h2>

            {/* Cost Estimate */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-2">Estimated Costs</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Permit Fees:</span>
                  <span>${permitPlan.costEstimate.permitFees}</span>
                </div>
                <div className="flex justify-between">
                  <span>Inspection Fees:</span>
                  <span>${permitPlan.costEstimate.inspectionFees}</span>
                </div>
                {permitPlan.costEstimate.engineeringStamp && (
                  <div className="flex justify-between">
                    <span>Engineering Stamp:</span>
                    <span>${permitPlan.costEstimate.engineeringStamp}</span>
                  </div>
                )}
                {permitPlan.costEstimate.possibleUpgrades && (
                  <div className="flex justify-between">
                    <span>Possible Upgrades:</span>
                    <span>${permitPlan.costEstimate.possibleUpgrades}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-2 border-t">
                  <span>Total Estimate:</span>
                  <span>${permitPlan.costEstimate.total}</span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-2">Estimated Timeline</h3>
              <p className="text-sm">
                <strong>{permitPlan.estimatedTimeline.total} days</strong> total
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {permitPlan.estimatedTimeline.documentPrep} days for documentation +{' '}
                {permitPlan.estimatedTimeline.permitReview} days permit review +{' '}
                {permitPlan.estimatedTimeline.inspections} days inspections
              </p>
            </div>

            {/* Required Documents */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Required Documentation</h3>
              <div className="space-y-2">
                {permitPlan.requiredDocuments.map((doc: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-start p-3 bg-gray-50 rounded border"
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${
                        doc.status === 'provided'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-300'
                      }`}
                    >
                      {doc.status === 'provided' ? '✓' : '○'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{doc.description}</p>
                      {doc.notes && (
                        <p className="text-xs text-gray-600 mt-1">{doc.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Compliance Issues */}
            {permitPlan.complianceIssues.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Potential Code Issues</h3>
                <div className="space-y-2">
                  {permitPlan.complianceIssues.map((issue: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-3 rounded border ${
                        issue.severity === 'critical'
                          ? 'bg-red-50 border-red-200'
                          : issue.severity === 'major'
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{issue.code}</p>
                          <p className="text-sm">{issue.description}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            <strong>Solution:</strong> {issue.remediation}
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            issue.severity === 'critical'
                              ? 'bg-red-200 text-red-800'
                              : issue.severity === 'major'
                              ? 'bg-yellow-200 text-yellow-800'
                              : 'bg-blue-200 text-blue-800'
                          }`}
                        >
                          {issue.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Steps */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-3">Next Steps</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Review this permit completion plan</li>
                <li>Gather any missing documentation</li>
                <li>Schedule a consultation with our permitting specialist</li>
                <li>We'll prepare and submit your permit application</li>
                <li>Schedule and complete required inspections</li>
                <li>Obtain final approval and Permission to Operate (PTO)</li>
              </ol>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => router.push('/projects')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition"
              >
                View Project Dashboard
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition"
              >
                Print Plan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
