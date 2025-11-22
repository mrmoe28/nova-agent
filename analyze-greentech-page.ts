import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, ".env.local") });

import { scrapeCompanyInfo, isProductPageUrl } from "./src/lib/scraper";

const url = "https://www.greentechrenewables.com/products/solar-inverters";

async function analyze() {
  console.log("🔍 Analyzing Greentech Renewables page...\n");
  console.log(`URL: ${url}`);
  console.log(`Is Product Page: ${isProductPageUrl(url)}\n`);

  console.log("Expected: This should be FALSE (it's a category page)");
  console.log("\nLet's scrape and see what the page actually is:");

  try {
    const info = await scrapeCompanyInfo(url, {
      rateLimit: 500,
      timeout: 10000,
      respectRobotsTxt: true,
    });

    console.log("\n📦 Page Info:");
    console.log(`Company Name: ${info.name || "N/A"}`);
    console.log(`Product Links Found: ${info.productLinks?.length || 0}`);
    console.log(`Catalog Pages Found: ${info.catalogPages?.length || 0}`);

    if (info.productLinks && info.productLinks.length > 0) {
      console.log("\n🔗 Sample Product Links (first 10):");
      info.productLinks.slice(0, 10).forEach((link, idx) => {
        console.log(`${idx + 1}. ${link}`);
      });
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
  }
}

analyze()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
