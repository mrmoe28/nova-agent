/**
 * Energy Bill JSON Plugin - Usage Examples
 *
 * This file demonstrates various usage patterns for the EnergyBillJSONPlugin.
 * These examples can be copied directly into your application code.
 */

import {
  EnergyBillJSONPlugin,
  loadEnergyBillFromJSON
} from '@/lib/plugins/energy-bill-json-plugin';
import { ParsedBillData } from '@/lib/ocr';

// ============================================================================
// Example 1: Basic Usage with Convenience Function
// ============================================================================

async function example1_basicUsage() {
  console.log('=== Example 1: Basic Usage ===');

  const billData = await loadEnergyBillFromJSON('/path/to/bill.json');

  if (billData) {
    console.log(`Utility Company: ${billData.utilityCompany}`);
    console.log(`Account Number: ${billData.accountNumber}`);
    console.log(`Total Charges: $${billData.charges?.total}`);
    console.log(`kWh Usage: ${billData.usage?.kwh}`);
  } else {
    console.error('Failed to load bill data');
  }
}

// ============================================================================
// Example 2: Advanced Usage with Validation
// ============================================================================

async function example2_withValidation() {
  console.log('=== Example 2: Advanced Validation ===');

  const plugin = new EnergyBillJSONPlugin({
    filePath: '/path/to/bill.json',
    validateSchema: true,
    strictMode: false // Log warnings instead of throwing errors
  });

  const billData = await plugin.extractBillData();

  if (billData) {
    // Check validation results
    const errors = plugin.getValidationErrors();
    const warnings = plugin.getValidationWarnings();

    if (errors.length > 0) {
      console.error('Validation Errors:', errors);
    }

    if (warnings.length > 0) {
      console.warn('Validation Warnings:', warnings);
    }

    // Convert to ParsedBillData
    const parsedData = plugin.toParsedBillData();
    console.log('Parsed Data:', parsedData);
  }
}

// ============================================================================
// Example 3: Renewable Energy Data Extraction
// ============================================================================

async function example3_renewableEnergy() {
  console.log('=== Example 3: Renewable Energy Data ===');

  const plugin = new EnergyBillJSONPlugin({
    filePath: '/path/to/bill.json',
    validateSchema: true
  });

  await plugin.extractBillData();

  // Extract renewable source data with unit conversion
  const renewableData = plugin.extractRenewableData();

  if (renewableData) {
    console.log(`Renewable Source Type: ${renewableData.type}`);
    console.log(`Capacity: ${renewableData.capacity} ${renewableData.capacityUnit}`);

    // If input was in MW, it's automatically converted to kW
    if (renewableData.capacityUnit === 'KW' && renewableData.capacity > 1000) {
      console.log(`That's ${renewableData.capacity / 1000} MW`);
    }
  } else {
    console.log('No renewable energy data found');
  }
}

// ============================================================================
// Example 4: Strict Mode (CI/CD, Testing)
// ============================================================================

async function example4_strictMode() {
  console.log('=== Example 4: Strict Mode ===');

  const plugin = new EnergyBillJSONPlugin({
    filePath: '/path/to/bill.json',
    validateSchema: true,
    strictMode: true // Throw errors on validation failure
  });

  try {
    const billData = await plugin.extractBillData();
    console.log('Bill data validated successfully:', billData);

    // Safe to use data - validation passed
    const parsedData = plugin.toParsedBillData();
    return parsedData;
  } catch (error) {
    console.error('Validation failed:', error);
    throw error; // Re-throw for CI/CD to catch
  }
}

// ============================================================================
// Example 5: Integration with API Route
// ============================================================================

async function example5_apiIntegration(request: Request): Promise<Response> {
  console.log('=== Example 5: API Integration ===');

  try {
    const { filePath } = await request.json();

    // Load bill data
    const billData = await loadEnergyBillFromJSON(filePath, true, false);

    if (!billData) {
      return Response.json(
        { error: 'Failed to parse bill data' },
        { status: 400 }
      );
    }

    // Return structured data
    return Response.json({
      success: true,
      data: {
        utilityCompany: billData.utilityCompany,
        accountNumber: billData.accountNumber,
        totalCharges: billData.charges?.total,
        usage: billData.usage,
        renewableSource: billData.renewableSource
      }
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Example 6: Batch Processing Multiple Bills
// ============================================================================

async function example6_batchProcessing(filePaths: string[]) {
  console.log('=== Example 6: Batch Processing ===');

  const results: ParsedBillData[] = [];
  const errors: Array<{ file: string; error: string }> = [];

  for (const filePath of filePaths) {
    try {
      const billData = await loadEnergyBillFromJSON(filePath, true, false);

      if (billData) {
        results.push(billData);
      } else {
        errors.push({
          file: filePath,
          error: 'Failed to parse bill data'
        });
      }
    } catch (error) {
      errors.push({
        file: filePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  console.log(`Successfully processed: ${results.length} bills`);
  console.log(`Failed to process: ${errors.length} bills`);

  if (errors.length > 0) {
    console.error('Errors:', errors);
  }

  return { results, errors };
}

// ============================================================================
// Example 7: Conditional Processing (JSON vs OCR)
// ============================================================================

async function example7_hybridProcessing(filePath: string) {
  console.log('=== Example 7: Hybrid JSON/OCR Processing ===');

  const fileExtension = filePath.split('.').pop()?.toLowerCase();

  if (fileExtension === 'json') {
    // Use JSON plugin for fast, reliable extraction
    console.log('Processing JSON file...');
    const billData = await loadEnergyBillFromJSON(filePath);
    return billData;
  } else if (fileExtension === 'pdf') {
    // Use OCR for PDF files
    console.log('Processing PDF with OCR...');
    const { performOCR, parseBillText } = await import('@/lib/ocr');
    const ocrResult = await performOCR(filePath, 'pdf');
    const billData = parseBillText(ocrResult.text);
    return billData;
  } else {
    throw new Error(`Unsupported file type: ${fileExtension}`);
  }
}

// ============================================================================
// Example 8: Data Validation and Sanitization
// ============================================================================

async function example8_dataValidation() {
  console.log('=== Example 8: Data Validation ===');

  const plugin = new EnergyBillJSONPlugin({
    filePath: '/path/to/bill.json',
    validateSchema: true,
    strictMode: false
  });

  const billData = await plugin.extractBillData();

  if (billData) {
    // Check for minimum required fields
    const requiredFields = ['usage', 'charges'];
    const missingFields = requiredFields.filter(field =>
      !billData[field as keyof typeof billData]
    );

    if (missingFields.length > 0) {
      console.warn('Missing required fields:', missingFields);
    }

    // Validate usage is within reasonable range
    if (billData.usage?.kwh) {
      if (billData.usage.kwh < 0) {
        console.error('Invalid: Negative kWh usage');
      } else if (billData.usage.kwh > 50000) {
        console.warn('Warning: Unusually high kWh usage');
      } else {
        console.log('✓ kWh usage is within expected range');
      }
    }

    // Validate charges
    if (billData.charges?.total) {
      if (billData.charges.total < 0) {
        console.error('Invalid: Negative total charges');
      } else {
        console.log('✓ Total charges are valid');
      }
    }

    return billData;
  }

  return null;
}

// ============================================================================
// Example 9: Extracting Specific Fields
// ============================================================================

async function example9_specificFields() {
  console.log('=== Example 9: Extract Specific Fields ===');

  const billData = await loadEnergyBillFromJSON('/path/to/bill.json');

  if (billData) {
    // Extract only the fields you need
    const summary = {
      company: billData.utilityCompany,
      period: billData.billingPeriod ?
        `${billData.billingPeriod.start} to ${billData.billingPeriod.end}` :
        'Unknown',
      totalCost: billData.charges?.total ?? 0,
      totalUsage: billData.usage?.kwh ?? 0,
      hasRenewable: !!billData.renewableSource
    };

    console.log('Bill Summary:', summary);
    return summary;
  }

  return null;
}

// ============================================================================
// Example 10: Error Recovery and Fallback
// ============================================================================

async function example10_errorRecovery(filePath: string) {
  console.log('=== Example 10: Error Recovery ===');

  // Try JSON plugin first
  try {
    const billData = await loadEnergyBillFromJSON(filePath, true, false);

    if (billData) {
      console.log('✓ Successfully loaded JSON bill data');
      return { source: 'json', data: billData };
    }
  } catch (error) {
    console.warn('JSON loading failed, trying alternative methods...');
  }

  // Fallback to OCR if JSON fails
  try {
    const { performOCR, parseBillText } = await import('@/lib/ocr');
    const ocrResult = await performOCR(filePath, 'pdf');
    const billData = parseBillText(ocrResult.text);

    console.log('✓ Successfully extracted data using OCR');
    return { source: 'ocr', data: billData };
  } catch (error) {
    console.error('All extraction methods failed:', error);
    return { source: 'none', data: null };
  }
}

// ============================================================================
// Export all examples for easy testing
// ============================================================================

export const examples = {
  basicUsage: example1_basicUsage,
  withValidation: example2_withValidation,
  renewableEnergy: example3_renewableEnergy,
  strictMode: example4_strictMode,
  apiIntegration: example5_apiIntegration,
  batchProcessing: example6_batchProcessing,
  hybridProcessing: example7_hybridProcessing,
  dataValidation: example8_dataValidation,
  specificFields: example9_specificFields,
  errorRecovery: example10_errorRecovery
};

// ============================================================================
// Main function to run all examples
// ============================================================================

async function runAllExamples() {
  console.log('\n🚀 Running all Energy Bill JSON Plugin examples...\n');

  try {
    await example1_basicUsage();
    console.log('\n');

    await example2_withValidation();
    console.log('\n');

    await example3_renewableEnergy();
    console.log('\n');

    await example4_strictMode();
    console.log('\n');

    await example6_batchProcessing([
      '/path/to/bill1.json',
      '/path/to/bill2.json'
    ]);
    console.log('\n');

    await example8_dataValidation();
    console.log('\n');

    await example9_specificFields();
    console.log('\n');

    console.log('✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Example execution failed:', error);
  }
}

// Uncomment to run all examples
// runAllExamples();
