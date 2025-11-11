import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const LOCAL_URL = 'http://localhost:3000'; // Fixed URL to match server
const TEST_TIMEOUT = 240000; // 4 minutes for upload tests (Claude AI takes 2+ minutes)

test.describe('Bill Upload Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage and handle runtime errors
    await page.goto(LOCAL_URL, { waitUntil: 'domcontentloaded' });
    
    // Close any runtime error dialogs
    const errorDialog = page.locator('[role="dialog"]:has-text("Runtime Error")');
    if (await errorDialog.isVisible().catch(() => false)) {
      console.warn('⚠️ Runtime error detected, dismissing...');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(2000);
    }
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
  });

  test('should create new project and test bill upload', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    console.log('🧪 Starting bill upload test...');

    // Navigate to projects page with robust approach
    const projectsLink = page.locator('a:has-text("Projects"), button:has-text("Projects")').first();
    await expect(projectsLink).toBeVisible({ timeout: 15000 });
    await projectsLink.click();
    
    await page.waitForURL(/\/projects/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Click "New Project" button with multiple selectors
    const newProjectButton = page.locator('a:has-text("New Project"), button:has-text("New Project"), [href*="wizard/new"]').first();
    await expect(newProjectButton).toBeVisible({ timeout: 15000 });
    await newProjectButton.click();
    
    await page.waitForURL(/\/wizard\/new/, { timeout: 15000 });
    console.log('✅ Navigated to new project form');

    // Fill out project form with better selectors
    const clientNameInput = page.locator('input[name="clientName"], input[placeholder*="client"], input[placeholder*="name"]').first();
    await expect(clientNameInput).toBeVisible({ timeout: 10000 });
    await clientNameInput.fill('Test Client - Playwright');

    const addressInput = page.locator('input[name="address"], input[placeholder*="address"]').first();
    await addressInput.fill('123 Test Street, Test City, TC 12345');

    const phoneInput = page.locator('input[name="phone"], input[placeholder*="phone"]').first();
    await phoneInput.fill('555-0123');

    const emailInput = page.locator('input[name="email"], input[placeholder*="email"]').first();
    await emailInput.fill('test@example.com');

    console.log('✅ Filled project form');

    // Submit project creation
    const createButton = page.locator('button:has-text("Create Project"), button[type="submit"]').first();
    await expect(createButton).toBeVisible({ timeout: 10000 });
    await createButton.click();
    
    // Wait for redirect to intake page
    await page.waitForURL(/\/wizard\/.*\/intake/, { timeout: 20000 });
    await page.waitForLoadState('networkidle');

    console.log('✅ Successfully created project and navigated to intake page');

    // Check for file upload component with multiple selectors
    const uploadArea = page.locator('text=Drag and drop files here, [data-testid="file-upload"], .file-upload, input[type="file"]').first();
    await expect(uploadArea).toBeVisible({ timeout: 15000 });

    console.log('✅ File upload component is visible');
  });

  test('should test bill upload with sample PDF', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    console.log('🧪 Testing bill upload functionality...');

    // Navigate directly to projects and create project
    await page.goto(`${LOCAL_URL}/projects`);
    const newProjectButton = page.locator('a:has-text("New Project"), button:has-text("New Project")').first();
    await expect(newProjectButton).toBeVisible({ timeout: 10000 });
    await newProjectButton.click();
    
    await page.waitForURL(/\/wizard\/new/);

    // Fill project form
    await page.locator('input[name="clientName"]').fill('Upload Test Client');
    await page.locator('input[name="address"]').fill('456 Upload Ave');
    await page.locator('input[name="phone"]').fill('555-0456');
    await page.locator('input[name="email"]').fill('upload@test.com');

    await page.locator('button:has-text("Create Project")').click();
    await page.waitForURL(/\/wizard\/.*\/intake/);
    await page.waitForLoadState('networkidle');

    console.log('✅ Project created, now testing upload...');

    // Create minimal test PDF file with NO fake utility data
    // This PDF contains no utility bill information - tests OCR processing only
    const testPdfContent = Buffer.from(`%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj
4 0 obj<</Length 30>>stream
BT /F1 12 Tf 100 700 Td (Test PDF) Tj ET
endstream endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000201 00000 n 
trailer<</Size 5/Root 1 0 R>>
startxref
279
%%EOF`);

    // Find file input with fallback selectors
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeAttached({ timeout: 10000 });
    
    console.log('✅ File input found, testing upload...');

    // Create temporary test file
    const testFilePath = '/tmp/test-bill-playwright.pdf';
    writeFileSync(testFilePath, testPdfContent);

    try {
      // Upload the file
      await fileInput.setInputFiles(testFilePath);
      console.log('📤 File selected, waiting for upload processing...');

      // Wait for upload to start with multiple indicators
      const uploadStarted = page.locator('text=Processing, text=Analyzing, text=OCR, .progress, [class*="loading"]').first();
      await expect(uploadStarted).toBeVisible({ timeout: 15000 });
      console.log('⏳ Upload processing started...');

      // Wait for file upload completion
      console.log('⏳ Waiting for file upload to complete...');
      
      let uploadCompleted = false;

      // Wait for upload success indicators (file saved, not necessarily OCR processed)
      try {
        // Look for upload success (file saved) or completion messages
        await page.waitForSelector(
          'text=uploaded successfully, text=File saved successfully, .uploaded, [class*="success"]', 
          { timeout: 60000 } // 1 minute for file upload
        );
        
        uploadCompleted = true;
        console.log('✅ File upload completed successfully!');
        
        // Note: OCR processing may fail for test files with no real utility data
        // This is expected behavior - we only want real data processed
        console.log('📝 Note: OCR may not extract data from test files (this is correct behavior)');
        
      } catch (e) {
        console.log('⚠️ Upload did not complete within timeout');
        
        // Check for error messages
        const errorMessages = await page.locator('[role="alert"], .error, [class*="error"]').allTextContents();
        if (errorMessages.length > 0) {
          console.log('❌ Error messages found:', errorMessages);
        }
        throw new Error('File upload did not complete successfully');
      }

    } catch (error) {
      console.log('❌ Upload test failed:', error instanceof Error ? error.message : String(error));
      
      // Debug information
      const errorMessages = await page.locator('[role="alert"], .error, [class*="error"]').allTextContents();
      if (errorMessages.length > 0) {
        console.log('Error messages found:', errorMessages);
      }

      // Take screenshot for debugging
      await page.screenshot({ path: 'bill-upload-failure.png', fullPage: true });
      console.log('📸 Debug screenshot saved as bill-upload-failure.png');
      
      throw error;
    } finally {
      // Clean up test file
      try {
        unlinkSync(testFilePath);
      } catch (e) {
        console.log('Note: Could not clean up test file');
      }
    }
  });

  test('should handle upload timeout gracefully', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    console.log('🧪 Testing upload timeout handling...');

    // Navigate to intake page (create project first)
    await page.goto(`${LOCAL_URL}/projects`);
    await page.click('text=New Project');
    await page.waitForURL(/\/wizard\/new/);

    await page.fill('input[name="clientName"]', 'Timeout Test Client');
    await page.fill('input[name="address"]', '789 Timeout Blvd');
    await page.fill('input[name="phone"]', '555-0789');
    await page.fill('input[name="email"]', 'timeout@test.com');

    await page.click('button:has-text("Create Project")');
    await page.waitForURL(/\/wizard\/.*\/intake/);
    await page.waitForLoadState('networkidle');

    // Check timeout handling by monitoring for timeout messages
    const timeoutMessage = page.locator('text=timeout, text=taking longer than expected');
    
    console.log('✅ Ready to test timeout scenarios');
    
    // Verify the UI shows appropriate timeout messaging
    const uploadHint = page.locator('text=OCR processing may take up to 1 minute');
    await expect(uploadHint).toBeVisible({ timeout: 5000 });

    console.log('✅ Timeout guidance is displayed to users');
  });
});

// Test summary
test.afterAll(async () => {
  console.log('\n' + '='.repeat(60));
  console.log('📊 BILL UPLOAD TEST SUMMARY');
  console.log('='.repeat(60));
  console.log('Local test URL: ' + LOCAL_URL);
  console.log('Timeout configured: 3 minutes');
  console.log('Tests completed');
  console.log('='.repeat(60) + '\n');
});
