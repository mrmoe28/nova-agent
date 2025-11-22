import { test, expect } from '@playwright/test';

test.describe('Enhanced Analysis UI', () => {

  const mockEnhancedAnalysis = {
    "projectId": "clxyo83is000011ocq46ag8p0",
    "monthlyUsageKwh": 1500,
    "averageCostPerKwh": 0.18,
    "latitude": 34.05,
    "longitude": -118.25,
    "annualSolarProductionKwh": 12500,
    "energyOffsetPercentage": 69.44,
    "estimatedAnnualSavingsUsd": 2250,
    "grossSystemCost": 18750,
    "netSystemCost": 13125,
    "totalIncentivesValue": 5625,
    "lcoe": 0.08,
    "npv": 15000,
    "irr": 0.12, // 12%
    "recommendations": "[]",
    "persisted": false
  };

  test('should display enhanced analysis metrics when data is available', async ({ page }) => {
    // 1. Mock the API response for the enhanced analysis endpoint
    await page.route('**/api/analyze/enhanced', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          analysis: mockEnhancedAnalysis,
        }),
      });
    });

    // 2. Navigate to a project page
    // The specific project ID doesn't matter as we are mocking the response.
    await page.goto('/projects/clxyo83is000011ocq46ag8p0');

    // 3. Wait for the loading spinner to disappear and the analysis card to be present
    await expect(page.getByText('Running enhanced analysis...')).toBeHidden({ timeout: 15000 });
    await expect(page.getByText('Enhanced Energy Analysis')).toBeVisible();

    // 4. Assert that the new metrics are displayed correctly
    // Check for LCOE
    const lcoeCard = page.getByText('LCOE').first().locator('..');
    await expect(lcoeCard.getByText('$0.080')).toBeVisible();

    // Check for IRR and NPV
    const irrCard = page.getByText('IRR').first().locator('..');
    await expect(irrCard.getByText('12.0%')).toBeVisible();
    await expect(irrCard.getByText('NPV: $15,000.00')).toBeVisible();

    // Check for Production
    const productionCard = page.getByText('Est. Production').first().locator('..');
    await expect(productionCard.getByText('12,500')).toBeVisible();
    await expect(productionCard.getByText('kWh/yr (PVWatts)')).toBeVisible();

    // Check for Offset
    const offsetCard = page.getByText('Energy Offset').first().locator('..');
    await expect(offsetCard.getByText('69%')).toBeVisible();
    await expect(offsetCard.getByText('$2,250.00 Saved/yr')).toBeVisible();
    
    // Check the main cost card
    const costCard = page.getByText('Estimated Net Cost').first().locator('..');
    await expect(costCard.getByText('$13,125.00')).toBeVisible();
    await expect(costCard.getByText('$18,750 Gross - $5,625 Incentives')).toBeVisible();
  });

  test('should show a message if enhanced analysis fails to load', async ({ page }) => {
    // 1. Mock a failed API response
    await page.route('**/api/analyze/enhanced', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal Server Error',
        }),
      });
    });

    // 2. Navigate to the project page
    await page.goto('/projects/clxyo83is000011ocq46ag8p0');

    // 3. Wait for the loading spinner to disappear
    await expect(page.getByText('Running enhanced analysis...')).toBeHidden({ timeout: 15000 });

    // 4. Assert that the error message is displayed
    await expect(page.getByText('Could not load enhanced analysis.')).toBeVisible();
  });

});
