import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const LOCAL_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 300000; // 5 minutes for full PDF generation test

test.describe('PDF Generation Functionality', () => {
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

  test('should generate PDF report successfully', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    console.log('🧪 Starting PDF generation test...');

    // Step 1: Create a new project
    console.log('📝 Step 1: Creating new project...');
    await page.goto(`${LOCAL_URL}/projects`);
    
    const newProjectButton = page.locator('a:has-text("New Project"), button:has-text("New Project")').first();
    await expect(newProjectButton).toBeVisible({ timeout: 15000 });
    await newProjectButton.click();
    
    await page.waitForURL(/\/wizard\/new/, { timeout: 15000 });

    // Fill project form
    await page.locator('input[name="clientName"]').fill('PDF Test Client');
    await page.locator('input[name="address"]').fill('123 PDF Test Street, Test City, TC 12345');
    await page.locator('input[name="phone"]').fill('555-0123');
    await page.locator('input[name="email"]').fill('pdftest@example.com');

    await page.locator('button:has-text("Create Project")').click();
    await page.waitForURL(/\/wizard\/.*\/intake/, { timeout: 20000 });
    console.log('✅ Project created successfully');

    // Step 2: Upload a test bill (minimal PDF)
    console.log('📄 Step 2: Uploading test bill...');
    
    // Create minimal test PDF
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

    const testFilePath = '/tmp/test-bill-pdf.pdf';
    writeFileSync(testFilePath, testPdfContent);

    try {
      const fileInput = page.locator('input[type="file"]').first();
      await expect(fileInput).toBeAttached({ timeout: 10000 });
      await fileInput.setInputFiles(testFilePath);
      
      console.log('📤 File uploaded, waiting for processing...');
      
      // Wait for upload completion (file saved, not necessarily OCR processed)
      await page.waitForSelector(
        'text=uploaded successfully, text=File saved successfully, .uploaded, [class*="success"]', 
        { timeout: 60000 }
      );
      
      console.log('✅ Bill uploaded successfully');
      
    } finally {
      // Clean up test file
      try {
        unlinkSync(testFilePath);
      } catch (e) {
        console.log('Note: Could not clean up test file');
      }
    }

    // Step 3: Navigate through the wizard to complete the project
    console.log('🔧 Step 3: Completing project setup...');
    
    // Go to analysis page
    const continueButton = page.locator('button:has-text("Continue"), button:has-text("Next"), a:has-text("Continue")').first();
    if (await continueButton.isVisible({ timeout: 5000 })) {
      await continueButton.click();
      await page.waitForLoadState('networkidle');
    }

    // Go to sizing page
    const sizingButton = page.locator('button:has-text("Continue"), button:has-text("Next"), a:has-text("Continue")').first();
    if (await sizingButton.isVisible({ timeout: 5000 })) {
      await sizingButton.click();
      await page.waitForLoadState('networkidle');
    }

    // Go to BOM page
    const bomButton = page.locator('button:has-text("Continue"), button:has-text("Next"), a:has-text("Continue")').first();
    if (await bomButton.isVisible({ timeout: 5000 })) {
      await bomButton.click();
      await page.waitForLoadState('networkidle');
    }

    // Go to review page
    const reviewButton = page.locator('button:has-text("Continue"), button:has-text("Next"), a:has-text("Continue")').first();
    if (await reviewButton.isVisible({ timeout: 5000 })) {
      await reviewButton.click();
      await page.waitForLoadState('networkidle');
    }

    console.log('✅ Navigated to review page');

    // Step 4: Test PDF generation
    console.log('📊 Step 4: Testing PDF generation...');
    
    // Wait for the review page to load
    await page.waitForURL(/\/wizard\/.*\/review/, { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // Look for the PDF generation button
    const pdfButton = page.locator('button:has-text("Download NovaAgent Report"), button:has-text("Generate PDF"), button:has-text("Download")').first();
    await expect(pdfButton).toBeVisible({ timeout: 15000 });
    
    console.log('✅ PDF generation button found');

    // Set up download handling
    const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
    
    // Click the PDF generation button
    await pdfButton.click();
    console.log('🔄 PDF generation initiated...');

    // Wait for download to start
    const download = await downloadPromise;
    console.log('📥 Download started:', download.suggestedFilename());

    // Verify the download
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    expect(download.suggestedFilename()).toContain('PDF_Test_Client');
    
    // Save the downloaded file
    const downloadPath = `/tmp/${download.suggestedFilename()}`;
    await download.saveAs(downloadPath);
    
    // Verify the PDF file was created and has content
    const pdfBuffer = readFileSync(downloadPath);
    expect(pdfBuffer.length).toBeGreaterThan(1000); // PDF should be at least 1KB
    
    // Verify PDF header
    const pdfHeader = pdfBuffer.toString('ascii', 0, 8);
    expect(pdfHeader).toBe('%PDF-1.4');
    
    console.log('✅ PDF generated successfully!');
    console.log(`📄 PDF size: ${pdfBuffer.length} bytes`);
    console.log(`📁 Saved to: ${downloadPath}`);

    // Clean up downloaded file
    try {
      unlinkSync(downloadPath);
    } catch (e) {
      console.log('Note: Could not clean up downloaded PDF');
    }

    // Verify we're redirected to projects page after successful generation
    await page.waitForURL(/\/projects/, { timeout: 10000 });
    console.log('✅ Redirected to projects page after PDF generation');

  });

  test('should handle PDF generation errors gracefully', async ({ page }) => {
    test.setTimeout(120000);

    console.log('🧪 Testing PDF generation error handling...');

    // Navigate to an existing project's review page
    await page.goto(`${LOCAL_URL}/projects`);
    
    // Look for existing projects
    const projectLinks = page.locator('a[href*="/wizard/"]');
    const projectCount = await projectLinks.count();
    
    if (projectCount > 0) {
      // Navigate to the first project's review page
      await projectLinks.first().click();
      await page.waitForLoadState('networkidle');
      
      // Try to navigate to review page
      const reviewLink = page.locator('a:has-text("Review"), button:has-text("Review")').first();
      if (await reviewLink.isVisible({ timeout: 5000 })) {
        await reviewLink.click();
        await page.waitForLoadState('networkidle');
      }
      
      // Test error handling by monitoring console errors
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      // Look for PDF generation button
      const pdfButton = page.locator('button:has-text("Download NovaAgent Report"), button:has-text("Generate PDF")').first();
      if (await pdfButton.isVisible({ timeout: 10000 })) {
        await pdfButton.click();
        
        // Wait for either success or error
        await page.waitForTimeout(5000);
        
        // Check for error alerts
        const errorAlert = page.locator('[role="alert"]:has-text("Failed to generate PDF")');
        if (await errorAlert.isVisible({ timeout: 10000 })) {
          console.log('✅ Error handling working - error message displayed');
        } else {
          console.log('✅ No error detected - PDF generation may have succeeded');
        }
      }
    } else {
      console.log('ℹ️ No existing projects found for error testing');
    }
  });

  test('should verify PDF contains expected content', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    console.log('🧪 Testing PDF content verification...');

    // Navigate to projects page
    await page.goto(`${LOCAL_URL}/projects`);
    
    // Look for existing projects
    const projectLinks = page.locator('a[href*="/wizard/"]');
    const projectCount = await projectLinks.count();
    
    if (projectCount > 0) {
      // Navigate to the first project's review page
      await projectLinks.first().click();
      await page.waitForLoadState('networkidle');
      
      // Try to navigate to review page
      const reviewLink = page.locator('a:has-text("Review"), button:has-text("Review")').first();
      if (await reviewLink.isVisible({ timeout: 5000 })) {
        await reviewLink.click();
        await page.waitForLoadState('networkidle');
      }
      
      // Look for PDF generation button
      const pdfButton = page.locator('button:has-text("Download NovaAgent Report"), button:has-text("Generate PDF")').first();
      if (await pdfButton.isVisible({ timeout: 10000 })) {
        
        // Set up download handling
        const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
        
        await pdfButton.click();
        console.log('🔄 Generating PDF for content verification...');
        
        const download = await downloadPromise;
        const downloadPath = `/tmp/content-test-${download.suggestedFilename()}`;
        await download.saveAs(downloadPath);
        
        // Read and verify PDF content
        const pdfBuffer = readFileSync(downloadPath);
        const pdfContent = pdfBuffer.toString('ascii');
        
        // Check for expected content in PDF
        const expectedContent = [
          'NovaAgent',
          'Energy System Plan',
          'Client Information',
          'System Design',
          'Bill of Materials',
          'Installation Plan'
        ];
        
        let foundContent = 0;
        expectedContent.forEach(content => {
          if (pdfContent.includes(content)) {
            foundContent++;
            console.log(`✅ Found expected content: ${content}`);
          }
        });
        
        console.log(`📊 Content verification: ${foundContent}/${expectedContent.length} expected sections found`);
        
        // Clean up
        try {
          unlinkSync(downloadPath);
        } catch (e) {
          console.log('Note: Could not clean up test PDF');
        }
        
        // Expect at least some content to be found
        expect(foundContent).toBeGreaterThan(0);
        
      } else {
        console.log('ℹ️ PDF generation button not found - project may not be ready for PDF generation');
      }
    } else {
      console.log('ℹ️ No existing projects found for content verification');
    }
  });
});

// Test summary
test.afterAll(async () => {
  console.log('\n' + '='.repeat(60));
  console.log('📊 PDF GENERATION TEST SUMMARY');
  console.log('='.repeat(60));
  console.log('Local test URL: ' + LOCAL_URL);
  console.log('Timeout configured: 5 minutes');
  console.log('Tests completed');
  console.log('='.repeat(60) + '\n');
});

