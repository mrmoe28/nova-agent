const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  try {
    // Navigate to projects page to find a project
    await page.goto('http://localhost:3003/projects', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Try to find a project link
    const projectLinks = await page.$$('a[href*="/wizard/"]');

    if (projectLinks.length > 0) {
      // Click the first project to navigate to it
      const projectHref = await projectLinks[0].getAttribute('href');
      console.log('Found project:', projectHref);

      // Extract project ID and navigate to review page
      const projectId = projectHref.split('/')[2];
      await page.goto(`http://localhost:3003/wizard/${projectId}/review`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Take screenshot
      await page.screenshot({ path: 'review-page-screenshot.png', fullPage: true });
      console.log('Screenshot saved as review-page-screenshot.png');
    } else {
      // No projects found, try to navigate to a generic review page
      console.log('No projects found. Taking screenshot of projects page instead.');
      await page.screenshot({ path: 'projects-page-screenshot.png', fullPage: true });
      console.log('Screenshot saved as projects-page-screenshot.png');
    }
  } catch (error) {
    console.error('Error:', error.message);
    // Take screenshot of current page anyway
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
  }

  await browser.close();
})();
