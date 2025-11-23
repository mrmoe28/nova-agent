const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  try {
    // Navigate to projects page
    await page.goto('http://localhost:3003/projects', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Try to find project cards or links with actual project IDs
    const projectCards = await page.$$('[href*="/projects/"]');

    if (projectCards.length > 0) {
      // Get the href of the first project
      const href = await projectCards[0].getAttribute('href');
      const projectId = href.split('/').pop();

      console.log('Found project ID:', projectId);

      // Navigate to review page
      const reviewUrl = `http://localhost:3003/wizard/${projectId}/review`;
      console.log('Navigating to:', reviewUrl);

      await page.goto(reviewUrl, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Take screenshot
      await page.screenshot({ path: 'review-page-screenshot.png', fullPage: true });
      console.log('Screenshot saved as review-page-screenshot.png');
    } else {
      console.log('No existing projects found. Taking screenshot of projects list page.');
      await page.screenshot({ path: 'projects-list-screenshot.png', fullPage: true });
      console.log('Screenshot saved as projects-list-screenshot.png');
      console.log('\nPlease create a project first or provide a project ID.');
    }
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
  }

  // Keep browser open for 5 seconds so user can see it
  await page.waitForTimeout(5000);
  await browser.close();
})();
