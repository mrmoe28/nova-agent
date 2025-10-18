import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Run tests serially to avoid conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Run one test at a time
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000', // Fixed to match actual server
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Increase default timeouts for OCR processing
    actionTimeout: 30000, // 30 seconds for actions
    navigationTimeout: 30000, // 30 seconds for navigation
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Increase timeouts for OCR processing operations
  timeout: 240000, // 4 minutes per test (Claude AI needs 2+ minutes)
  expect: {
    timeout: 20000, // 20 seconds for assertions
  },

  // Configure web server - let it use existing server
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true, // Use existing server if available
    timeout: 120000,
  },
});