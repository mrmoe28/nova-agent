#!/usr/bin/env tsx
/**
 * Bill Parsing and Database Test Script
 * Tests the bill upload, parsing, and database operations
 *
 * Usage: npx tsx scripts/test-bill-parsing.ts
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import * as path from 'path';

config({ path: path.join(__dirname, '..', '.env.local') });

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import { logger } from '../src/lib/logger';

const prisma = new PrismaClient();

// Test data
const TEST_PROJECT = {
  clientName: 'Test Client - Bill Parsing',
  address: '123 Test St, Test City, TS 12345',
  phone: '555-0100',
  email: 'test@example.com',
};

const SAMPLE_BILL_PATH = path.join(__dirname, 'data', 'sample-bill.json');

interface SampleBillData {
  utilityCompany: string;
  accountNumber: string;
  billingPeriod: {
    start: string;
    end: string;
  };
  usage: {
    kwh: number;
    kw: number;
  };
  charges: {
    total: number;
    energyCharge: number;
    demandCharge: number;
  };
  averageDailyUsage: number;
  renewableSource?: {
    type: string;
    capacity: number;
    capacityUnit: string;
  };
}

/**
 * Test 1: Database Connection
 */
async function testDatabaseConnection() {
  console.log('\n📊 Test 1: Database Connection');
  console.log('='.repeat(50));

  try {
    await prisma.$connect();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

/**
 * Test 2: Create Test Project
 */
async function testCreateProject() {
  console.log('\n📊 Test 2: Create Test Project');
  console.log('='.repeat(50));

  try {
    // Clean up any existing test project
    await prisma.project.deleteMany({
      where: { clientName: TEST_PROJECT.clientName },
    });

    const project = await prisma.project.create({
      data: TEST_PROJECT,
    });

    console.log('✅ Project created successfully');
    console.log(`   ID: ${project.id}`);
    console.log(`   Client: ${project.clientName}`);
    console.log(`   Status: ${project.status}`);

    return project;
  } catch (error) {
    console.error('❌ Project creation failed:', error);
    throw error;
  }
}

/**
 * Test 3: Load and Parse Sample Bill Data
 */
async function testLoadSampleBill() {
  console.log('\n📊 Test 3: Load and Parse Sample Bill');
  console.log('='.repeat(50));

  try {
    if (!fs.existsSync(SAMPLE_BILL_PATH)) {
      throw new Error(`Sample bill not found at: ${SAMPLE_BILL_PATH}`);
    }

    const rawData = fs.readFileSync(SAMPLE_BILL_PATH, 'utf-8');
    const billData: SampleBillData = JSON.parse(rawData);

    console.log('✅ Sample bill loaded successfully');
    console.log(`   Utility: ${billData.utilityCompany}`);
    console.log(`   Account: ${billData.accountNumber}`);
    console.log(`   Usage: ${billData.usage.kwh} kWh`);
    console.log(`   Demand: ${billData.usage.kw} kW`);
    console.log(`   Total Charges: $${billData.charges.total}`);

    return billData;
  } catch (error) {
    console.error('❌ Failed to load sample bill:', error);
    throw error;
  }
}

/**
 * Test 4: Save Bill to Database
 */
async function testSaveBill(projectId: string, billData: SampleBillData) {
  console.log('\n📊 Test 4: Save Bill to Database');
  console.log('='.repeat(50));

  try {
    // Create extracted data in the format expected by the system
    const extractedData = {
      utilityName: billData.utilityCompany,
      accountNumber: billData.accountNumber,
      billingPeriod: {
        startDate: new Date(billData.billingPeriod.start),
        endDate: new Date(billData.billingPeriod.end),
        daysInPeriod: Math.ceil(
          (new Date(billData.billingPeriod.end).getTime() -
           new Date(billData.billingPeriod.start).getTime()) /
          (1000 * 60 * 60 * 24)
        ),
        isEstimated: false,
      },
      billDate: new Date(billData.billingPeriod.end),
      totalKwh: billData.usage.kwh,
      peakKw: billData.usage.kw,
      totalAmount: billData.charges.total,
      energyCharges: billData.charges.energyCharge,
      demandCharges: billData.charges.demandCharge,
      taxes: 0,
      fees: 0,
      lineItems: [
        {
          description: 'Energy Charge',
          amount: billData.charges.energyCharge,
          category: 'energy',
        },
        {
          description: 'Demand Charge',
          amount: billData.charges.demandCharge,
          category: 'demand',
        },
      ],
      parseConfidence: 1.0,
      totalVariance: 0,
      warnings: [],
      errors: [],
    };

    const bill = await prisma.bill.create({
      data: {
        projectId,
        fileName: 'sample-bill.json',
        fileType: 'json',
        filePath: '/test/sample-bill.json',
        ocrText: JSON.stringify(billData),
        extractedData: JSON.stringify(extractedData),
      },
    });

    console.log('✅ Bill saved to database successfully');
    console.log(`   Bill ID: ${bill.id}`);
    console.log(`   File Name: ${bill.fileName}`);
    console.log(`   File Type: ${bill.fileType}`);
    console.log(`   Uploaded At: ${bill.uploadedAt}`);

    return bill;
  } catch (error) {
    console.error('❌ Failed to save bill:', error);
    throw error;
  }
}

/**
 * Test 5: Retrieve Bill from Database
 */
async function testRetrieveBill(billId: string) {
  console.log('\n📊 Test 5: Retrieve Bill from Database');
  console.log('='.repeat(50));

  try {
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: { project: true },
    });

    if (!bill) {
      throw new Error('Bill not found');
    }

    console.log('✅ Bill retrieved successfully');
    console.log(`   Bill ID: ${bill.id}`);
    console.log(`   Project: ${bill.project.clientName}`);
    console.log(`   File Name: ${bill.fileName}`);

    // Parse and validate extracted data
    if (bill.extractedData) {
      const extractedData = JSON.parse(bill.extractedData);
      console.log('\n   📋 Extracted Data:');
      console.log(`      Utility: ${extractedData.utilityName}`);
      console.log(`      Account: ${extractedData.accountNumber}`);
      console.log(`      Total kWh: ${extractedData.totalKwh}`);
      console.log(`      Peak kW: ${extractedData.peakKw}`);
      console.log(`      Total Amount: $${extractedData.totalAmount}`);
      console.log(`      Parse Confidence: ${extractedData.parseConfidence}`);
    }

    return bill;
  } catch (error) {
    console.error('❌ Failed to retrieve bill:', error);
    throw error;
  }
}

/**
 * Test 6: Verify Schema Structure
 */
async function testSchemaStructure(billId: string) {
  console.log('\n📊 Test 6: Verify Schema Structure');
  console.log('='.repeat(50));

  try {
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
    });

    if (!bill) {
      throw new Error('Bill not found');
    }

    // Verify all expected fields exist
    const expectedFields = [
      'id',
      'projectId',
      'fileName',
      'fileType',
      'filePath',
      'uploadedAt',
      'ocrText',
      'extractedData',
    ];

    const missingFields = expectedFields.filter(field => !(field in bill));

    if (missingFields.length > 0) {
      throw new Error(`Missing fields: ${missingFields.join(', ')}`);
    }

    console.log('✅ Schema structure verified');
    console.log(`   All ${expectedFields.length} expected fields present`);

    // Verify data types
    console.log('\n   📋 Field Types:');
    console.log(`      id: ${typeof bill.id} (${bill.id.length} chars)`);
    console.log(`      projectId: ${typeof bill.projectId}`);
    console.log(`      fileName: ${typeof bill.fileName}`);
    console.log(`      fileType: ${typeof bill.fileType}`);
    console.log(`      uploadedAt: ${bill.uploadedAt instanceof Date ? 'Date' : typeof bill.uploadedAt}`);
    console.log(`      ocrText: ${bill.ocrText ? 'string (' + bill.ocrText.length + ' chars)' : 'null'}`);
    console.log(`      extractedData: ${bill.extractedData ? 'string (' + bill.extractedData.length + ' chars)' : 'null'}`);

    return true;
  } catch (error) {
    console.error('❌ Schema structure verification failed:', error);
    throw error;
  }
}

/**
 * Test 7: Test EnhancedBill Table (if needed)
 */
async function testEnhancedBill(billId: string, billData: SampleBillData) {
  console.log('\n📊 Test 7: Test EnhancedBill Table');
  console.log('='.repeat(50));

  try {
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
    });

    if (!bill) {
      throw new Error('Bill not found');
    }

    // Create enhanced bill record
    const enhancedBill = await prisma.enhancedBill.create({
      data: {
        projectId: bill.projectId,
        originalBillId: billId,
        parsedData: {
          utilityName: billData.utilityCompany,
          accountNumber: billData.accountNumber,
          totalKwh: billData.usage.kwh,
          peakKw: billData.usage.kw,
          totalAmount: billData.charges.total,
        },
        lineItems: [
          {
            description: 'Energy Charge',
            amount: billData.charges.energyCharge,
            category: 'energy',
          },
          {
            description: 'Demand Charge',
            amount: billData.charges.demandCharge,
            category: 'demand',
          },
        ],
        ocrResult: {
          text: JSON.stringify(billData),
          confidence: 1.0,
          processingMethod: 'json',
          processingTime: 0,
        },
        parseConfidence: 1.0,
        totalVariance: 0,
        validationResult: {
          isValid: true,
          confidence: 1.0,
          totalVariance: 0,
          toleranceExceeded: false,
          missingFields: [],
          anomalies: [],
        },
        processingMethod: 'json',
        processingTime: 0,
      },
    });

    console.log('✅ EnhancedBill created successfully');
    console.log(`   EnhancedBill ID: ${enhancedBill.id}`);
    console.log(`   Original Bill ID: ${enhancedBill.originalBillId}`);
    console.log(`   Parse Confidence: ${enhancedBill.parseConfidence}`);
    console.log(`   Processing Method: ${enhancedBill.processingMethod}`);

    return enhancedBill;
  } catch (error) {
    console.error('❌ EnhancedBill creation failed:', error);
    throw error;
  }
}

/**
 * Test 8: Cleanup Test Data
 */
async function testCleanup(projectId: string) {
  console.log('\n📊 Test 8: Cleanup Test Data');
  console.log('='.repeat(50));

  try {
    // Delete project (cascade will delete bills and enhanced bills)
    await prisma.project.delete({
      where: { id: projectId },
    });

    console.log('✅ Test data cleaned up successfully');
    return true;
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('\n🚀 Starting Bill Parsing and Database Tests');
  console.log('='.repeat(50));

  let projectId: string | undefined;
  let billId: string | undefined;

  try {
    // Test 1: Database Connection
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }

    // Test 2: Create Project
    const project = await testCreateProject();
    projectId = project.id;

    // Test 3: Load Sample Bill
    const billData = await testLoadSampleBill();

    // Test 4: Save Bill
    const bill = await testSaveBill(projectId, billData);
    billId = bill.id;

    // Test 5: Retrieve Bill
    await testRetrieveBill(billId);

    // Test 6: Verify Schema
    await testSchemaStructure(billId);

    // Test 7: Enhanced Bill
    await testEnhancedBill(billId, billData);

    // Test 8: Cleanup
    await testCleanup(projectId);

    console.log('\n' + '='.repeat(50));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(50));

    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(50));
    console.error('❌ TEST SUITE FAILED');
    console.error('='.repeat(50));
    console.error(error);

    // Attempt cleanup on failure
    if (projectId) {
      try {
        await prisma.project.delete({ where: { id: projectId } });
        console.log('\n🧹 Cleaned up test data after failure');
      } catch (cleanupError) {
        console.error('⚠️  Failed to cleanup test data:', cleanupError);
      }
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
runTests();
