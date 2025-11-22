import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const logger = createLogger("bulk-import");

// Maximum duration for this endpoint
export const maxDuration = 300; // 5 minutes for bulk operations

/**
 * POST /api/distributors/bulk-import
 * 
 * Import distributors from various sources:
 * 1. List of URLs
 * 2. Solar industry directory URLs (auto-extract distributor URLs)
 * 3. CSV/JSON data with distributor information
 * 4. Predefined solar distributor lists
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      source, // 'urls' | 'directory' | 'data' | 'predefined'
      urls,
      directoryUrl,
      data,
      predefinedList,
      saveToDatabase = true,
      analysisMode = 'standard', // 'standard' | 'ai' | 'browser'
    } = body;

    logger.info(
      { source, urlCount: urls?.length, analysisMode },
      "Starting bulk import"
    );

    let distributorUrls: string[] = [];

    // Step 1: Gather URLs based on source
    switch (source) {
      case 'urls':
        distributorUrls = urls || [];
        break;
        
      case 'directory':
        distributorUrls = await extractFromDirectory(directoryUrl);
        break;
        
      case 'data':
        return await importFromData(data, saveToDatabase);
        
      case 'predefined':
        distributorUrls = getPredefinedDistributors(predefinedList);
        break;
        
      default:
        return NextResponse.json(
          { success: false, error: "Invalid source type" },
          { status: 400 }
        );
    }

    if (distributorUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: "No URLs found to process" },
        { status: 400 }
      );
    }

    logger.info({ urlCount: distributorUrls.length }, "URLs collected, starting discovery");

    // Step 2: Use the discovery endpoint to analyze all URLs
    const discoverResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/distributors/discover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urls: distributorUrls,
        saveToDatabase,
        useAI: analysisMode === 'ai',
        useBrowser: analysisMode === 'browser',
        analysisOnly: false,
      }),
    });

    const discoverData = await discoverResponse.json();

    if (!discoverData.success) {
      throw new Error(discoverData.error || 'Discovery failed');
    }

    logger.info(
      { 
        processed: discoverData.summary.totalAnalyzed,
        candidates: discoverData.summary.candidatesFound,
        saved: discoverData.summary.saved
      },
      "Bulk import completed"
    );

    return NextResponse.json({
      success: true,
      ...discoverData,
      source,
      originalUrlCount: distributorUrls.length,
    });

  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : "Unknown error" },
      "Bulk import failed"
    );
    return NextResponse.json(
      { success: false, error: "Failed to perform bulk import" },
      { status: 500 }
    );
  }
}

/**
 * Extract distributor URLs from solar industry directories
 */
async function extractFromDirectory(directoryUrl: string): Promise<string[]> {
  // This could be enhanced to parse specific directory formats
  // For now, return the directory URL itself for analysis
  return [directoryUrl];
}

/**
 * Import from structured data (CSV/JSON format)
 */
async function importFromData(data: Array<Record<string, string | undefined>>, saveToDatabase: boolean) {
  const results = [];

  for (const item of data) {
    try {
      if (!item.name || !item.website) {
        continue;
      }

      if (saveToDatabase) {
        // Check for existing distributor
        const existingDistributor = await prisma.distributor.findFirst({
          where: {
            OR: [
              { website: item.website },
              { name: item.name },
            ],
          },
        });

        if (existingDistributor) {
          results.push({ status: 'exists', distributor: existingDistributor });
          continue;
        }

        // Create new distributor
        const newDistributor = await prisma.distributor.create({
          data: {
            name: item.name,
            contactName: item.contactName,
            email: item.email,
            phone: item.phone,
            website: item.website,
            address: item.address,
            notes: item.notes || 'Imported from bulk data',
            logoUrl: item.logoUrl,
          },
        });

        results.push({ status: 'created', distributor: newDistributor });
      } else {
        results.push({ status: 'analyzed', data: item });
      }
    } catch (error) {
      results.push({ 
        status: 'error', 
        data: item, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  return NextResponse.json({
    success: true,
    results,
    summary: {
      total: data.length,
      created: results.filter(r => r.status === 'created').length,
      exists: results.filter(r => r.status === 'exists').length,
      errors: results.filter(r => r.status === 'error').length,
    },
  });
}

/**
 * Get predefined lists of solar distributors
 */
function getPredefinedDistributors(listName: string): string[] {
  const lists: Record<string, string[]> = {
    'top-solar-distributors': [
      'https://www.solarpowerworldonline.com',
      'https://www.energysage.com',
      'https://www.solar.com',
      'https://www.sunrun.com',
      'https://www.tesla.com/solar',
      'https://www.sunsolar.com',
      'https://www.palmetto.com',
      'https://www.momentumsolar.com',
      'https://www.powerhome.com',
      'https://www.trinasolar.com',
    ],
    
    'battery-specialists': [
      'https://bigbattery.com',
      'https://battlebornbatteries.com',
      'https://lithiumpowered.com',
      'https://www.solar-electric.com',
      'https://www.wholesalesolar.com',
      'https://www.gogreensolar.com',
      'https://www.naturesolar.com',
      'https://www.renogy.com',
      'https://www.aims-power.com',
      'https://www.morningstarcorp.com',
    ],
    
    'inverter-distributors': [
      'https://www.solaredge.com',
      'https://enphase.com',
      'https://www.fronius.com',
      'https://www.sma-america.com',
      'https://www.schneider-electric.com',
      'https://www.solax-power.com',
      'https://www.goodwe.com',
      'https://www.growatt.com',
      'https://www.huawei.com/solar',
      'https://www.ginlong.com',
    ],
    
    'equipment-suppliers': [
      'https://www.canadiansolar.com',
      'https://www.jinkopower.com',
      'https://www.ja-solar.com',
      'https://www.hanwha-qcells.com',
      'https://www.lg.com/solar',
      'https://www.rec-solar.com',
      'https://www.sunpower.com',
      'https://www.firstsolar.com',
      'https://www.longi.com',
      'https://www.astronergy.com',
    ],

    'regional-distributors-usa': [
      'https://www.ced.com',
      'https://www.rexel.com',
      'https://www.gexpro.com',
      'https://www.wesco.com',
      'https://www.altoenergy.com',
      'https://www.kramerelectronics.com',
      'https://www.citadelroofing.com',
      'https://www.solardistribution.com',
      'https://www.baywa-re.com',
      'https://www.pv-magazine.com',
    ],

    'diy-solar-kits': [
      'https://www.goalzero.com',
      'https://www.renogy.com',
      'https://www.batterystuff.com',
      'https://www.solar-electric.com',
      'https://www.solartown.com',
      'https://www.solaris-shop.com',
      'https://www.sunnyboy-inverters.com',
      'https://www.solar1tech.com',
      'https://www.offgridstore.com',
      'https://www.windsolarusa.com',
    ],
  };

  return lists[listName] || [];
}

/**
 * GET /api/distributors/bulk-import
 * 
 * Get available predefined lists and import options
 */
export async function GET() {
  const availableLists = [
    {
      id: 'top-solar-distributors',
      name: 'Top Solar Distributors',
      description: 'Major solar panel and system distributors',
      count: 10,
    },
    {
      id: 'battery-specialists', 
      name: 'Battery Specialists',
      description: 'Companies specializing in solar batteries and energy storage',
      count: 10,
    },
    {
      id: 'inverter-distributors',
      name: 'Inverter Distributors', 
      description: 'Solar inverter manufacturers and distributors',
      count: 10,
    },
    {
      id: 'equipment-suppliers',
      name: 'Equipment Suppliers',
      description: 'Solar panel manufacturers and equipment suppliers',
      count: 10,
    },
    {
      id: 'regional-distributors-usa',
      name: 'Regional Distributors (USA)',
      description: 'Regional electrical and solar distributors in the USA',
      count: 10,
    },
    {
      id: 'diy-solar-kits',
      name: 'DIY Solar Kits',
      description: 'Companies selling DIY solar kits and components',
      count: 10,
    },
  ];

  return NextResponse.json({
    success: true,
    availableLists,
    importMethods: [
      {
        id: 'urls',
        name: 'URL List',
        description: 'Import from a list of distributor URLs',
      },
      {
        id: 'predefined',
        name: 'Predefined Lists',
        description: 'Use curated lists of solar industry distributors',
      },
      {
        id: 'data',
        name: 'Structured Data',
        description: 'Import from CSV/JSON data with distributor information',
      },
    ],
    analysisModes: [
      {
        id: 'standard',
        name: 'Standard Analysis',
        description: 'Fast HTTP-based scraping and analysis',
      },
      {
        id: 'ai',
        name: 'AI-Powered Analysis',
        description: 'Intelligent analysis using AI (requires API key)',
      },
      {
        id: 'browser',
        name: 'Browser Analysis',
        description: 'JavaScript-capable scraping (requires browser service)',
      },
    ],
  });
}
