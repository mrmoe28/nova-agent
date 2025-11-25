# Solar Calculator Enhancements - Complete Guide

This document describes all 8 major enhancements added to the solar calculator system.

## Table of Contents
1. [System Comparison Mode](#1-system-comparison-mode)
2. [Google Sunroof Integration](#2-google-sunroof-integration)
3. [Financing Calculator](#3-financing-calculator)
4. [OpenEI Utility Rate Integration](#4-openei-utility-rate-integration)
5. [3D Roof Designer](#5-3d-roof-designer)
6. [Quick Estimate Mode](#6-quick-estimate-mode)
7. [Equipment Comparison](#7-equipment-comparison)
8. [Sensitivity Analysis](#8-sensitivity-analysis)

---

## 1. System Comparison Mode

**Location:** `src/lib/services/system-comparison.ts`

### Description
Generates three different system sizing options (small/medium/large) with comprehensive ROI comparison.

### Features
- **Small (75% offset)**: Budget-friendly with faster payback
- **Medium (100% offset)**: Eliminates electric bill entirely
- **Large (125% offset)**: Maximum production with net metering credits

### API Endpoint
```
GET /api/system-comparison?projectId={projectId}
```

### Response Example
```json
{
  "success": true,
  "data": {
    "options": [
      {
        "size": "small",
        "label": "75% Offset",
        "solarSizeKw": 7.5,
        "panelCount": 19,
        "systemCost": 18500,
        "paybackPeriod": 8.2,
        "roi25Year": 245
      },
      ...
    ],
    "recommendedOption": "medium"
  }
}
```

### Usage in Your App
```typescript
import { systemComparisonService } from '@/lib/services/system-comparison';

const comparison = await systemComparisonService.generateComparison(projectId);
```

---

## 2. Google Sunroof Integration

**Location:** `src/lib/services/google-sunroof.ts`

### Description
Integrates with Google's Solar API for automatic roof analysis, shading detection, and accurate solar potential calculations.

### Setup
1. Get API key from [Google Cloud Console](https://console.cloud.google.com)
2. Enable the Solar API
3. Add to `.env.local`:
```bash
GOOGLE_SUNROOF_API_KEY=your_api_key_here
```

### Features
- Automatic roof area calculation
- Shading factor detection
- Optimal panel layout suggestions
- Azimuth and tilt recommendations
- Satellite imagery analysis

### Usage
```typescript
import { googleSunroofService } from '@/lib/services/google-sunroof';

// Analyze a roof
const analysis = await googleSunroofService.analyzeRoof('123 Main St, Atlanta, GA');

console.log(analysis);
// {
//   roofArea: 2000,
//   usableRoofArea: 1600,
//   maxPanelCount: 50,
//   maxSystemSizeKw: 20,
//   averageAzimuth: 180,
//   averageTilt: 25,
//   shadingFactor: 0.85,
//   estimatedAnnualProductionKwh: 25000
// }
```

### Limitations
- Requires valid API key (has free tier)
- Coverage may vary by location
- Imagery may be outdated in some areas

---

## 3. Financing Calculator

**Location:** `src/lib/services/financing-calculator.ts`

### Description
Comprehensive financing options comparison including cash, loans, leases, and Power Purchase Agreements (PPA).

### Financing Options

#### Cash Purchase
- 30% federal tax credit applied
- Best long-term ROI
- Immediate ownership

#### Loans
- 10-year at 4.99%
- 15-year at 5.99%
- 20-year at 6.99%
- No money down
- Monthly payment vs. electric savings

#### Solar Lease
- $0 down
- Fixed monthly payment (with escalator)
- No ownership
- No tax credit

#### Power Purchase Agreement (PPA)
- $0 down
- Pay only for energy produced
- Rate per kWh (below utility rate)
- No ownership

### Usage
```typescript
import { financingCalculatorService } from '@/lib/services/financing-calculator';

const options = financingCalculatorService.calculateFinancingOptions(
  systemCost: 30000,
  annualProduction: 12000,
  annualSavings: 1500
);

// Returns all financing options with comparison metrics
console.log(options.recommendedOption); // "10-Year Loan (4.99%)"
```

### Comparison Metrics
- Upfront cost
- Monthly payment
- Payback period
- 25-year total cost
- Ownership rights
- Tax credit eligibility

---

## 4. OpenEI Utility Rate Integration

**Location:** `src/lib/services/openei-rates.ts`

### Description
Fetches real utility tariff data from the OpenEI database instead of using estimates. Provides accurate rate structures including time-of-use and demand charges.

### Setup
1. Get API key from [OpenEI](https://openei.org/services/api/signup/)
2. Add to `.env.local`:
```bash
OPENEI_API_KEY=your_api_key_here
```

**Note:** Works with `DEMO_KEY` but has rate limits.

### Features
- Real utility rate data for 3,000+ utilities
- Time-of-use (TOU) rate structures
- Demand charge detection
- Rate effective dates
- Multiple rate options per utility

### Usage
```typescript
import { openEIRatesService } from '@/lib/services/openei-rates';

// Get rates by address
const rates = await openEIRatesService.getRatesByAddress(
  '123 Main St, Atlanta, GA 30301',
  'Residential'
);

// Get best rate automatically
const bestRate = await openEIRatesService.getBestRateForLocation(
  '123 Main St, Atlanta, GA 30301'
);

console.log(bestRate);
// {
//   utilityName: "Georgia Power",
//   tariffName: "Residential Service",
//   averageEnergyRate: 0.12,
//   fixedMonthlyCharge: 12,
//   hasTimeOfUse: true,
//   onPeakRate: 0.15,
//   offPeakRate: 0.08
// }

// Calculate bill
const bill = openEIRatesService.calculateBill(bestRate, 1000, 5);
console.log(bill);
// {
//   energyCharges: 120,
//   demandCharges: 0,
//   fixedCharges: 12,
//   totalBill: 132
// }
```

---

## 5. 3D Roof Designer

**Location:** `src/components/RoofDesigner3D.tsx`

### Description
Interactive visual tool for placing and arranging solar panels on a roof. Uses HTML5 Canvas for lightweight rendering.

### Features
- **2D View**: Top-down roof layout
- **3D View**: Perspective view with tilt
- **Interactive**:
  - Click to select panels
  - Drag to reposition
  - Rotate panels 90°
  - Add/remove panels
  - Auto-layout generation

### Usage in React
```tsx
import RoofDesigner3D from '@/components/RoofDesigner3D';

function MyComponent() {
  const handleLayoutChange = (panels) => {
    console.log('New layout:', panels);
  };

  return (
    <RoofDesigner3D
      roofDimensions={{
        width: 40,      // feet
        height: 30,     // feet
        azimuth: 180,   // degrees (south-facing)
        tilt: 25        // degrees
      }}
      panelCount={25}
      onLayoutChange={handleLayoutChange}
    />
  );
}
```

### Controls
- **Add Panel**: Adds new panel to roof
- **Rotate Selected**: Rotates selected panel 90°
- **Delete Selected**: Removes selected panel
- **Reset Layout**: Returns to auto-generated layout
- **2D/3D Toggle**: Switches between view modes

### Display Features
- Compass rose showing roof orientation
- Grid overlay for easy alignment
- Panel cell visualization
- Coverage percentage
- Real-time system size calculation

---

## 6. Quick Estimate Mode

**Location:** `src/app/quick-estimate/page.tsx`

### Description
Single-page instant solar quote tool that provides immediate estimates without requiring full project creation.

### Access
Navigate to: `/quick-estimate`

### Input Fields
- Property address
- Average monthly electric bill ($)
- Average monthly usage (kWh)

### Output
- System size (kW)
- Panel count
- Battery size
- Estimated cost (before and after tax credit)
- Annual production (kWh)
- Annual savings
- Payback period
- 25-year ROI
- Offset percentage

### API Endpoint
```
POST /api/quick-estimate
```

### Request Body
```json
{
  "address": "123 Main St, Atlanta, GA 30301",
  "monthlyBill": 150,
  "monthlyUsageKwh": 1000
}
```

### Use Cases
- Lead generation
- Initial customer qualification
- Quick ballpark estimates
- Marketing landing page

---

## 7. Equipment Comparison

**Location:** `src/components/EquipmentComparison.tsx`

### Description
Side-by-side comparison tool for solar panels, inverters, and batteries. Compare up to 3 products at once.

### Features
- Visual comparison cards
- Detailed specification table
- Pros and cons listing
- Star ratings
- Availability status
- Price comparison
- Filtering by category

### Usage
```tsx
import EquipmentComparison from '@/components/EquipmentComparison';

const equipment = [
  {
    id: '1',
    manufacturer: 'LG',
    model: 'NeON 2',
    category: 'solar_panel',
    price: 250,
    specifications: {
      power: 400,
      efficiency: 21.7,
      warranty: 25,
    },
    pros: ['High efficiency', 'Reliable brand', 'Good warranty'],
    cons: ['Higher price', 'Longer lead time'],
    rating: 4.5,
    availability: 'in_stock'
  },
  // ... more equipment
];

function MyComponent() {
  return (
    <EquipmentComparison
      category="solar_panel"
      equipment={equipment}
      onSelect={(selected) => console.log('Selected:', selected)}
    />
  );
}
```

### Comparison Metrics
- Price
- Power output / capacity
- Efficiency
- Warranty length
- Certifications
- Physical dimensions
- Weight
- Pros and cons
- User ratings
- Stock availability

---

## 8. Sensitivity Analysis

**Location:** `src/lib/services/sensitivity-analysis.ts`

### Description
Advanced financial modeling tool that shows how ROI changes under different scenarios. Includes Monte Carlo simulation.

### Scenarios Analyzed

1. **Best Case**
   - High utility rate escalation (5%)
   - Low degradation (0.3%)
   - Higher electricity rates (+20%)

2. **Expected Case**
   - Standard assumptions
   - Typical degradation (0.5%)
   - Current electricity rates

3. **Worst Case**
   - Low utility rate escalation (1%)
   - High degradation (0.8%)
   - Lower electricity rates (-20%)

4. **Flat Rates**
   - No utility rate increases
   - Standard degradation

5. **High Degradation**
   - Faster system degradation (1%)
   - Standard other parameters

### Parameter Sensitivity (Tornado Chart Data)
Shows impact of each parameter on NPV:
- Utility rate escalation
- Electricity rate
- System degradation
- Discount rate
- O&M costs

### Monte Carlo Simulation
- 1,000 iterations
- Random sampling from parameter distributions
- Statistical outcomes:
  - Mean ROI
  - Median ROI
  - Standard deviation
  - Confidence intervals (P10, P50, P90)
  - Probability of positive ROI

### Usage
```typescript
import { sensitivityAnalysisService } from '@/lib/services/sensitivity-analysis';

const analysis = sensitivityAnalysisService.performAnalysis(
  systemCost: 30000,
  systemSizeKw: 10,
  annualProduction: 12000,
  baseElectricityRate: 0.12
);

console.log(analysis.scenarios);
// [
//   {
//     scenario: "Best Case",
//     paybackPeriod: 6.5,
//     roi25Year: 285,
//     netPresentValue: 25000
//   },
//   ...
// ]

console.log(analysis.monteCarlo);
// {
//   meanROI: 175,
//   medianROI: 168,
//   probabilityOfPositiveROI: 95.3
// }
```

### Visualization Recommendations
- Bar chart for scenario comparison
- Tornado chart for parameter sensitivity
- Histogram for Monte Carlo distribution
- Line chart for cumulative probability

---

## Configuration & Environment Variables

All enhancements respect the existing configuration system in `src/lib/config.ts`.

### New Environment Variables

```bash
# Google Sunroof API
GOOGLE_SUNROOF_API_KEY=your_google_api_key

# OpenEI Utility Rates
OPENEI_API_KEY=your_openei_api_key

# Financial Parameters (optional overrides)
FEDERAL_TAX_CREDIT=0.30
DISCOUNT_RATE=0.06
SYSTEM_LIFE_YEARS=25
UTILITY_ESCALATION=0.025
OANDM_COST_PER_KW=20
```

### Existing Parameters Still Apply
All SYSTEM_SIZING parameters continue to work:
- SOLAR_SIZING_FACTOR
- PEAK_SUN_HOURS
- SOLAR_PANEL_WATTAGE
- BATTERY_OVERHEAD
- INVERTER_MULTIPLIER
- SOLAR_COST_PER_WATT
- BATTERY_COST_PER_KWH
- INVERTER_COST_PER_KW
- INSTALLATION_BASE_COST

---

## Integration Examples

### Example 1: Complete Quote Flow
```typescript
// 1. Quick estimate
const quickEstimate = await fetch('/api/quick-estimate', {
  method: 'POST',
  body: JSON.stringify({
    address: '123 Main St',
    monthlyBill: 150,
    monthlyUsageKwh: 1000
  })
});

// 2. Get comparison options
const comparison = await systemComparisonService.generateComparison(projectId);

// 3. Analyze roof (if Google Sunroof available)
const roofAnalysis = await googleSunroofService.analyzeRoof(address);

// 4. Get real utility rates
const utilityRate = await openEIRatesService.getBestRateForLocation(address);

// 5. Show financing options
const financing = financingCalculatorService.calculateFinancingOptions(
  systemCost,
  annualProduction,
  annualSavings
);

// 6. Perform sensitivity analysis
const sensitivity = sensitivityAnalysisService.performAnalysis(
  systemCost,
  systemSizeKw,
  annualProduction,
  utilityRate.averageEnergyRate
);
```

### Example 2: Custom Sizing with Roof Designer
```tsx
import RoofDesigner3D from '@/components/RoofDesigner3D';
import EquipmentComparison from '@/components/EquipmentComparison';

function CustomSizingPage() {
  const [panels, setPanels] = useState([]);
  const [selectedPanel, setSelectedPanel] = useState(null);

  return (
    <div>
      {/* Visual panel placement */}
      <RoofDesigner3D
        roofDimensions={{ width: 40, height: 30, azimuth: 180, tilt: 25 }}
        panelCount={25}
        onLayoutChange={setPanels}
      />

      {/* Equipment selection */}
      <EquipmentComparison
        category="solar_panel"
        equipment={availablePanels}
        onSelect={setSelectedPanel}
      />

      {/* System summary with sensitivity */}
      <SystemSummary
        panels={panels}
        selectedPanel={selectedPanel}
      />
    </div>
  );
}
```

---

## Performance Considerations

### Caching Strategies
1. **PVWatts/Google Sunroof**: Cache results by location
2. **OpenEI Rates**: Cache for 30 days
3. **Sensitivity Analysis**: Cache by system parameters

### Optimization Tips
1. Lazy load 3D designer (dynamic import)
2. Debounce roof designer updates
3. Batch equipment comparisons
4. Pre-calculate common scenarios

---

## Testing

### Manual Testing Checklist
- [ ] System comparison generates 3 options
- [ ] Google Sunroof returns roof analysis
- [ ] Financing calculator shows all 4 options
- [ ] OpenEI finds utility rates
- [ ] 3D roof designer allows drag & drop
- [ ] Quick estimate page loads and calculates
- [ ] Equipment comparison shows 3 products
- [ ] Sensitivity analysis runs all scenarios

### API Testing
```bash
# Test quick estimate
curl -X POST http://localhost:3002/api/quick-estimate \
  -H "Content-Type: application/json" \
  -d '{"address":"123 Main St, Atlanta, GA","monthlyBill":150,"monthlyUsageKwh":1000}'

# Test system comparison
curl http://localhost:3002/api/system-comparison?projectId=YOUR_PROJECT_ID
```

---

## Troubleshooting

### Common Issues

1. **Google Sunroof API fails**
   - Check API key is valid
   - Verify API is enabled in Google Cloud Console
   - Check location coverage (may not be available everywhere)

2. **OpenEI returns no results**
   - Address may be too vague (try adding zip code)
   - Use coordinates instead: `getRatesByCoordinates(lat, lon)`
   - Check if utility serves that area

3. **3D Roof Designer not rendering**
   - Check canvas dimensions are valid
   - Verify roof dimensions are reasonable
   - Clear browser cache

4. **Sensitivity analysis takes too long**
   - Reduce Monte Carlo iterations (default 1000)
   - Skip Monte Carlo for faster results

---

## Future Enhancements

Potential additions:
1. Real-time shading simulation
2. Weather integration for production forecasting
3. Smart home integration for load profiling
4. AI-powered equipment recommendations
5. Multi-building portfolio analysis
6. Real-time energy market pricing
7. Battery dispatch optimization
8. Virtual reality roof walkthroughs

---

## Support & Documentation

- API Documentation: See individual service files
- Component Props: Check TypeScript interfaces
- Configuration: `src/lib/config.ts`
- Type Definitions: `src/types/energy.ts`

For questions or issues, check the code comments or create a GitHub issue.

---

**All 8 enhancements are now live and ready to use!**
