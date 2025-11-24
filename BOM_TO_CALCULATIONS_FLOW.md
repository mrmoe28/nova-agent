# BOM to Calculations Routing Flow

## Overview
This document explains how data flows from the BOM list to the calculation engine ("brain") and how to ensure calculations accurately reflect the selected equipment.

## Current Routing Flow

### 1. BOM List (Frontend)
**Location**: `src/app/wizard/[projectId]/bom/page.tsx`

```
User adds equipment → AddEquipmentDialog → /api/bom/add → BOMItem created
```

**Subtotal Calculation**:
```typescript
// Line 34: Simple sum of all BOM items
const totalCost = bomItems.reduce((sum, item) => sum + item.totalPriceUsd, 0);
```

**Issues**:
- ✅ Subtotal is calculated correctly (sum of `totalPriceUsd`)
- ⚠️ No validation that `totalPriceUsd = quantity × unitPriceUsd`
- ⚠️ No recalculation when equipment changes

### 2. BOM API Routes

#### `/api/bom/add` (POST)
**Location**: `src/app/api/bom/add/route.ts`

**Flow**:
1. Receives `projectId`, `equipmentId`, `quantity`
2. Fetches equipment from database
3. Checks if equipment already exists in BOM (by model number + manufacturer)
4. If exists: Updates quantity and recalculates `totalPriceUsd`
5. If new: Creates new BOMItem with copied equipment data

**Calculation**:
```typescript
// Line 53: totalPriceUsd = (existingQuantity + newQuantity) × unitPriceUsd
totalPriceUsd: (existingBOMItem.quantity + quantity) * existingBOMItem.unitPriceUsd
```

**Issues**:
- ⚠️ Equipment specs are copied but link to Equipment table is lost
- ⚠️ No validation that specs match actual equipment

#### `/api/bom` (GET)
**Location**: `src/app/api/bom/route.ts`

**Flow**:
1. Fetches all BOMItems for project
2. Calculates total cost: `sum(item.totalPriceUsd)`
3. Returns BOM items and total

**Issues**:
- ✅ Total calculation is correct
- ⚠️ No validation of individual item calculations

### 3. System Sizing (Calculation Engine)
**Location**: `src/lib/system-sizing.ts`

**Flow**:
1. `performSystemSizing()` calculates system requirements based on:
   - Monthly usage from Analysis
   - Backup duration
   - Critical load
2. Creates/updates System record with:
   - `totalSolarKw`
   - `batteryKwh`
   - `inverterKw`
   - `solarPanelCount`

**Issues**:
- ⚠️ Uses calculated values, NOT actual BOM equipment
- ⚠️ Energy calculations use System defaults, not BOM equipment specs
- ⚠️ No link between BOM items and System calculations

### 4. Energy Calculations

**Current State**:
- Energy calculations use `System.totalSolarKw` (calculated, not actual)
- No recalculation when BOM equipment changes
- Equipment specs (wattage, efficiency) are extracted from model numbers (fragile)

**Location**: `src/app/projects/[id]/page.tsx` - `calculateSystemFromBOM()`

**Issues**:
- ⚠️ Tries to extract wattage from model number: `/(\d+)\s*w/i`
- ⚠️ Falls back to defaults (400W, 10kWh) if extraction fails
- ⚠️ Not used in actual energy calculations

## Problems Identified

### 1. Subtotal Validation
- ✅ Calculation is correct (simple sum)
- ⚠️ No validation that `totalPriceUsd = quantity × unitPriceUsd` for each item
- ⚠️ No recalculation when unit price changes

### 2. Energy Calculations Don't Reflect Equipment
- ⚠️ Energy calculations use System defaults, not actual BOM equipment
- ⚠️ Equipment specs (wattage, efficiency) not stored in BOMItem
- ⚠️ No way to get actual equipment specs for calculations

### 3. Missing Equipment Link
- ⚠️ BOMItem doesn't have `equipmentId` field
- ⚠️ Can't easily fetch equipment specs for calculations
- ⚠️ Equipment changes don't update BOM calculations

## Solutions

### Solution 1: Add Equipment Link to BOMItem

**Schema Change** (Optional):
```prisma
model BOMItem {
  // ... existing fields ...
  equipmentId String?  // Link to Equipment table
  equipment   Equipment? @relation(fields: [equipmentId], references: [id])
}
```

**Benefits**:
- Can fetch actual equipment specs
- Equipment changes can update BOM
- Better data integrity

### Solution 2: Store Equipment Specs in BOMItem

**Schema Change**:
```prisma
model BOMItem {
  // ... existing fields ...
  specifications String?  // JSON: { wattage, capacity, efficiency, etc. }
}
```

**Benefits**:
- Specs available without Equipment lookup
- Historical accuracy (if equipment changes)
- Faster calculations

### Solution 3: Recalculate Energy from BOM

**New Function**: `recalculateEnergyFromBOM(projectId)`

**Flow**:
1. Fetch all BOM items
2. Extract actual equipment specs
3. Calculate actual system capacity
4. Recalculate energy production
5. Update System record

### Solution 4: Validate Subtotals

**New Function**: `validateBOMSubtotals(bomItems)`

**Checks**:
- `totalPriceUsd = quantity × unitPriceUsd` for each item
- Total cost matches sum of items
- Quantities are positive
- Prices are reasonable

## Recommended Implementation

### Phase 1: Immediate Fixes (No Schema Changes)

1. **Add Subtotal Validation**
   - Validate each item: `totalPriceUsd = quantity × unitPriceUsd`
   - Recalculate if mismatch
   - Show warnings to user

2. **Extract Equipment Specs Properly**
   - Parse specifications JSON from Equipment
   - Store in BOMItem.notes or new field
   - Use for energy calculations

3. **Recalculate Energy from BOM**
   - New function to calculate actual system capacity from BOM
   - Update System record when BOM changes
   - Use actual specs for energy calculations

### Phase 2: Schema Enhancements (Optional)

1. **Add equipmentId to BOMItem**
   - Link BOM items to Equipment table
   - Enable automatic updates
   - Better data integrity

2. **Add specifications field**
   - Store equipment specs in BOMItem
   - Historical accuracy
   - Faster calculations

## Implementation Files

### Files to Modify:
1. `src/app/api/bom/add/route.ts` - Add validation
2. `src/app/api/bom/route.ts` - Add validation
3. `src/lib/system-sizing.ts` - Add recalculation function
4. `src/app/wizard/[projectId]/bom/page.tsx` - Add validation display

### New Files:
1. `src/lib/bom-calculations.ts` - BOM calculation utilities
2. `src/lib/energy-calculations.ts` - Energy calculation from BOM


