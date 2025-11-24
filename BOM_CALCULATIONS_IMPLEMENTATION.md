# BOM Calculations Implementation Summary

## Overview
This document summarizes the implementation to ensure BOM subtotals are correct and energy calculations reflect actual equipment.

## Implementation Complete ✅

### 1. Subtotal Validation ✅

**Location**: `src/lib/bom-calculations.ts`

**Functions**:
- `validateBOMSubtotals(projectId)` - Validates all BOM items
- `getBOMTotalCost(projectId)` - Gets total with validation

**Validation Checks**:
- ✅ `totalPriceUsd = quantity × unitPriceUsd` for each item
- ✅ Quantities are positive
- ✅ Prices are reasonable
- ✅ Auto-corrects mismatches

**Integration**:
- ✅ `/api/bom` (GET) - Returns validation results
- ✅ `/api/bom/add` (POST) - Validates and corrects on add/update
- ✅ BOM page displays validation errors/warnings

### 2. Energy Calculations from BOM ✅

**Location**: `src/lib/energy-calculations.ts`

**Functions**:
- `calculateEnergyProductionFromBOM(projectId)` - Calculates production from actual equipment
- `calculateEnergySavingsFromBOM(projectId)` - Calculates savings
- `updateAnalysisFromBOM(projectId)` - Updates Analysis record

**Features**:
- ✅ Extracts actual equipment specs (wattage, capacity, efficiency)
- ✅ Calculates actual system capacity from BOM
- ✅ Recalculates energy production based on actual specs
- ✅ Updates System and Analysis records

**Integration**:
- ✅ `/api/bom/recalculate` (POST) - Recalculates system and energy
- ✅ BOM page has "Recalculate Energy" button

### 3. System Specs from BOM ✅

**Location**: `src/lib/bom-calculations.ts`

**Functions**:
- `calculateSystemSpecsFromBOM(projectId)` - Extracts actual specs
- `recalculateSystemFromBOM(projectId)` - Updates System record

**Features**:
- ✅ Extracts solar panel wattage from model numbers/names
- ✅ Extracts battery capacity (kWh)
- ✅ Extracts inverter capacity (kW)
- ✅ Calculates actual totals
- ✅ Updates System record with actual values

## Routing Flow (Updated)

### Complete Flow:

```
1. User adds equipment
   ↓
2. AddEquipmentDialog → /api/bom/add
   ↓
3. Validates: totalPriceUsd = quantity × unitPriceUsd
   ↓
4. Creates/updates BOMItem
   ↓
5. BOM page calls /api/bom (GET)
   ↓
6. Returns BOM items + validation results
   ↓
7. User clicks "Recalculate Energy"
   ↓
8. Calls /api/bom/recalculate
   ↓
9. calculateSystemSpecsFromBOM() extracts actual specs
   ↓
10. recalculateSystemFromBOM() updates System record
   ↓
11. calculateEnergyProductionFromBOM() calculates production
   ↓
12. updateAnalysisFromBOM() updates Analysis record
   ↓
13. Energy calculations now reflect actual equipment
```

## How to Ensure Subtotals Are Correct

### Automatic Validation
- ✅ Every time BOM items are fetched, validation runs
- ✅ Mismatches are auto-corrected
- ✅ Warnings shown for unusual values
- ✅ Errors shown for invalid data

### Manual Validation
```typescript
import { validateBOMSubtotals } from "@/lib/bom-calculations";

const validation = await validateBOMSubtotals(projectId);
if (!validation.isValid) {
  console.error("Validation errors:", validation.errors);
}
```

### API Response
```json
{
  "success": true,
  "bomItems": [...],
  "totalCost": 25000.00,
  "validation": {
    "isValid": true,
    "errors": [],
    "warnings": [],
    "correctedItems": []
  }
}
```

## How to Ensure Energy Calculations Reflect Equipment

### Automatic Recalculation
1. Add/update BOM items
2. Click "Recalculate Energy" button
3. System automatically:
   - Extracts actual equipment specs
   - Updates System record
   - Recalculates energy production
   - Updates Analysis record

### Manual Recalculation
```typescript
import { recalculateSystemFromBOM } from "@/lib/bom-calculations";
import { updateAnalysisFromBOM } from "@/lib/energy-calculations";

// Recalculate system specs
const systemResult = await recalculateSystemFromBOM(projectId);

// Update energy calculations
const analysisResult = await updateAnalysisFromBOM(projectId);
```

### API Endpoint
```bash
POST /api/bom/recalculate
{
  "projectId": "xxx",
  "updateAnalysis": true
}
```

## Equipment Spec Extraction

### Current Method
Extracts specs from:
1. Model number (e.g., "400W", "10kWh", "5kW")
2. Item name
3. Notes field

### Patterns Used:
- **Solar Panels**: `/(\d+)\s*w/i` - Extracts wattage
- **Batteries**: `/(\d+\.?\d*)\s*kwh/i` - Extracts capacity
- **Inverters**: `/(\d+\.?\d*)\s*kw/i` - Extracts capacity
- **Efficiency**: `/(\d+\.?\d*)%\s*efficiency/i` - Extracts efficiency

### Fallbacks:
- Solar: 400W default
- Battery: 10kWh default
- Inverter: 5kW default

## Future Improvements

### Phase 1: Store Equipment Specs
Add `specifications` field to BOMItem:
```prisma
model BOMItem {
  specifications String?  // JSON: { wattage, capacity, efficiency }
}
```

### Phase 2: Link to Equipment Table
Add `equipmentId` to BOMItem:
```prisma
model BOMItem {
  equipmentId String?
  equipment   Equipment? @relation(...)
}
```

### Phase 3: Real-time Updates
- Auto-recalculate when BOM changes
- Show energy impact in real-time
- Validate on every change

## Testing

### Test Subtotal Validation
1. Add item with quantity 2, unit price $100
2. Verify totalPriceUsd = $200
3. Manually change totalPriceUsd to $150 in database
4. Fetch BOM - should auto-correct to $200

### Test Energy Recalculation
1. Add solar panels with 500W each (not default 400W)
2. Click "Recalculate Energy"
3. Verify System.totalSolarKw reflects 500W panels
4. Verify energy production is higher

### Test Equipment Spec Extraction
1. Add panel with model "ST-500W-HighEff"
2. Verify extracts 500W correctly
3. Add battery with "PowerWall-13.5kWh"
4. Verify extracts 13.5kWh correctly

## Files Created/Modified

### New Files:
1. `BOM_TO_CALCULATIONS_FLOW.md` - Routing documentation
2. `src/lib/bom-calculations.ts` - BOM calculation utilities
3. `src/lib/energy-calculations.ts` - Energy calculation from BOM
4. `src/app/api/bom/recalculate/route.ts` - Recalculation endpoint
5. `BOM_CALCULATIONS_IMPLEMENTATION.md` - This file

### Modified Files:
1. `src/app/api/bom/route.ts` - Added validation
2. `src/app/api/bom/add/route.ts` - Added validation and correction
3. `src/app/wizard/[projectId]/bom/page.tsx` - Added validation display and recalculation button

## Usage

### For Users:
1. Add equipment to BOM
2. System automatically validates subtotals
3. Click "Recalculate Energy" to update calculations
4. View validation warnings/errors if any

### For Developers:
```typescript
// Validate BOM
const validation = await validateBOMSubtotals(projectId);

// Recalculate from BOM
const systemResult = await recalculateSystemFromBOM(projectId);
const energyResult = await calculateEnergyProductionFromBOM(projectId);
```

## Status: ✅ Complete

All functionality implemented and tested. Subtotals are validated automatically, and energy calculations can be updated to reflect actual BOM equipment.


