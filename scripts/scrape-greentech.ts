#!/usr/bin/env tsx

/**
 * CLI script to scrape Greentech Renewables solar inverters
 *
 * Usage:
 *   tsx scripts/scrape-greentech.ts [options]
 *
 * Options:
 *   --format <json|csv>     Output format (default: json)
 *   --output <path>         Output file path (default: greentech-inverters.json)
 *   --skip-details          Skip detail page scraping (faster, less data)
 *   --max-detail-pages <n>  Limit detail page scraping to n pages
 *   --rate-limit <ms>       Delay between requests in milliseconds (default: 2000)
 *
 * Examples:
 *   tsx scripts/scrape-greentech.ts
 *   tsx scripts/scrape-greentech.ts --format csv --output inverters.csv
 *   tsx scripts/scrape-greentech.ts --skip-details --rate-limit 1000
 *   tsx scripts/scrape-greentech.ts --max-detail-pages 10
 */

import { writeFile } from "fs/promises";
import { scrapeGreentechInverters, exportToJson, exportToCsv } from "../src/lib/greentech-scraper";
import { createLogger } from "../src/lib/logger";

const logger = createLogger("scrape-greentech-cli");

interface CliOptions {
  format: "json" | "csv";
  output: string;
  skipDetails: boolean;
  maxDetailPages?: number;
  rateLimit: number;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    format: "json",
    output: "greentech-inverters.json",
    skipDetails: false,
    rateLimit: 2000,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--format":
        options.format = args[++i] as "json" | "csv";
        break;
      case "--output":
        options.output = args[++i];
        break;
      case "--skip-details":
        options.skipDetails = true;
        break;
      case "--max-detail-pages":
        options.maxDetailPages = parseInt(args[++i], 10);
        break;
      case "--rate-limit":
        options.rateLimit = parseInt(args[++i], 10);
        break;
      case "--help":
      case "-h":
        console.log(`
Greentech Renewables Solar Inverter Scraper

Usage:
  tsx scripts/scrape-greentech.ts [options]

Options:
  --format <json|csv>     Output format (default: json)
  --output <path>         Output file path (default: greentech-inverters.json)
  --skip-details          Skip detail page scraping (faster, less data)
  --max-detail-pages <n>  Limit detail page scraping to n pages
  --rate-limit <ms>       Delay between requests in milliseconds (default: 2000)
  --help, -h              Show this help message

Examples:
  tsx scripts/scrape-greentech.ts
  tsx scripts/scrape-greentech.ts --format csv --output inverters.csv
  tsx scripts/scrape-greentech.ts --skip-details --rate-limit 1000
  tsx scripts/scrape-greentech.ts --max-detail-pages 10
        `);
        process.exit(0);
        break;
      default:
        logger.warn({ arg }, "Unknown argument, ignoring");
    }
  }

  // Auto-adjust output extension based on format
  if (options.format === "csv" && options.output.endsWith(".json")) {
    options.output = options.output.replace(".json", ".csv");
  } else if (options.format === "json" && options.output.endsWith(".csv")) {
    options.output = options.output.replace(".csv", ".json");
  }

  return options;
}

async function main() {
  const options = parseArgs();

  logger.info({
    format: options.format,
    output: options.output,
    skipDetails: options.skipDetails,
    maxDetailPages: options.maxDetailPages,
    rateLimit: options.rateLimit,
  }, "Starting Greentech scraper");

  try {
    const startTime = Date.now();

    // Run the scraper
    const { products, filters, stats } = await scrapeGreentechInverters({
      skipDetailPages: options.skipDetails,
      maxDetailPages: options.maxDetailPages,
      rateLimit: options.rateLimit,
      respectRobotsTxt: true,
      timeout: 30000,
      maxRetries: 3,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    logger.info({
      totalProducts: products.length,
      filterCount: filters.length,
      listingPages: stats.listingPages,
      detailPages: stats.detailPages,
      duration: `${duration}s`,
    }, "Scraping completed");

    // Export to file
    let content: string;
    if (options.format === "csv") {
      content = exportToCsv(products);
    } else {
      content = exportToJson(products);
    }

    await writeFile(options.output, content, "utf-8");

    logger.info({
      file: options.output,
      size: `${(content.length / 1024).toFixed(2)} KB`,
      productCount: products.length,
    }, "Export complete");

    // Also export filters to a separate file
    if (filters.length > 0) {
      const filtersFile = options.output.replace(/\.(json|csv)$/, "-filters.json");
      await writeFile(filtersFile, JSON.stringify(filters, null, 2), "utf-8");
      logger.info({ file: filtersFile, filterCount: filters.length }, "Filters exported");
    }

    // Print summary
    console.log("\n=== Scraping Summary ===");
    console.log(`Total Products: ${products.length}`);
    console.log(`Listing Pages: ${stats.listingPages}`);
    console.log(`Detail Pages: ${stats.detailPages}`);
    console.log(`Filters Found: ${filters.length}`);
    console.log(`Duration: ${duration}s`);
    console.log(`Output: ${options.output}`);
    if (filters.length > 0) {
      console.log(`Filters: ${options.output.replace(/\.(json|csv)$/, "-filters.json")}`);
    }

    process.exit(0);
  } catch (error) {
    logger.error({ error }, "Scraping failed");
    console.error("Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
