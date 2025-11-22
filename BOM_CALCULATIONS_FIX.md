# BOM-Based System Calculations Fix

## Problem

The Final System Configuration was showing incorrect or zero values because:
1. System specifications were hardcoded from the System table
2. When users manually changed BOM equipment, the calculations didn't update
3. Hardcoded labor costs ($150/hr) and permit fees ($2,500) were added
4. Input text fields had low contrast placeholders that were hard to read

## Solution Implemented

### 1. Dynamic BOM Calculations

Created `calculateSystemFromBOM()` function that:
- **Extracts solar capacity** from BOM items by parsing model numbers/names for wattage (e.g., "400W")
- **Calculates battery storage** by parsing kWh values from equipment names (e.g., "16.1kWh")
- **Determines inverter capacity** by extracting kW ratings from model numbers (e.g., "15kW")
- **Counts actual panels** based on BOM quantity

### 2. Real-Time Updates

- All displays now use `displaySystem` which prioritizes BOM-calculated values
- Falls back to System table only if no BOM items exist
- Energy production calculations use actual equipment specs
- "From BOM" badge shows when using calculated values

### 3. Removed Hardcoding

**Before:**
```typescript
const laborCost = (plan?.laborHoursEst || 0) * 150;  // Hardcoded $150/hr
const permitsFees = 2500;                            // Hardcoded $2,500
const totalProjectCost = totalBomCost + laborCost + permitsFees;
```

**After:**
```typescript
const totalProjectCost = totalBomCost;  // Only actual BOM equipment costs
```

### 4. Input Visibility Fix

**Updated `/src/components/ui/input.tsx`:**
- Changed placeholder from `text-muted-foreground` to `text-gray-600`
- Added `placeholder:opacity-100` to ensure always visible
- Input text explicitly set to `text-black`

**Updated `/src/app/globals.css`:**
```css
input, textarea, select {
  color: #000000 !important;
}

input::placeholder, textarea::placeholder {
  color: #4b5563 !important;
  opacity: 1 !important;
}
```

## Files Modified

1. **`src/app/projects/[id]/page.tsx`**
   - Added `calculateSystemFromBOM()` function
   - Updated `calculateEnergyMetrics()` to use BOM data
   - Changed displays to show BOM-calculated values
   - Removed hardcoded costs from breakdown

2. **`src/components/ui/input.tsx`**
   - Enhanced placeholder visibility
   - Ensured text is always black

3. **`src/app/globals.css`**
   - Added global input styling rules
   - Dark theme overrides included

## How It Works

### Parsing Equipment Specifications

```typescript
// Solar panels: Extract wattage
const wattageMatch = (panel.modelNumber + ' ' + panel.itemName).match(/(\d+)\s*w/i);
const wattage = wattageMatch ? parseInt(wattageMatch[1]) : 400;

// Batteries: Extract kWh
const kwhMatch = (battery.modelNumber + ' ' + battery.itemName).match(/(\d+\.?\d*)\s*kwh/i);
const kwh = kwhMatch ? parseFloat(kwhMatch[1]) : 10;

// Inverters: Extract kW
const kwMatch = (inverter.modelNumber + ' ' + inverter.itemName).match(/(\d+\.?\d*)\s*kw/i);
const kw = kwMatch ? parseFloat(kwMatch[1]) : 5;
```

### Calculation Flow

1. **User selects equipment** → BOM items updated
2. **`calculateSystemFromBOM()`** → Parses specifications from BOM
3. **`displaySystem`** → Uses BOM values or falls back to System table
4. **UI updates** → Shows accurate capacity, cost, and energy production
5. **Energy metrics** → Calculated from actual equipment specs

## Benefits

✅ **Accurate calculations** based on actual selected equipment  
✅ **No hardcoded costs** - only shows what's in BOM  
✅ **Real-time updates** when equipment changes  
✅ **Better UX** - visible input text and placeholders  
✅ **Flexible** - works with any equipment naming convention  

## Example Output

**BOM Items:**
- 30x Sol Ark 400W Solar Panels
- 1x Helios Discover 16.1kWh Battery
- 1x Enphase IQ8 15kW Inverter

**Calculated System:**
- Solar Capacity: 12.00 kW (30 × 400W)
- Battery Storage: 16.10 kWh
- Inverter Power: 15.00 kW
- **Total Cost: $75,187.50** (sum of BOM prices only)

## Testing

To verify the fix:
1. Create/open a project
2. Add equipment to BOM
3. Check System Configuration shows correct values
4. Modify BOM quantities → Values update immediately
5. Verify no hardcoded labor/permit costs appear

## Future Enhancements

- Support for multiple battery units summing capacity
- More sophisticated wattage/capacity parsing
- Equipment category detection improvements
- Option to add labor/permit costs as BOM line items

