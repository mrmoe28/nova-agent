# Renewable Data Schema Documentation

## Overview

This document describes the renewable energy data structure used in NovaAgent for storing and validating information about existing renewable energy installations found on utility bills.

**Database Location**: `Bill.extractedData` JSON field
**Type Definitions**: `/src/types/bill-data.ts`
**Validation Functions**: `/src/lib/ocr.ts`

## Data Structure

The renewable energy data is stored as part of the `ExtractedBillData` JSON structure in the `Bill.extractedData` field. The database schema uses a flexible JSON string approach, allowing us to evolve the data structure without requiring schema migrations.

### JSON Schema

```json
{
  "utilityCompany": "Georgia Power",
  "accountNumber": "02608-44013",
  "billingPeriod": {
    "start": "Aug 29, 2025",
    "end": "Sept 30, 2025"
  },
  "usage": {
    "kwh": 850,
    "kw": 15.5
  },
  "charges": {
    "total": 144.00,
    "energyCharge": 85.50,
    "demandCharge": 35.00
  },
  "averageDailyUsage": 27.5,
  "renewableSource": {
    "type": "solar",
    "capacity": 5.5,
    "capacityUnit": "kW"
  }
}
```

## Renewable Source Field

The `renewableSource` field is **optional** and only present when the utility bill indicates the customer has an existing renewable energy installation (typically shown through net metering credits or solar production data).

### TypeScript Interface

```typescript
interface RenewableSource {
  type?: string;         // Type of renewable energy (solar, wind, etc.)
  capacity?: number;     // Nameplate capacity (numeric value)
  capacityUnit?: string; // Unit of measurement (typically "kW")
}
```

### Field Descriptions

| Field | Type | Required | Description | Valid Values |
|-------|------|----------|-------------|--------------|
| `type` | string | No | Type of renewable energy source | `solar`, `wind`, `hydro`, `geothermal`, `biomass` |
| `capacity` | number | No | Nameplate capacity of the installation | Positive number, typically 1-20 kW (residential), >100 kW (commercial) |
| `capacityUnit` | string | No | Unit of capacity measurement | `kW`, `kw`, `kilowatt`, `kilowatts` |

## Validation Rules

The `validateRenewableSource()` function in `/src/lib/ocr.ts` performs comprehensive validation on renewable source data.

### Validation Errors (Blocking)

These errors indicate **invalid** data that should be corrected:

1. **Invalid Renewable Type**: Type is not one of the supported values
   - Valid: `solar`, `wind`, `hydro`, `geothermal`, `biomass`
   - Example: `"invalid_type"` → ERROR

2. **Invalid Capacity**: Capacity is zero, negative, or exceeds maximum
   - Must be: `> 0` and `<= 100,000 kW`
   - Example: `-10` → ERROR
   - Example: `150000` → ERROR

### Validation Warnings (Non-Blocking)

These warnings indicate **unusual but valid** data:

1. **Missing Fields**: Optional fields not provided
   - Example: No `type` specified → WARNING
   - Example: No `capacity` specified → WARNING

2. **Unusual Capacity Values**:
   - Very small: `< 1 kW` → WARNING (micro-installation)
   - Very large: `> 10,000 kW` (10 MW) → WARNING (utility-scale)

3. **Non-Standard Units**: Unit is valid but not standard
   - Example: `"kilowatts"` instead of `"kW"` → WARNING

### Validation Response Structure

```typescript
interface RenewableSourceValidation {
  isValid: boolean;     // False if any errors exist
  errors: string[];     // Array of error messages (blocking issues)
  warnings: string[];   // Array of warning messages (non-blocking issues)
}
```

### Example Validation Results

**Valid Data**:
```typescript
validateRenewableSource({
  type: 'solar',
  capacity: 5.5,
  capacityUnit: 'kW'
})
// Result:
// {
//   isValid: true,
//   errors: [],
//   warnings: []
// }
```

**Invalid Data**:
```typescript
validateRenewableSource({
  type: 'invalid_type',
  capacity: -10,
  capacityUnit: 'kW'
})
// Result:
// {
//   isValid: false,
//   errors: [
//     'Invalid renewable type: "invalid_type". Must be one of: solar, wind, hydro, geothermal, biomass',
//     'Capacity must be greater than 0'
//   ],
//   warnings: []
// }
```

**Valid with Warnings**:
```typescript
validateRenewableSource({
  type: 'solar',
  capacity: 0.5,
  capacityUnit: 'kW'
})
// Result:
// {
//   isValid: true,
//   errors: [],
//   warnings: [
//     'Capacity is unusually small (< 1 kW)'
//   ]
// }
```

## Capacity Calculations

The `calculateRenewableCapacity()` function calculates effective capacity and annual production using industry-standard capacity factors.

### Capacity Factors by Type

| Renewable Type | Capacity Factor | Description |
|----------------|-----------------|-------------|
| Solar | 20% | Average for fixed-tilt systems |
| Wind | 35% | Onshore wind turbines (average) |
| Hydro | 50% | Run-of-river hydroelectric systems |
| Geothermal | 75% | Geothermal heat pump systems |
| Biomass | 80% | Biomass combustion systems |

### Calculation Formulas

1. **Effective Capacity (kW)**:
   ```
   effectiveCapacity = nameplateCapacity × capacityFactor
   ```

2. **Annual Production (kWh/year)**:
   ```
   annualProduction = nameplateCapacity × capacityFactor × 8760 hours/year
   ```

### Example Calculation

For a 5.5 kW solar installation:

```typescript
calculateRenewableCapacity('solar', 5.5)
// Result:
// {
//   sourceType: 'solar',
//   nameplateCapacityKw: 5.5,
//   capacityFactor: 0.20,
//   effectiveCapacityKw: 1.1,
//   annualProductionKwh: 9636
// }
```

**Breakdown**:
- Nameplate capacity: 5.5 kW
- Solar capacity factor: 20%
- Effective capacity: 5.5 × 0.20 = 1.1 kW
- Annual production: 5.5 × 0.20 × 8760 = 9,636 kWh/year

## Usage Examples

### 1. Parsing Bill with Renewable Data

```typescript
import { parseBillText } from '@/lib/ocr';

const ocrText = "...utility bill text...";
const parsedData = parseBillText(ocrText);

if (parsedData.renewableSource) {
  console.log('Renewable source detected:', parsedData.renewableSource);
  // {
  //   type: 'solar',
  //   capacity: 5.5,
  //   capacityUnit: 'kW'
  // }
}
```

### 2. Validating Renewable Data

```typescript
import { validateRenewableSource } from '@/lib/ocr';

const validation = validateRenewableSource(parsedData.renewableSource);

if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
  // Handle validation errors
}

if (validation.warnings.length > 0) {
  console.warn('Validation warnings:', validation.warnings);
  // Log warnings for monitoring
}
```

### 3. Calculating Capacity

```typescript
import { calculateRenewableCapacity } from '@/lib/ocr';

if (parsedData.renewableSource?.type && parsedData.renewableSource?.capacity) {
  const calculation = calculateRenewableCapacity(
    parsedData.renewableSource.type,
    parsedData.renewableSource.capacity
  );

  console.log(`Annual production estimate: ${calculation.annualProductionKwh} kWh/year`);
}
```

### 4. Storing in Database

The data is automatically stored when bills are uploaded via `/api/upload`:

```typescript
// Data is parsed and validated during upload
const bill = await prisma.bill.create({
  data: {
    projectId,
    fileName: file.name,
    fileType,
    filePath: urlPath,
    ocrText,
    extractedData: JSON.stringify(parsedData), // Includes renewableSource
  },
});
```

### 5. Retrieving from Database

```typescript
// Retrieve bill data
const bill = await prisma.bill.findUnique({
  where: { id: billId }
});

// Parse JSON string
const extractedData = JSON.parse(bill.extractedData || '{}');

// Access renewable source data
if (extractedData.renewableSource) {
  const { type, capacity, capacityUnit } = extractedData.renewableSource;
  console.log(`Existing ${type} system: ${capacity} ${capacityUnit}`);
}
```

## API Integration

The validation is automatically integrated into the bill upload flow:

```typescript
// In /src/app/api/upload/route.ts (lines 106-123)

const parsedData = parseBillText(ocrText);
extractedData = JSON.stringify(parsedData);

// Validate renewable source data if present
if (parsedData.renewableSource) {
  const validation = validateRenewableSource(parsedData.renewableSource);

  if (!validation.isValid) {
    console.error("Renewable source validation errors:", validation.errors);
  }

  if (validation.warnings.length > 0) {
    console.warn("Renewable source validation warnings:", validation.warnings);
  }

  // Log validation results for monitoring
  console.log(
    `Renewable source validation: ${validation.isValid ? "PASS" : "FAIL"} ` +
    `(${validation.errors.length} errors, ${validation.warnings.length} warnings)`,
  );
}
```

## Monitoring & Logging

Validation results are logged for monitoring and debugging:

- **Errors**: Logged to `console.error()` - indicates invalid data
- **Warnings**: Logged to `console.warn()` - indicates unusual but valid data
- **Summary**: Logged to `console.log()` - shows PASS/FAIL status with counts

Example log output:
```
Renewable source validation: PASS (0 errors, 1 warnings)
```

## Edge Cases

### 1. Missing Renewable Source

If no renewable source data is found on the bill:
```json
{
  "renewableSource": undefined
}
```
**Validation Result**: No validation performed (field is optional)

### 2. Partial Renewable Data

If only some fields are present:
```json
{
  "renewableSource": {
    "capacity": 5.5
  }
}
```
**Validation Result**: `isValid: true`, warnings for missing `type` and `capacityUnit`

### 3. Invalid Type with Valid Capacity

```json
{
  "renewableSource": {
    "type": "nuclear",
    "capacity": 100
  }
}
```
**Validation Result**: `isValid: false`, error: "Invalid renewable type"

## Future Enhancements

Potential improvements to the renewable data schema:

1. **Net Metering Credits**: Track export credits and compensation rates
2. **Production History**: Store historical production data from bills
3. **System Age**: Capture installation date for degradation modeling
4. **Panel Specifications**: Store module type, efficiency, manufacturer
5. **Inverter Information**: Track inverter type, efficiency, warranty
6. **Interconnection Details**: Store utility interconnection agreement info

## Related Documentation

- **Type Definitions**: `/src/types/bill-data.ts`
- **Validation Logic**: `/src/lib/ocr.ts` (lines 500-595)
- **Database Schema**: `/prisma/schema.prisma` (Bill model, line 36-50)
- **API Route**: `/src/app/api/upload/route.ts` (upload and validation)
- **OCR Processing**: `/src/lib/ocr-microservice.ts`

## Support

For questions or issues related to renewable data schema:

1. Check TypeScript type definitions in `/src/types/bill-data.ts`
2. Review validation logic in `/src/lib/ocr.ts`
3. Test with sample data using the validation functions
4. Check logs in Vercel dashboard for validation errors/warnings

## Changelog

- **2025-11-11**: Initial documentation created
  - Documented renewable source data structure
  - Added validation rules and examples
  - Documented capacity calculation formulas
  - Added usage examples and API integration details
