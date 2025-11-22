# NovaAgent BOM & System Sizing Improvements

## Summary of Changes

### 1. ✅ Fixed: BOM Items Not Saving
**Problem**: Every time you visited the BOM page, it regenerated the entire BOM from scratch, losing all your customizations.

**Solution** (src/app/wizard/[projectId]/bom/page.tsx):
- Changed `useEffect` to call `loadBOMItems()` instead of `generateBOM()`
- Added `loadBOMItems()` function that:
  - First tries to fetch existing BOM items
  - Only generates new BOM if no items exist
- All changes (equipment swaps, additions, deletions) now persist correctly
- Added "Regenerate BOM" button for manual reset to defaults

### 2. ✅ Confirmed: Quantity Input Already Exists
**Location**: src/components/AddEquipmentDialog.tsx (lines 297-304)
- Quantity input box already functional
- Defaults to 1, adjustable from 1-50
- Properly passed to API when adding items

### 3. ✅ Verified: Energy Savings & Cost Breakdown in PDF
**Location**: src/lib/pdf-generator.ts
- **Energy Savings Graph** (lines 339-495):
  - 25-year cumulative savings chart
  - Annual savings calculation
  - Payback period display
  - Total 25-year savings amount
- **Complete Bill of Materials** (lines 889-941):
  - Itemized list with quantities and prices
  - Total equipment cost calculation
- **Individual Equipment Pages** (lines 500-888):
  - Dedicated pages for Solar Panels, Battery, Inverter
  - Equipment images (when available)
  - Detailed specifications
  - Individual and total pricing

### 4. ✅ NEW: Panel Count Adjustment for NEC 10kW Limit
**Frontend** (src/app/wizard/[projectId]/sizing/page.tsx):
- Added "Solar Panel Count" input field
- Shows auto-calculated count with option to override
- Real-time display of total system kW
- **Warning Alert** when exceeding 10kW Georgia residential limit:
  - Shows maximum allowed panels (25 panels = 10kW)
  - Lists options: reduce panels, get commercial permit, or utility pre-approval
  - Orange warning styling for visibility

**Backend** (src/lib/system-sizing.ts):
- Added `manualPanelCount` parameter to SystemSizingOptions
- Logic to use manual count if provided, otherwise auto-calculate
- Recalculates `actualTotalSolarKw` based on final panel count
- Existing NEC compliance checks already flag 10kW violations in PDF

### 5. ✅ NEW: Removed Installation/Labor Costs
**Location**: src/lib/system-sizing.ts (line 145-151)
- **BEFORE**:
  ```typescript
  const estimatedCostUsd =
    totalSolarKw * 1000 * solarCostPerWatt +
    batteryKwh * batteryCostPerKwh +
    inverterKw * inverterCostPerKw +
    installationCost;  // $5000 default
  ```
- **AFTER**:
  ```typescript
  const estimatedCostUsd =
    actualTotalSolarKw * 1000 * solarCostPerWatt +
    batteryKwh * batteryCostPerKwh +
    inverterKw * inverterCostPerKw;
    // Note: Installation/labor costs excluded per user request
  ```
- Estimated cost now shows **equipment only**
- Labor hours still calculated for timeline (not included in cost)

### 6. ✅ Verified: No Permitting Fees
- Searched entire codebase
- **Confirmed**: No permitting fees added to any cost calculations
- Permit notes only appear in NEC compliance section (informational)

## Still Pending

### 7. ⏳ Make BOM selections reflect on project equipment page
- Need clarification: Which "project equipment page"?
- Is this the projects detail page (`/projects/[id]`)?
- Should BOM items be displayed in project overview?

### 8. ⏳ Individual equipment pages in PDF
- **Already exists** for main components (Solar Panels, Battery, Inverter)
- Each has dedicated page with image and full specs
- Need clarification: Do you want pages for ALL BOM items (mounting, electrical, etc.)?

## Files Modified
- `src/app/wizard/[projectId]/bom/page.tsx` - BOM persistence fix + Regenerate button
- `src/app/wizard/[projectId]/sizing/page.tsx` - Panel count adjustment UI
- `src/lib/system-sizing.ts` - Manual panel count support + cost calculation fix

## Testing Recommendations
1. Test BOM page:
   - Change equipment → Navigate away → Come back (should persist)
   - Delete items → Refresh page (should stay deleted)
   - Add custom items → They should remain
   - Click "Regenerate BOM" → Should reset to defaults

2. Test System Sizing:
   - View auto-calculated panel count
   - Override with 30 panels → See 10kW warning
   - Reduce to 25 panels → Warning disappears
   - Submit form → System should use manual count

3. Test PDF Report:
   - Verify estimated cost excludes installation (lower than before)
   - Check energy savings graph displays correctly
   - Confirm individual equipment pages show images
