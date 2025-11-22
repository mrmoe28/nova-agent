# Default Equipment Configuration Guide

## Overview

The system automatically selects equipment when generating Bills of Materials (BOMs). You can now configure which equipment gets selected by default instead of relying on the first available item.

## Configuration Files

### Main Configuration: `src/lib/default-equipment-config.ts`

This file contains all the preferences for selecting default equipment. Edit this file to change which equipment items are automatically selected.

## How to Configure Default Equipment

### 1. Basic Configuration

Open `src/lib/default-equipment-config.ts` and edit the `DEFAULT_EQUIPMENT_CONFIG` object:

```typescript
export const DEFAULT_EQUIPMENT_CONFIG: DefaultEquipmentConfig = {
  solarPanel: {
    manufacturer: "Trina",
    // This will select any Trina solar panel
  },
  
  battery: {
    namePattern: "Powerwall",
    // This will select batteries with "Powerwall" in the name
  },
  
  inverter: {
    modelNumber: "IQ8",
    // This will select inverters with "IQ8" in the model number
  },
};
```

### 2. Available Preference Options

For each equipment category, you can specify:

| Option | Description | Example |
|--------|-------------|---------|
| `manufacturer` | Match manufacturer name (case-insensitive) | `"Enphase"` |
| `modelNumber` | Match model number (case-insensitive) | `"IQ8PLUS"` |
| `namePattern` | Match text in product name (case-insensitive) | `"bifacial"` |
| `minPrice` | Minimum unit price | `100` |
| `maxPrice` | Maximum unit price | `500` |
| `distributorName` | Match distributor name (case-insensitive) | `"CED Greentech"` |

### 3. Selection Strategies

At the bottom of the config file, you can set the `SELECTION_STRATEGY`:

```typescript
export const SELECTION_STRATEGY: SelectionStrategy = "cheapest";
```

Available strategies:
- **`"cheapest"`** - Select the lowest priced item from matches
- **`"expensive"`** - Select the highest priced item from matches  
- **`"first"`** - Select the first match (default)
- **`"newest"`** - Select the most recently added item

### 4. Example Configurations

#### Example 1: Select by Specific Model

```typescript
inverter: {
  manufacturer: "Sol-Ark",
  modelNumber: "15K",
}
```

#### Example 2: Select Cheapest Within Price Range

```typescript
solarPanel: {
  minPrice: 150,
  maxPrice: 300,
}

// And set strategy to:
export const SELECTION_STRATEGY: SelectionStrategy = "cheapest";
```

#### Example 3: Select from Specific Distributor

```typescript
battery: {
  distributorName: "CED Greentech",
  manufacturer: "SimpliPhi",
}
```

#### Example 4: Multiple Criteria

```typescript
mounting: {
  manufacturer: "IronRidge",
  namePattern: "rail",
  minPrice: 200,
  maxPrice: 600,
  distributorName: "Solar Electric Supply"
}
```

## How the Selection Works

1. The system queries all active, in-stock equipment from the selected distributor
2. For each equipment category (solar, battery, inverter, mounting, electrical):
   - Filter items based on your configured preferences
   - If no matches found, fall back to all available items in that category
   - Apply the selection strategy to pick one item
3. The selected equipment is used to generate the BOM

## Current Default Items

Based on your screenshot, the system is currently selecting:

- **Battery**: Sol Ark 15kW Inverter + 1 x Helios Discover Outdoor Battery 16.1kWh
- **Electrical**: IMO Enclosed DC Switch IP66 16A 900 VDC
- **Inverter**: Enphase IQ8 Microinverter IQ8P-3P-72-E-US
- **Mounting**: UNIRAC GFT 404001 150' (13') Ground Fixed Tilt C-PILE
- **Solar**: Unirac 307120M 44' Clear Adjustable Tilt Leg

## To Change These Defaults

### Option 1: Select Different Equipment by Name/Model

```typescript
export const DEFAULT_EQUIPMENT_CONFIG: DefaultEquipmentConfig = {
  battery: {
    manufacturer: "SimpliPhi",  // Change from Sol-Ark/Helios
    namePattern: "PHI",
  },
  
  inverter: {
    manufacturer: "SolarEdge",  // Change from Enphase
    modelNumber: "SE",
  },
  
  // ... configure others similarly
};
```

### Option 2: Select Cheapest Options

```typescript
export const SELECTION_STRATEGY: SelectionStrategy = "cheapest";

// Leave preferences empty or set price limits
export const DEFAULT_EQUIPMENT_CONFIG: DefaultEquipmentConfig = {
  solarPanel: { maxPrice: 250 },
  battery: { maxPrice: 10000 },
  inverter: { maxPrice: 400 },
  mounting: { maxPrice: 500 },
  electrical: { maxPrice: 2000 },
};
```

### Option 3: Don't Auto-Select (Use Defaults)

To disable auto-selection and use fallback defaults:

```typescript
export const DEFAULT_EQUIPMENT_CONFIG: DefaultEquipmentConfig = {
  // Leave all empty
};
```

## Testing Your Configuration

1. Edit `src/lib/default-equipment-config.ts`
2. Save the file
3. Create a new project or regenerate an existing BOM
4. Check the console logs for "Selected equipment based on preferences"
5. Verify the correct equipment was selected

## Troubleshooting

### Issue: Wrong equipment still being selected

**Solutions:**
1. Check spelling of manufacturer/model names (case-insensitive but must match)
2. Verify equipment exists in your database with those attributes
3. Check console logs for selection details
4. Try using broader criteria (e.g., just `namePattern` instead of `manufacturer` + `modelNumber`)

### Issue: No equipment selected

**Solutions:**
1. Verify you have equipment in the database
2. Check that equipment is marked as `isActive: true` and `inStock: true`
3. Broaden your selection criteria
4. Remove price constraints temporarily

### Issue: Need to see available equipment

Run these queries to see what's available:

```bash
# View all equipment
curl http://localhost:3004/api/equipment

# View equipment by category
curl http://localhost:3004/api/equipment?category=INVERTER

# View equipment by distributor
curl http://localhost:3004/api/equipment?distributorId=YOUR_DISTRIBUTOR_ID
```

## Support

For issues or questions, refer to:
- Equipment API: `src/app/api/equipment/route.ts`
- Selection Logic: `src/lib/equipment-selector.ts`
- BOM Generation: `src/lib/system-sizing.ts` (lines 203-400)

