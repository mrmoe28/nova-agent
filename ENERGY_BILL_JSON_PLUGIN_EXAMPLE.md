# Energy Bill JSON Plugin - Usage Examples

## Overview

The `EnergyBillJSONPlugin` provides a structured way to load and validate energy bill data from JSON files, with support for renewable energy source information, schema validation, and unit conversion.

## Installation

The plugin is located at: `src/lib/plugins/energy-bill-json-plugin.ts`

## Basic Usage

### 1. Using the Convenience Function (Simplest)

```typescript
import { loadEnergyBillFromJSON } from '@/lib/plugins/energy-bill-json-plugin';

// Load bill data with default validation
const billData = await loadEnergyBillFromJSON('/path/to/bill.json');

if (billData) {
  console.log(`Utility Company: ${billData.utilityCompany}`);
  console.log(`Total Charges: $${billData.charges?.total}`);
  console.log(`kWh Usage: ${billData.usage?.kwh}`);
  console.log(`Average Daily Usage: ${billData.averageDailyUsage} kWh`);

  if (billData.renewableSource) {
    console.log(`Renewable Source: ${billData.renewableSource.type}`);
    console.log(`Capacity: ${billData.renewableSource.capacity} ${billData.renewableSource.capacityUnit}`);
  }
}
```

### 2. Using the Plugin Class (Advanced)

```typescript
import { EnergyBillJSONPlugin } from '@/lib/plugins/energy-bill-json-plugin';

// Create plugin with custom configuration
const plugin = new EnergyBillJSONPlugin({
  filePath: '/path/to/bill.json',
  validateSchema: true,    // Enable schema validation
  strictMode: false        // Log warnings instead of throwing errors
});

// Extract bill data
const billData = await plugin.extractBillData();

if (billData) {
  // Get renewable source data with unit conversion
  const renewableData = plugin.extractRenewableData();

  if (renewableData) {
    console.log(`Type: ${renewableData.type}`);
    console.log(`Capacity: ${renewableData.capacity} ${renewableData.capacityUnit}`);
    // If input was MW, it's automatically converted to kW
  }

  // Convert to ParsedBillData format
  const parsedData = plugin.toParsedBillData();

  // Check validation results
  const errors = plugin.getValidationErrors();
  const warnings = plugin.getValidationWarnings();

  if (errors.length > 0) {
    console.error('Validation errors:', errors);
  }
  if (warnings.length > 0) {
    console.warn('Validation warnings:', warnings);
  }
}
```

## JSON File Format

### Complete Example

```json
{
  "utilityCompany": "Georgia Power",
  "accountNumber": "02608-44013",
  "billingPeriod": {
    "start": "2025-08-29",
    "end": "2025-09-30"
  },
  "usage": {
    "kwh": 850.5,
    "kw": 12.5
  },
  "charges": {
    "total": 144.00,
    "energyCharge": 85.50,
    "demandCharge": 35.00
  },
  "averageDailyUsage": 26.6,
  "renewableSource": {
    "type": "solar",
    "capacity": 10,
    "capacityUnit": "kW"
  }
}
```

### Minimal Example

```json
{
  "usage": {
    "kwh": 850.5
  },
  "charges": {
    "total": 144.00
  }
}
```

## Features

### 1. Schema Validation

The plugin validates:
- **Required Fields**: Logs warnings for missing utility company, account number, etc.
- **Date Formats**: Validates billing period dates and ensures start < end
- **Value Ranges**: Checks for negative values and unusually high amounts
- **Renewable Sources**: Validates source types against known renewable energy types

### 2. Renewable Source Validation

Valid renewable source types:
- `solar`
- `wind`
- `hydro` / `hydroelectric`
- `geothermal`
- `biomass`
- `tidal`
- `wave`
- `other`

### 3. Unit Conversion

Automatically converts MW to kW:

```json
{
  "renewableSource": {
    "type": "solar",
    "capacity": 5,
    "capacityUnit": "MW"
  }
}
```

Becomes:
```typescript
{
  type: "solar",
  capacity: 5000,  // Converted from 5 MW
  capacityUnit: "KW"
}
```

### 4. Validation Modes

#### Lenient Mode (default: `strictMode: false`)
- Logs warnings and errors to console
- Returns `null` on failure
- Allows processing to continue with partial data

```typescript
const plugin = new EnergyBillJSONPlugin({
  filePath: '/path/to/bill.json',
  strictMode: false  // Lenient mode
});

const data = await plugin.extractBillData();
// Returns null if parsing fails, logs errors
```

#### Strict Mode (`strictMode: true`)
- Throws errors on validation failures
- Stops processing immediately
- Useful for CI/CD pipelines or critical operations

```typescript
const plugin = new EnergyBillJSONPlugin({
  filePath: '/path/to/bill.json',
  strictMode: true  // Strict mode
});

try {
  const data = await plugin.extractBillData();
} catch (error) {
  console.error('Failed to extract bill data:', error);
}
```

## Integration with Existing OCR System

The plugin integrates seamlessly with the existing OCR system:

```typescript
import { loadEnergyBillFromJSON } from '@/lib/plugins/energy-bill-json-plugin';
import { performOCR, parseBillText } from '@/lib/ocr';

async function processBill(filePath: string, fileType: 'pdf' | 'image' | 'csv' | 'json') {
  if (fileType === 'json') {
    // Use JSON plugin for JSON files
    const billData = await loadEnergyBillFromJSON(filePath);
    return billData;
  } else {
    // Use OCR for other file types
    const ocrResult = await performOCR(filePath, fileType);
    const billData = parseBillText(ocrResult.text);
    return billData;
  }
}
```

## API Reference

### `EnergyBillJSONPlugin` Class

#### Constructor

```typescript
constructor(config: PluginConfig)
```

**Parameters:**
- `config.filePath` (string, required): Path to JSON file
- `config.validateSchema` (boolean, optional): Enable schema validation (default: `true`)
- `config.strictMode` (boolean, optional): Throw errors vs log warnings (default: `false`)

#### Methods

##### `extractBillData(): Promise<EnergyBillJSON | null>`

Reads and parses the JSON file, optionally validates schema.

**Returns:** Parsed bill data or `null` on failure

**Throws:** Error in strict mode if validation fails

##### `extractRenewableData()`

Extracts renewable source information with validation and unit conversion.

**Returns:** `{ type, capacity, capacityUnit }` or `undefined`

##### `toParsedBillData(): ParsedBillData | null`

Converts to standard `ParsedBillData` format.

**Returns:** `ParsedBillData` object or `null`

##### `getValidationErrors(): string[]`

Gets validation errors from last validation run.

**Returns:** Array of error messages

##### `getValidationWarnings(): string[]`

Gets validation warnings from last validation run.

**Returns:** Array of warning messages

### Convenience Function

```typescript
async function loadEnergyBillFromJSON(
  filePath: string,
  validateSchema = true,
  strictMode = false
): Promise<ParsedBillData | null>
```

Simplified interface for loading bill data without instantiating the class.

## Error Handling

### JSON Parse Errors

```typescript
const plugin = new EnergyBillJSONPlugin({
  filePath: '/path/to/invalid.json',
  strictMode: false
});

const data = await plugin.extractBillData();
// Returns null, logs: "Failed to parse JSON file: Unexpected token..."
```

### Missing Files

```typescript
const plugin = new EnergyBillJSONPlugin({
  filePath: '/path/to/nonexistent.json',
  strictMode: true
});

try {
  await plugin.extractBillData();
} catch (error) {
  // Error: ENOENT: no such file or directory
}
```

### Invalid Renewable Source

```typescript
// Input JSON
{
  "renewableSource": {
    "type": "nuclear",  // Not in valid list
    "capacity": 100,
    "capacityUnit": "MW"
  }
}

// Result
const data = plugin.extractRenewableData();
// Logs warning: "Unknown renewable source type: 'nuclear'. Valid types: solar, wind, hydro..."
// Still returns the data with capacity converted to kW
```

## Testing

### Unit Test Example

```typescript
import { EnergyBillJSONPlugin } from '@/lib/plugins/energy-bill-json-plugin';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';

describe('EnergyBillJSONPlugin', () => {
  const testFilePath = join(process.cwd(), 'test-bill.json');

  afterEach(async () => {
    await unlink(testFilePath).catch(() => {});
  });

  test('should extract valid bill data', async () => {
    const testData = {
      utilityCompany: "Test Utility",
      usage: { kwh: 850 },
      charges: { total: 100 }
    };

    await writeFile(testFilePath, JSON.stringify(testData));

    const plugin = new EnergyBillJSONPlugin({ filePath: testFilePath });
    const result = await plugin.extractBillData();

    expect(result).not.toBeNull();
    expect(result?.utilityCompany).toBe("Test Utility");
    expect(result?.usage?.kwh).toBe(850);
  });

  test('should convert MW to kW', async () => {
    const testData = {
      renewableSource: {
        type: "solar",
        capacity: 5,
        capacityUnit: "MW"
      }
    };

    await writeFile(testFilePath, JSON.stringify(testData));

    const plugin = new EnergyBillJSONPlugin({ filePath: testFilePath });
    await plugin.extractBillData();

    const renewable = plugin.extractRenewableData();

    expect(renewable?.capacity).toBe(5000);
    expect(renewable?.capacityUnit).toBe("KW");
  });
});
```

## Performance Considerations

- **File Size**: Plugin handles files up to Node.js memory limits (typically 1-2 GB)
- **Validation**: Schema validation adds ~1-5ms overhead per file
- **Unit Conversion**: Negligible performance impact
- **Async Operations**: File reading is async and non-blocking

## Best Practices

1. **Use Lenient Mode in Production**: Log warnings without breaking user flows
2. **Use Strict Mode in CI/CD**: Catch data quality issues during testing
3. **Always Check Return Values**: Handle `null` returns gracefully
4. **Log Validation Results**: Monitor validation warnings in production
5. **Standardize JSON Format**: Use a consistent schema across all bill sources

## Migration from OCR to JSON

If you have existing PDF/image bills being processed via OCR, you can migrate to JSON:

1. Extract data using current OCR system
2. Save as JSON using the plugin's format
3. Use JSON plugin for subsequent processing (faster, more reliable)

```typescript
import { performOCR, parseBillText } from '@/lib/ocr';
import { writeFile } from 'fs/promises';

// Extract from PDF
const ocrResult = await performOCR('/path/to/bill.pdf', 'pdf');
const billData = parseBillText(ocrResult.text);

// Save as JSON for future use
await writeFile('/path/to/bill.json', JSON.stringify(billData, null, 2));

// Now use JSON plugin for faster processing
const jsonData = await loadEnergyBillFromJSON('/path/to/bill.json');
```

## Support

For issues or questions:
1. Check validation errors: `plugin.getValidationErrors()`
2. Check validation warnings: `plugin.getValidationWarnings()`
3. Enable debug logging: Set `LOG_LEVEL=debug` in environment
4. Review JSON format against examples in this document
