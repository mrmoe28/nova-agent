import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scrapeCompanyInfo, deepCrawlForProducts, type ScrapedCompany } from "@/lib/scraper";
import { categorizeProduct } from "@/lib/categorize-product";
import { createLogger } from "@/lib/logger";
import { AIAgentScraper } from "@/lib/ai-agent-scraper";
import { getBrowserScraper, closeBrowserScraper } from "@/lib/browser-scraper-bql";

const logger = createLogger("distributor-discovery");

// Maximum duration for this endpoint (Vercel timeout)
export const maxDuration = 60;

interface DistributorCandidate {
  url: string;
  name?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  description?: string;
  logoUrl?: string;
  confidence: number;
  solarRelevance: number;
  productTypes: string[];
  productCount: number;
  reasoning: string;
}

/**
 * POST /api/distributors/discover
 * 
 * Intelligently discover and evaluate potential solar/battery equipment distributors from any URL.
 * This endpoint can:
 * 1. Analyze a single URL to determine if it's a relevant distributor
 * 2. Process a list of URLs to find the best distributor candidates
 * 3. Optionally save promising candidates to the database
 * 4. Use AI-powered analysis for complex sites
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      url,
      urls,
      saveToDatabase = false,
      useAI = false,
      useBrowser = false,
      analysisOnly = false, // If true, only analyze without deep scraping
    } = body;

    if (!url && !urls) {
      return NextResponse.json(
        { success: false, error: "URL or URLs array is required" },
        { status: 400 }
      );
    }

    const urlsToAnalyze = urls || [url];
    const candidates: DistributorCandidate[] = [];

    logger.info(
      { 
        urlCount: urlsToAnalyze.length, 
        useAI, 
        useBrowser, 
        analysisOnly 
      },
      "Starting distributor discovery"
    );

    for (let i = 0; i < urlsToAnalyze.length; i++) {
      const currentUrl = urlsToAnalyze[i];
      
      try {
        logger.info(
          { url: currentUrl, progress: `${i + 1}/${urlsToAnalyze.length}` },
          "Analyzing potential distributor"
        );

        // Step 1: Basic company information scraping
        const companyInfo = await scrapeCompanyInfo(currentUrl, {
          rateLimit: 300,
          timeout: 8000,
          respectRobotsTxt: true,
          maxRetries: 2,
        });

        // Step 2: Analyze solar/battery relevance
        const solarRelevance = analyzeSolarRelevance(companyInfo);
        
        if (solarRelevance.score < 0.3) {
          logger.info(
            { url: currentUrl, score: solarRelevance.score },
            "URL not relevant to solar/battery industry, skipping"
          );
          continue;
        }

        // Step 3: Enhanced analysis based on mode
        let productAnalysis: { productTypes: string[]; productCount: number; confidence: number } = { 
          productTypes: [], 
          productCount: 0, 
          confidence: 0.5 
        };
        
        if (!analysisOnly) {
          if (useAI && process.env.ANTHROPIC_API_KEY) {
            // Use AI agent for intelligent analysis
            productAnalysis = await analyzeWithAI(currentUrl, companyInfo);
          } else if (useBrowser && process.env.BROWSERLESS_TOKEN) {
            // Use browser scraper for JS-heavy sites
            productAnalysis = await analyzeWithBrowser(currentUrl);
          } else {
            // Use standard crawling
            productAnalysis = await analyzeWithCrawler(currentUrl);
          }
        }

        // Step 4: Calculate overall confidence
        const overallConfidence = calculateConfidence(
          solarRelevance.score,
          productAnalysis.confidence,
          companyInfo,
          productAnalysis.productCount
        );

        if (overallConfidence < 0.4) {
          logger.info(
            { url: currentUrl, confidence: overallConfidence },
            "Confidence too low, skipping"
          );
          continue;
        }

        // Step 5: Create candidate
        const candidate: DistributorCandidate = {
          url: currentUrl,
          name: companyInfo.name,
          contactName: companyInfo.contactName,
          email: companyInfo.email,
          phone: companyInfo.phone,
          address: companyInfo.address,
          description: companyInfo.description,
          logoUrl: companyInfo.logoUrl,
          confidence: overallConfidence,
          solarRelevance: solarRelevance.score,
          productTypes: productAnalysis.productTypes,
          productCount: productAnalysis.productCount,
          reasoning: `Solar relevance: ${(solarRelevance.score * 100).toFixed(0)}%. ${solarRelevance.reasons.join('. ')}. Product analysis: ${productAnalysis.productCount} products found.`,
        };

        candidates.push(candidate);
        logger.info(
          { url: currentUrl, confidence: overallConfidence },
          "Added distributor candidate"
        );

        // Rate limiting between requests
        if (i < urlsToAnalyze.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        logger.error(
          { url: currentUrl, error: error instanceof Error ? error.message : "Unknown error" },
          "Failed to analyze URL"
        );
        continue;
      }
    }

    // Step 6: Sort candidates by confidence
    candidates.sort((a, b) => b.confidence - a.confidence);

    // Step 7: Optionally save to database
    const savedDistributors = [];
    if (saveToDatabase && candidates.length > 0) {
      for (const candidate of candidates.filter(c => c.confidence > 0.6)) {
        try {
          // Check for existing distributor
          const existingDistributor = await prisma.distributor.findFirst({
            where: {
              OR: [
                { website: candidate.url },
                { name: candidate.name || "" },
              ],
            },
          });

          if (existingDistributor) {
            logger.info(
              { url: candidate.url, existingId: existingDistributor.id },
              "Distributor already exists, skipping"
            );
            continue;
          }

          // Create new distributor
          const newDistributor = await prisma.distributor.create({
            data: {
              name: candidate.name || new URL(candidate.url).hostname,
              contactName: candidate.contactName,
              email: candidate.email,
              phone: candidate.phone,
              website: candidate.url,
              address: candidate.address,
              notes: candidate.reasoning,
              logoUrl: candidate.logoUrl,
              scrapeMetadata: JSON.stringify({
                discoveredAt: new Date().toISOString(),
                confidence: candidate.confidence,
                solarRelevance: candidate.solarRelevance,
                productTypes: candidate.productTypes,
                productCount: candidate.productCount,
              }),
              lastScrapedAt: new Date(),
            },
          });

          savedDistributors.push(newDistributor);
          logger.info(
            { distributorId: newDistributor.id, name: newDistributor.name },
            "Saved new distributor"
          );
        } catch (error) {
          logger.error(
            { url: candidate.url, error: error instanceof Error ? error.message : "Unknown error" },
            "Failed to save distributor"
          );
        }
      }
    }

    logger.info(
      { 
        totalAnalyzed: urlsToAnalyze.length,
        candidatesFound: candidates.length,
        saved: savedDistributors.length 
      },
      "Distributor discovery completed"
    );

    return NextResponse.json({
      success: true,
      candidates,
      savedDistributors,
      summary: {
        totalAnalyzed: urlsToAnalyze.length,
        candidatesFound: candidates.length,
        highConfidence: candidates.filter(c => c.confidence > 0.7).length,
        mediumConfidence: candidates.filter(c => c.confidence > 0.5 && c.confidence <= 0.7).length,
        saved: savedDistributors.length,
      },
    });

  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : "Unknown error" },
      "Distributor discovery failed"
    );
    return NextResponse.json(
      { success: false, error: "Failed to discover distributors" },
      { status: 500 }
    );
  }
}

/**
 * Analyze solar/battery industry relevance based on company information
 */
function analyzeSolarRelevance(companyInfo: ScrapedCompany): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // Solar/battery keywords (weighted by importance)
  const keywords = {
    // High relevance
    solar: 0.3,
    battery: 0.3,
    batteries: 0.3,
    inverter: 0.25,
    photovoltaic: 0.3,
    'renewable energy': 0.25,
    // Medium relevance  
    energy: 0.15,
    power: 0.1,
    electrical: 0.1,
    'charge controller': 0.2,
    lithium: 0.15,
    'off grid': 0.2,
    'off-grid': 0.2,
    // Brand names
    'canadian solar': 0.25,
    'big battery': 0.25,
    'battle born': 0.25,
    'eg4': 0.25,
    'enphase': 0.25,
    'solaredge': 0.25,
    'fronius': 0.25,
    'victron': 0.25,
  };

  const text = `${companyInfo.name || ''} ${companyInfo.description || ''} ${companyInfo.website || ''}`.toLowerCase();

  // Check for keywords
  for (const [keyword, weight] of Object.entries(keywords)) {
    if (text.includes(keyword)) {
      score += weight;
      reasons.push(`Contains '${keyword}'`);
    }
  }

  // Check URL patterns
  const url = companyInfo.website || '';
  const solarUrlPatterns = [
    /solar/i,
    /battery/i,
    /batteries/i,
    /energy/i,
    /power/i,
    /renewable/i,
  ];

  for (const pattern of solarUrlPatterns) {
    if (pattern.test(url)) {
      score += 0.1;
      reasons.push(`URL contains solar/energy terms`);
      break;
    }
  }

  // Check product links for solar-related terms
  if (companyInfo.productLinks) {
    const solarProductLinks = companyInfo.productLinks.filter((link: string) =>
      /solar|battery|inverter|panel|charge/i.test(link)
    );
    if (solarProductLinks.length > 0) {
      score += Math.min(0.2, solarProductLinks.length * 0.05);
      reasons.push(`Found ${solarProductLinks.length} solar-related product links`);
    }
  }

  // Cap at 1.0
  score = Math.min(1.0, score);

  return { score, reasons };
}

/**
 * Analyze products using AI agent
 */
async function analyzeWithAI(url: string, _companyInfo: ScrapedCompany) {
  try {
    const aiScraper = new AIAgentScraper();
    const products = await aiScraper.scrape(url, {
      rateLimit: 500,
      timeout: 10000,
    });

    const productTypes = new Set<string>();
    products.forEach(product => {
      if (product.name) {
        const category = categorizeProduct(product.name, product.description || null);
        productTypes.add(category);
      }
    });

    return {
      productTypes: Array.from(productTypes),
      productCount: products.length,
      confidence: products.length > 0 ? 0.9 : 0.3,
    };
  } catch (error) {
    logger.warn({ url, error }, "AI analysis failed, falling back");
    return { productTypes: [], productCount: 0, confidence: 0.3 };
  }
}

/**
 * Analyze products using browser scraper
 */
async function analyzeWithBrowser(url: string) {
  try {
    const browserScraper = await getBrowserScraper();
    
    // Quick crawl to find product links first
    const crawlResult = await deepCrawlForProducts(url, {
      maxPages: 5,
      maxDepth: 2,
      config: { rateLimit: 1000, timeout: 8000 }
    });

    // Scrape a sample of products
    const sampleUrls = crawlResult.productLinks.slice(0, 10);
    const products = await browserScraper.scrapeMultipleProducts(sampleUrls, {
      rateLimit: 2000,
      timeout: 10000,
    });

    await closeBrowserScraper();

    const productTypes = new Set<string>();
    products.forEach(product => {
      if (product.name) {
        const category = categorizeProduct(product.name, product.description || null);
        productTypes.add(category);
      }
    });

    return {
      productTypes: Array.from(productTypes),
      productCount: crawlResult.productLinks.length,
      confidence: products.length > 0 ? 0.8 : 0.4,
    };
  } catch (error) {
    logger.warn({ url, error }, "Browser analysis failed, falling back");
    return { productTypes: [], productCount: 0, confidence: 0.3 };
  }
}

/**
 * Analyze products using standard crawler
 */
async function analyzeWithCrawler(url: string) {
  try {
    const crawlResult = await deepCrawlForProducts(url, {
      maxPages: 8,
      maxDepth: 2,
      config: { rateLimit: 300, timeout: 5000 }
    });

    // Analyze product URLs for categories without actually scraping them
    const productTypes = new Set<string>();
    crawlResult.productLinks.forEach(productUrl => {
      const urlLower = productUrl.toLowerCase();
      if (urlLower.includes('solar') || urlLower.includes('panel')) {
        productTypes.add('SOLAR_PANEL');
      }
      if (urlLower.includes('battery') || urlLower.includes('batteries')) {
        productTypes.add('BATTERY');
      }
      if (urlLower.includes('inverter')) {
        productTypes.add('INVERTER');
      }
      if (urlLower.includes('charge') || urlLower.includes('controller')) {
        productTypes.add('CHARGE_CONTROLLER');
      }
      if (urlLower.includes('mount') || urlLower.includes('bracket')) {
        productTypes.add('MOUNTING');
      }
    });

    return {
      productTypes: Array.from(productTypes),
      productCount: crawlResult.productLinks.length,
      confidence: crawlResult.productLinks.length > 0 ? 0.6 : 0.2,
    };
  } catch (error) {
    logger.warn({ url, error }, "Crawler analysis failed");
    return { productTypes: [], productCount: 0, confidence: 0.2 };
  }
}

/**
 * Calculate overall confidence score
 */
function calculateConfidence(
  solarRelevance: number,
  productConfidence: number,
  companyInfo: ScrapedCompany,
  productCount: number
): number {
  let confidence = 0;

  // Solar relevance (40% weight)
  confidence += solarRelevance * 0.4;

  // Product analysis (30% weight)
  confidence += productConfidence * 0.3;

  // Company completeness (20% weight)
  const completeness = [
    companyInfo.name,
    companyInfo.email || companyInfo.phone,
    companyInfo.description,
  ].filter(Boolean).length / 3;
  confidence += completeness * 0.2;

  // Product count bonus (10% weight)
  const productBonus = Math.min(1.0, productCount / 50) * 0.1;
  confidence += productBonus;

  return Math.min(1.0, confidence);
}
