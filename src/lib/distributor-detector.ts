/**
 * Enhanced distributor detection and categorization utilities
 * Automatically identifies solar/battery equipment distributors and categorizes them
 */

import { createLogger } from "./logger";
import type { EquipmentCategory } from "@prisma/client";

const logger = createLogger("distributor-detector");

export interface DistributorProfile {
  name: string;
  website: string;
  specialties: EquipmentCategory[];
  tier: 'manufacturer' | 'distributor' | 'retailer' | 'installer';
  regions: string[];
  confidence: number;
  reasoning: string[];
}

/**
 * Solar industry keywords and their relevance scores
 */
const SOLAR_KEYWORDS = {
  // High relevance (1.0)
  'solar panel': 1.0,
  'photovoltaic': 1.0,
  'solar battery': 1.0,
  'solar inverter': 1.0,
  'solar energy': 1.0,
  'renewable energy': 1.0,
  
  // Medium-high relevance (0.8)
  'battery storage': 0.8,
  'energy storage': 0.8,
  'charge controller': 0.8,
  'solar mounting': 0.8,
  'off-grid': 0.8,
  'grid-tie': 0.8,
  
  // Medium relevance (0.6)
  'lithium battery': 0.6,
  'inverter': 0.6,
  'electrical': 0.6,
  'power': 0.6,
  'energy': 0.6,
  'battery': 0.6,
  
  // Lower relevance (0.4)
  'backup power': 0.4,
  'generator': 0.4,
  'electrical supply': 0.4,
  'power systems': 0.4,
};

/**
 * Known solar equipment manufacturers and distributors
 */
const KNOWN_SOLAR_COMPANIES = {
  // Tier 1 Manufacturers
  manufacturers: {
    'canadian solar': { specialties: ['SOLAR_PANEL'], regions: ['global'] },
    'jinko solar': { specialties: ['SOLAR_PANEL'], regions: ['global'] },
    'ja solar': { specialties: ['SOLAR_PANEL'], regions: ['global'] },
    'trina solar': { specialties: ['SOLAR_PANEL'], regions: ['global'] },
    'longi': { specialties: ['SOLAR_PANEL'], regions: ['global'] },
    'hanwha q cells': { specialties: ['SOLAR_PANEL'], regions: ['global'] },
    'rec solar': { specialties: ['SOLAR_PANEL'], regions: ['global'] },
    'sunpower': { specialties: ['SOLAR_PANEL'], regions: ['usa'] },
    'first solar': { specialties: ['SOLAR_PANEL'], regions: ['usa'] },
    'lg': { specialties: ['SOLAR_PANEL', 'BATTERY'], regions: ['global'] },
    'panasonic': { specialties: ['SOLAR_PANEL', 'BATTERY'], regions: ['global'] },
    
    // Inverter Manufacturers
    'solaredge': { specialties: ['INVERTER', 'MONITORING'], regions: ['global'] },
    'enphase': { specialties: ['INVERTER', 'MONITORING'], regions: ['global'] },
    'fronius': { specialties: ['INVERTER'], regions: ['global'] },
    'sma': { specialties: ['INVERTER'], regions: ['global'] },
    'huawei': { specialties: ['INVERTER'], regions: ['global'] },
    'goodwe': { specialties: ['INVERTER'], regions: ['global'] },
    'growatt': { specialties: ['INVERTER'], regions: ['global'] },
    'schneider electric': { specialties: ['INVERTER', 'ELECTRICAL'], regions: ['global'] },
    
    // Battery Manufacturers
    'tesla': { specialties: ['BATTERY', 'INVERTER'], regions: ['usa', 'global'] },
    'lg chem': { specialties: ['BATTERY'], regions: ['global'] },
    'byd': { specialties: ['BATTERY'], regions: ['global'] },
    'pylontech': { specialties: ['BATTERY'], regions: ['global'] },
    'eg4': { specialties: ['BATTERY', 'INVERTER'], regions: ['usa'] },
    'battle born': { specialties: ['BATTERY'], regions: ['usa'] },
    'victron energy': { specialties: ['BATTERY', 'INVERTER', 'CHARGE_CONTROLLER'], regions: ['global'] },
    'aims power': { specialties: ['INVERTER', 'BATTERY'], regions: ['usa'] },
    'renogy': { specialties: ['SOLAR_PANEL', 'BATTERY', 'CHARGE_CONTROLLER'], regions: ['usa'] },
  },
  
  // Major Distributors
  distributors: {
    'ced': { specialties: ['ELECTRICAL', 'SOLAR_PANEL', 'INVERTER'], regions: ['usa'] },
    'rexel': { specialties: ['ELECTRICAL', 'SOLAR_PANEL'], regions: ['usa'] },
    'gexpro': { specialties: ['ELECTRICAL', 'SOLAR_PANEL'], regions: ['usa'] },
    'wesco': { specialties: ['ELECTRICAL', 'SOLAR_PANEL'], regions: ['usa'] },
    'baywa r.e.': { specialties: ['SOLAR_PANEL', 'INVERTER', 'MOUNTING'], regions: ['global'] },
    'kramer electronics': { specialties: ['SOLAR_PANEL', 'ELECTRICAL'], regions: ['usa'] },
    'altoenergy': { specialties: ['SOLAR_PANEL', 'BATTERY', 'INVERTER'], regions: ['usa'] },
    
    // Online Retailers
    'wholesale solar': { specialties: ['SOLAR_PANEL', 'BATTERY', 'INVERTER'], regions: ['usa'] },
    'gogreen solar': { specialties: ['SOLAR_PANEL', 'BATTERY', 'INVERTER'], regions: ['usa'] },
    'solar electric': { specialties: ['SOLAR_PANEL', 'BATTERY', 'INVERTER'], regions: ['usa'] },
    'bigbattery': { specialties: ['BATTERY'], regions: ['usa'] },
    'solar town': { specialties: ['SOLAR_PANEL', 'BATTERY', 'INVERTER'], regions: ['usa'] },
    'battery stuff': { specialties: ['BATTERY', 'ACCESSORIES'], regions: ['usa'] },
    'goal zero': { specialties: ['BATTERY', 'SOLAR_PANEL'], regions: ['usa'] },
    'nature solar': { specialties: ['SOLAR_PANEL', 'BATTERY'], regions: ['usa'] },
  },
};

/**
 * Analyze a company's solar industry relevance
 */
export function analyzeSolarRelevance(companyData: {
  name?: string;
  description?: string;
  website?: string;
  productLinks?: string[];
}): {
  score: number;
  tier: 'manufacturer' | 'distributor' | 'retailer' | 'installer' | 'unknown';
  specialties: EquipmentCategory[];
  reasoning: string[];
} {
  const reasoning: string[] = [];
  let score = 0;
  let tier: 'manufacturer' | 'distributor' | 'retailer' | 'installer' | 'unknown' = 'unknown';
  const specialties = new Set<EquipmentCategory>();

  const searchText = `${companyData.name || ''} ${companyData.description || ''} ${companyData.website || ''}`.toLowerCase();

  // Check against known companies first
  for (const [companyName, details] of Object.entries(KNOWN_SOLAR_COMPANIES.manufacturers)) {
    if (searchText.includes(companyName)) {
      score += 0.9;
      tier = 'manufacturer';
      details.specialties.forEach(spec => specialties.add(spec as EquipmentCategory));
      reasoning.push(`Identified as known manufacturer: ${companyName}`);
      break;
    }
  }

  for (const [companyName, details] of Object.entries(KNOWN_SOLAR_COMPANIES.distributors)) {
    if (searchText.includes(companyName)) {
      score += 0.8;
      tier = tier === 'unknown' ? 'distributor' : tier;
      details.specialties.forEach(spec => specialties.add(spec as EquipmentCategory));
      reasoning.push(`Identified as known distributor: ${companyName}`);
      break;
    }
  }

  // Keyword analysis
  for (const [keyword, weight] of Object.entries(SOLAR_KEYWORDS)) {
    if (searchText.includes(keyword)) {
      score += weight * 0.3; // Scale down for keyword matches
      reasoning.push(`Contains relevant keyword: '${keyword}'`);
    }
  }

  // URL analysis
  if (companyData.website) {
    const url = companyData.website.toLowerCase();
    const solarUrlPatterns = [
      /solar/,
      /battery/,
      /batteries/,
      /energy/,
      /power/,
      /renewable/,
      /photovoltaic/,
      /pv/,
    ];

    for (const pattern of solarUrlPatterns) {
      if (pattern.test(url)) {
        score += 0.1;
        reasoning.push('URL contains solar-related terms');
        break;
      }
    }
  }

  // Product link analysis
  if (companyData.productLinks && companyData.productLinks.length > 0) {
    const solarProductCount = companyData.productLinks.filter(link =>
      /solar|battery|inverter|panel|charge|mounting|electrical/i.test(link)
    ).length;

    if (solarProductCount > 0) {
      const relevanceBonus = Math.min(0.3, solarProductCount * 0.02);
      score += relevanceBonus;
      reasoning.push(`Found ${solarProductCount} solar-related product links`);

      // Guess specialties from product links
      companyData.productLinks.forEach(link => {
        const linkLower = link.toLowerCase();
        if (linkLower.includes('solar') || linkLower.includes('panel')) {
          specialties.add('SOLAR_PANEL');
        }
        if (linkLower.includes('battery') || linkLower.includes('batteries')) {
          specialties.add('BATTERY');
        }
        if (linkLower.includes('inverter')) {
          specialties.add('INVERTER');
        }
        if (linkLower.includes('mount') || linkLower.includes('bracket')) {
          specialties.add('MOUNTING');
        }
        if (linkLower.includes('charge') || linkLower.includes('controller')) {
          specialties.add('CHARGE_CONTROLLER');
        }
        if (linkLower.includes('wire') || linkLower.includes('cable')) {
          specialties.add('WIRING');
        }
        if (linkLower.includes('electrical')) {
          specialties.add('ELECTRICAL');
        }
      });
    }
  }

  // Business tier inference
  if (tier === 'unknown') {
    if (searchText.includes('manufacturer') || searchText.includes('manufacturing')) {
      tier = 'manufacturer';
      reasoning.push('Company description suggests manufacturer');
    } else if (searchText.includes('distributor') || searchText.includes('wholesale')) {
      tier = 'distributor';
      reasoning.push('Company description suggests distributor');
    } else if (searchText.includes('retail') || searchText.includes('store') || searchText.includes('shop')) {
      tier = 'retailer';
      reasoning.push('Company description suggests retailer');
    } else if (searchText.includes('install') || searchText.includes('contractor')) {
      tier = 'installer';
      reasoning.push('Company description suggests installer');
    }
  }

  // Cap score at 1.0
  score = Math.min(1.0, score);

  // Add default specialty if none found but score is high
  if (specialties.size === 0 && score > 0.5) {
    specialties.add('OTHER');
  }

  return {
    score,
    tier,
    specialties: Array.from(specialties),
    reasoning,
  };
}

/**
 * Get regional distributor recommendations based on location
 */
export function getRegionalDistributors(region: 'usa' | 'canada' | 'europe' | 'asia' | 'global' = 'usa'): string[] {
  const regionalUrls: Record<string, string[]> = {
    usa: [
      'https://www.ced.com',
      'https://www.rexel.com',
      'https://www.gexpro.com',
      'https://www.wesco.com',
      'https://www.wholesalesolar.com',
      'https://www.gogreensolar.com',
      'https://www.solar-electric.com',
      'https://bigbattery.com',
      'https://battlebornbatteries.com',
      'https://www.renogy.com',
      'https://www.altoenergy.com',
      'https://www.solartown.com',
      'https://www.batterystuff.com',
      'https://www.goalzero.com',
      'https://www.naturesolar.com',
      'https://www.solaris-shop.com',
    ],
    canada: [
      'https://www.solcan.ca',
      'https://www.solarbc.ca',
      'https://www.kuby.ca',
      'https://www.solardirect.ca',
      'https://www.solarpowercanada.ca',
    ],
    europe: [
      'https://www.baywa-re.com',
      'https://www.krannich-solar.com',
      'https://www.memodo.com',
      'https://www.alma-solar.com',
      'https://www.europe-solarstore.com',
    ],
    asia: [
      'https://www.canadiansolar.com',
      'https://www.jinkosolar.com',
      'https://www.ja-solar.com',
      'https://www.trinasolar.com',
      'https://www.longi.com',
    ],
    global: [
      'https://www.solaredge.com',
      'https://enphase.com',
      'https://www.fronius.com',
      'https://www.sma-america.com',
      'https://www.schneider-electric.com',
      'https://www.huawei.com/solar',
      'https://www.goodwe.com',
      'https://www.growatt.com',
    ],
  };

  return regionalUrls[region] || regionalUrls.usa;
}

/**
 * Extract potential distributor URLs from solar industry directories
 */
export async function extractFromSolarDirectory(directoryUrl: string): Promise<string[]> {
  logger.info({ directoryUrl }, 'Extracting distributors from solar directory');

  // This is a placeholder for directory-specific extraction logic
  // Different directories will have different structures
  const knownDirectories = {
    'solarpowerworldonline.com': async () => {
      // Solar Power World directory extraction logic
      return [];
    },
    'seia.org': async () => {
      // Solar Energy Industries Association directory
      return [];
    },
    'energysage.com': async () => {
      // EnergySage marketplace extraction
      return [];
    },
  };

  try {
    const urlObj = new URL(directoryUrl);
    const hostname = urlObj.hostname.replace('www.', '');

    if (knownDirectories[hostname as keyof typeof knownDirectories]) {
      return await knownDirectories[hostname as keyof typeof knownDirectories]();
    }

    // Generic directory extraction - look for company links
    // This would use the existing scraper to find potential distributor links
    logger.warn({ directoryUrl }, 'Unknown directory format, using generic extraction');
    return [directoryUrl];

  } catch (error) {
    logger.error({ directoryUrl, error }, 'Failed to extract from directory');
    return [];
  }
}

/**
 * Validate distributor data quality
 */
export function validateDistributorData(distributor: Record<string, string | number | boolean | undefined>): {
  isValid: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  // Required fields
  if (!distributor.name || typeof distributor.name !== 'string' || distributor.name.trim().length === 0) {
    issues.push('Missing company name');
  } else {
    score += 0.3;
  }

  if (!distributor.website || typeof distributor.website !== 'string' || !distributor.website.startsWith('http')) {
    issues.push('Missing or invalid website URL');
  } else {
    score += 0.3;
  }

  // Optional but important fields
  if (distributor.email) {
    if (typeof distributor.email === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(distributor.email)) {
      issues.push('Invalid email format');
    } else {
      score += 0.1;
    }
  } else {
    suggestions.push('Add email address for better contact information');
  }

  if (distributor.phone) {
    score += 0.1;
  } else {
    suggestions.push('Add phone number for better contact information');
  }

  if (distributor.address) {
    score += 0.1;
  } else {
    suggestions.push('Add address for location-based searches');
  }

  if (distributor.description || distributor.notes) {
    score += 0.1;
  } else {
    suggestions.push('Add description to help customers understand services');
  }

  // Product/equipment validation
  if (distributor.equipment && Array.isArray(distributor.equipment) && distributor.equipment.length > 0) {
    score += 0.1;
  } else {
    suggestions.push('Add equipment/product information to improve searchability');
  }

  const isValid = issues.length === 0 && score >= 0.5;

  return {
    isValid,
    score,
    issues,
    suggestions,
  };
}
