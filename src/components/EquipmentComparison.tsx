'use client';

/**
 * Equipment Comparison Component
 * Side-by-side comparison of solar panels, inverters, and batteries
 */

import { useState } from 'react';
import { Card } from './ui/card';

interface Equipment {
  id: string;
  manufacturer: string;
  model: string;
  category: 'solar_panel' | 'inverter' | 'battery';
  price: number;
  specifications: {
    power?: number; // Watts for panels, kW for inverters
    efficiency?: number; // Percentage
    warranty?: number; // Years
    capacity?: number; // kWh for batteries
    voltage?: number;
    certifications?: string[];
    dimensions?: { length: number; width: number; height: number };
    weight?: number; // kg
  };
  pros: string[];
  cons: string[];
  rating: number; // 0-5
  availability: 'in_stock' | 'limited' | 'backordered';
}

interface EquipmentComparisonProps {
  category: 'solar_panel' | 'inverter' | 'battery';
  equipment: Equipment[];
  onSelect?: (equipment: Equipment) => void;
}

export default function EquipmentComparison({
  category,
  equipment,
  onSelect,
}: EquipmentComparisonProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((sid) => sid !== id));
    } else {
      if (selectedIds.length < 3) {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  const selectedEquipment = equipment.filter((eq) =>
    selectedIds.includes(eq.id)
  );

  const getCategoryLabel = () => {
    switch (category) {
      case 'solar_panel':
        return 'Solar Panels';
      case 'inverter':
        return 'Inverters';
      case 'battery':
        return 'Batteries';
    }
  };

  const getSpecLabel = (key: string) => {
    const labels: Record<string, string> = {
      power: 'Power Output',
      efficiency: 'Efficiency',
      warranty: 'Warranty',
      capacity: 'Capacity',
      voltage: 'Voltage',
      certifications: 'Certifications',
      weight: 'Weight',
    };
    return labels[key] || key;
  };

  const formatSpecValue = (key: string, value: any) => {
    if (key === 'power') {
      return category === 'solar_panel' ? `${value}W` : `${value}kW`;
    }
    if (key === 'efficiency') return `${value}%`;
    if (key === 'warranty') return `${value} years`;
    if (key === 'capacity') return `${value} kWh`;
    if (key === 'voltage') return `${value}V`;
    if (key === 'weight') return `${value} kg`;
    if (key === 'certifications') return value.join(', ');
    if (key === 'dimensions')
      return `${value.length} × ${value.width} × ${value.height} cm`;
    return value;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Compare {getCategoryLabel()}
        </h2>
        <p className="text-gray-600 mt-1">
          Select up to 3 products to compare side-by-side
        </p>
      </div>

      {/* Equipment Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {equipment.map((eq) => (
          <Card
            key={eq.id}
            className={`p-4 cursor-pointer transition-all ${
              selectedIds.includes(eq.id)
                ? 'ring-2 ring-blue-500 bg-blue-50'
                : 'hover:shadow-lg'
            }`}
            onClick={() => toggleSelection(eq.id)}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {eq.manufacturer}
                </h3>
                <p className="text-sm text-gray-600">{eq.model}</p>
              </div>
              {selectedIds.includes(eq.id) && (
                <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                  ✓
                </div>
              )}
            </div>

            <div className="space-y-2 text-sm">
              {eq.specifications.power && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Power:</span>
                  <span className="font-medium">
                    {formatSpecValue('power', eq.specifications.power)}
                  </span>
                </div>
              )}
              {eq.specifications.efficiency && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Efficiency:</span>
                  <span className="font-medium">
                    {formatSpecValue('efficiency', eq.specifications.efficiency)}
                  </span>
                </div>
              )}
              {eq.specifications.capacity && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Capacity:</span>
                  <span className="font-medium">
                    {formatSpecValue('capacity', eq.specifications.capacity)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Price:</span>
                <span className="font-bold text-green-600">
                  ${eq.price.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-4 h-4 ${
                      i < eq.rating ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span
                className={`text-xs px-2 py-1 rounded ${
                  eq.availability === 'in_stock'
                    ? 'bg-green-100 text-green-800'
                    : eq.availability === 'limited'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {eq.availability === 'in_stock'
                  ? 'In Stock'
                  : eq.availability === 'limited'
                  ? 'Limited'
                  : 'Backordered'}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Comparison Table */}
      {selectedEquipment.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">Detailed Comparison</h3>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Feature
                  </th>
                  {selectedEquipment.map((eq) => (
                    <th
                      key={eq.id}
                      className="text-center py-3 px-4 font-semibold text-gray-700"
                    >
                      <div>{eq.manufacturer}</div>
                      <div className="text-sm font-normal text-gray-600">
                        {eq.model}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Price */}
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium">Price</td>
                  {selectedEquipment.map((eq) => (
                    <td
                      key={eq.id}
                      className="text-center py-3 px-4 font-bold text-green-600"
                    >
                      ${eq.price.toLocaleString()}
                    </td>
                  ))}
                </tr>

                {/* Specifications */}
                {Object.keys(selectedEquipment[0].specifications).map(
                  (specKey) => (
                    <tr key={specKey} className="border-b border-gray-100">
                      <td className="py-3 px-4 font-medium">
                        {getSpecLabel(specKey)}
                      </td>
                      {selectedEquipment.map((eq) => (
                        <td key={eq.id} className="text-center py-3 px-4">
                          {formatSpecValue(
                            specKey,
                            eq.specifications[
                              specKey as keyof typeof eq.specifications
                            ]
                          )}
                        </td>
                      ))}
                    </tr>
                  )
                )}

                {/* Pros */}
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium align-top">Pros</td>
                  {selectedEquipment.map((eq) => (
                    <td key={eq.id} className="py-3 px-4">
                      <ul className="text-sm space-y-1">
                        {eq.pros.map((pro, idx) => (
                          <li key={idx} className="text-green-700">
                            ✓ {pro}
                          </li>
                        ))}
                      </ul>
                    </td>
                  ))}
                </tr>

                {/* Cons */}
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium align-top">Cons</td>
                  {selectedEquipment.map((eq) => (
                    <td key={eq.id} className="py-3 px-4">
                      <ul className="text-sm space-y-1">
                        {eq.cons.map((con, idx) => (
                          <li key={idx} className="text-red-700">
                            ✗ {con}
                          </li>
                        ))}
                      </ul>
                    </td>
                  ))}
                </tr>

                {/* Rating */}
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium">Rating</td>
                  {selectedEquipment.map((eq) => (
                    <td key={eq.id} className="text-center py-3 px-4">
                      <div className="flex justify-center">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-5 h-5 ${
                              i < eq.rating
                                ? 'text-yellow-400'
                                : 'text-gray-300'
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {eq.rating}/5
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Availability */}
                <tr>
                  <td className="py-3 px-4 font-medium">Availability</td>
                  {selectedEquipment.map((eq) => (
                    <td key={eq.id} className="text-center py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded text-sm ${
                          eq.availability === 'in_stock'
                            ? 'bg-green-100 text-green-800'
                            : eq.availability === 'limited'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {eq.availability === 'in_stock'
                          ? 'In Stock'
                          : eq.availability === 'limited'
                          ? 'Limited Stock'
                          : 'Backordered'}
                      </span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Select Buttons */}
          {onSelect && (
            <div className="flex gap-4 mt-6">
              {selectedEquipment.map((eq) => (
                <button
                  key={eq.id}
                  onClick={() => onSelect(eq)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition duration-200"
                >
                  Select {eq.manufacturer}
                </button>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
