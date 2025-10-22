import { test, expect } from '@playwright/test';

// Production URL - replace with your actual Vercel URL
const PRODUCTION_URL = 'https://novaagent-kappa.vercel.app';

test.describe('Production Deployment Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for production testing
    test.setTimeout(60000);
  });

  test('Homepage loads successfully', async ({ page }) => {
    console.log('Testing homepage at:', PRODUCTION_URL);
    
    const response = await page.goto(PRODUCTION_URL, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    expect(response?.status()).toBe(200);
    expect(page).toHaveTitle(/NovaAgent/);
    
    // Check for key elements
    await expect(page.locator('h1, h2, h3')).toContainText(/NovaAgent|Energy|Solar/);
  });

  test('API Projects endpoint works', async ({ page }) => {
    console.log('Testing /api/projects endpoint...');
    
    const response = await page.request.get(`${PRODUCTION_URL}/api/projects`);
    
    console.log('Projects API Status:', response.status());
    console.log('Projects API Response:', await response.text());
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('success');
    expect(data.success).toBe(true);
  });

  test('API Upload endpoint accessible', async ({ page }) => {
    console.log('Testing /api/upload endpoint...');
    
    // Test with a simple POST request (without file)
    const response = await page.request.post(`${PRODUCTION_URL}/api/upload`, {
      data: new FormData() // Empty form data to test endpoint accessibility
    });
    
    console.log('Upload API Status:', response.status());
    console.log('Upload API Response:', await response.text());
    
    // Should return 400 (bad request) not 500 (server error)
    expect(response.status()).toBe(400);
  });

  test('Projects page loads without errors', async ({ page }) => {
    console.log('Testing /projects page...');
    
    const response = await page.goto(`${PRODUCTION_URL}/projects`, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    expect(response?.status()).toBe(200);
    
    // Check for projects page content
    await expect(page.locator('h1, h2, h3')).toContainText(/Projects|Client/);
    
    // Check for any console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Wait a bit for any async operations
    await page.waitForTimeout(2000);
    
    // Filter out expected errors (like 404s for missing resources)
    const criticalErrors = errors.filter(error => 
      !error.includes('404') && 
      !error.includes('favicon') &&
      !error.includes('Failed to load resource')
    );
    
    console.log('Console errors found:', criticalErrors);
    expect(criticalErrors).toHaveLength(0);
  });

  test('Dashboard loads successfully', async ({ page }) => {
    console.log('Testing /dashboard page...');
    
    const response = await page.goto(`${PRODUCTION_URL}/dashboard`, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    expect(response?.status()).toBe(200);
    
    // Check for dashboard content
    await expect(page.locator('h1, h2, h3')).toContainText(/Dashboard|Overview/);
  });

  test('No 500 errors in network requests', async ({ page }) => {
    console.log('Testing for 500 errors...');
    
    const failedRequests: string[] = [];
    
    page.on('response', response => {
      if (response.status() >= 500) {
        failedRequests.push(`${response.url()} - ${response.status()}`);
      }
    });
    
    // Navigate to main pages
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle' });
    await page.goto(`${PRODUCTION_URL}/projects`, { waitUntil: 'networkidle' });
    await page.goto(`${PRODUCTION_URL}/dashboard`, { waitUntil: 'networkidle' });
    
    // Wait for any pending requests
    await page.waitForTimeout(3000);
    
    console.log('Failed requests (500+ status):', failedRequests);
    expect(failedRequests).toHaveLength(0);
  });

  test('Font loading works (system fonts)', async ({ page }) => {
    console.log('Testing font loading...');
    
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle' });
    
    // Check that text is rendered (indicating fonts are working)
    const textElements = await page.locator('body').allTextContents();
    expect(textElements.length).toBeGreaterThan(0);
    
    // Check computed styles to ensure fonts are applied
    const bodyElement = page.locator('body');
    const fontFamily = await bodyElement.evaluate(el => 
      window.getComputedStyle(el).fontFamily
    );
    
    console.log('Font family applied:', fontFamily);
    expect(fontFamily).toBeTruthy();
  });

  test('Build artifacts are accessible', async ({ page }) => {
    console.log('Testing build artifacts...');
    
    // Test that static assets are accessible
    const faviconResponse = await page.request.get(`${PRODUCTION_URL}/favicon.ico`);
    console.log('Favicon status:', faviconResponse.status());
    
    // Test that the app loads without build errors
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle' });
    
    // Check for any build-related errors in console
    const buildErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && 
          (msg.text().includes('webpack') || 
           msg.text().includes('build') || 
           msg.text().includes('compilation'))) {
        buildErrors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    
    console.log('Build errors found:', buildErrors);
    expect(buildErrors).toHaveLength(0);
  });
});
