/**
 * Tariff Service
 * Integrates with UtilityAPI, Genability, and OpenEI Rate Database
 * to provide accurate tariff data for bill validation and system sizing
 */

import {
  Tariff,
  TariffRate,
  TariffLookupError,
} from '@/types/energy';
import { logger } from './logger';
import { retry } from './retry';
import { prisma } from './prisma';
import { Prisma } from '@prisma/client';

// Configuration
const OPENEI_BASE_URL = 'https://api.openei.org/utility_rates';
const GENABILITY_BASE_URL = 'https://api.genability.com/rest/public';
const TARIFF_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface TariffSearchParams {
  utilityName?: string;
  zipCode?: string;
  state?: string;
  rateSchedule?: string;
  sector?: 'residential' | 'commercial' | 'industrial';
}

interface OpenEIResponse {
  version: string;
  count: number;
  items: Array<{
    label: string;
    utility: string;
    sector: string;
    energyratestructure?: Array<{
      rate?: number;
      max?: number;
      adj?: number;
      unit?: string;
    }>;
    demandratestructure?: Array<{
      rate?: number;
      max?: number;
      unit?: string;
    }>;
    fixedchargefirstmeter?: number;
    fixedchargeunits?: string;
    uri?: string;
    startdate?: string;
    enddate?: string;
  }>;
}

interface GenabilityResponse {
  status: string;
  count: number;
  results: Array<{
    masterTariffId: number;
    tariffName: string;
    lseId: number;
    lseName: string;
    tariffType: string;
    customerClass: string;
    effectiveDate: string;
    endDate?: string;
    timeZone: string;
    currency: string;
    isActive: boolean;
  }>;
}

/**
 * OpenEI Rate Database Service
 */
class OpenEIService {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.OPENEI_API_KEY;
  }

  /**
   * Search tariffs using OpenEI API
   */
  async searchTariffs(params: TariffSearchParams): Promise<Tariff[]> {
    try {
      if (!this.apiKey) {
        logger.warn('OpenEI API key not configured');
        return [];
      }

      const queryParams = new URLSearchParams({
        version: 'latest',
        format: 'json',
        api_key: this.apiKey,
        detail: 'full'
      });

      if (params.utilityName) {
        queryParams.append('utility_name', params.utilityName);
      }
      if (params.zipCode) {
        queryParams.append('address', params.zipCode);
      }
      if (params.sector) {
        queryParams.append('sector', params.sector);
      }

      const response = await fetch(`${OPENEI_BASE_URL}?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new TariffLookupError(
          `OpenEI API error: ${response.status} ${response.statusText}`,
          params.utilityName
        );
      }

      const data: OpenEIResponse = await response.json();
      
      logger.info({
        count: data.count,
        utilityName: params.utilityName,
        zipCode: params.zipCode
      }, 'OpenEI search completed');

      return this.transformOpenEITariffs(data.items);

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        params
      }, 'OpenEI tariff search failed');
      
      if (error instanceof TariffLookupError) {
        throw error;
      }
      
      throw new TariffLookupError(
        'Failed to search OpenEI tariffs',
        params.utilityName,
        { originalError: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Transform OpenEI data to our Tariff format
   */
  private transformOpenEITariffs(items: OpenEIResponse['items']): Tariff[] {
    const tariffs: Tariff[] = [];

    for (const item of items) {
      try {
        const tariff: Tariff = {
          id: `openei_${item.uri?.split('/').pop() || Date.now()}`,
          utilityId: this.generateUtilityId(item.utility),
          utilityName: item.utility,
          tariffName: item.label,
          effectiveDate: item.startdate ? new Date(item.startdate) : new Date(),
          endDate: item.enddate ? new Date(item.enddate) : undefined,
          sector: this.normalizeSector(item.sector),
          rates: this.transformRateStructure(item),
          source: 'openei',
          sourceId: item.uri,
          lastUpdated: new Date(),
        };

        tariffs.push(tariff);

      } catch (error) {
        logger.warn({
          item: item.label,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, 'Failed to transform OpenEI tariff');
      }
    }

    return tariffs;
  }

  /**
   * Transform rate structure from OpenEI format
   */
  private transformRateStructure(item: OpenEIResponse['items'][0]): TariffRate {
    const rates: TariffRate = {
      rateType: 'flat', // Will be determined from structure
      fixedCharges: item.fixedchargefirstmeter || 0,
      energyRates: [],
      demandRates: []
    };

    // Transform energy rates
    if (item.energyratestructure && Array.isArray(item.energyratestructure)) {
      rates.energyRates = item.energyratestructure
        .filter(rate => rate.rate && rate.rate > 0)
        .map((rate, index) => ({
          rate: rate.rate!,
          fromKwh: index === 0 ? 0 : undefined,
          toKwh: rate.max
        }));

      // Determine rate type
      if (rates.energyRates.length > 1) {
        rates.rateType = 'tiered';
      }
    }

    // Transform demand rates
    if (item.demandratestructure && Array.isArray(item.demandratestructure)) {
      rates.demandRates = item.demandratestructure
        .filter(rate => rate.rate && rate.rate > 0)
        .map(rate => ({
          rate: rate.rate!
        }));
    }

    return rates;
  }

  /**
   * Generate utility ID from utility name
   */
  private generateUtilityId(utilityName: string): string {
    return `utility_${utilityName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  }

  /**
   * Normalize sector naming
   */
  private normalizeSector(sector: string): 'residential' | 'commercial' | 'industrial' {
    const normalized = sector.toLowerCase();
    if (normalized.includes('residential')) return 'residential';
    if (normalized.includes('commercial')) return 'commercial';
    if (normalized.includes('industrial')) return 'industrial';
    return 'residential'; // Default fallback
  }
}

/**
 * Genability Service
 */
class GenabilityService {
  private apiKey: string | undefined;
  private applicationId: string | undefined;

  constructor() {
    this.apiKey = process.env.GENABILITY_API_KEY;
    this.applicationId = process.env.GENABILITY_APP_ID;
  }

  /**
   * Search tariffs using Genability API
   */
  async searchTariffs(params: TariffSearchParams): Promise<Tariff[]> {
    try {
      if (!this.apiKey || !this.applicationId) {
        logger.warn('Genability API credentials not configured');
        return [];
      }

      const queryParams = new URLSearchParams({
        appId: this.applicationId,
        appKey: this.apiKey
      });

      if (params.zipCode) {
        queryParams.append('zipCode', params.zipCode);
      }
      if (params.sector) {
        queryParams.append('customerClass', this.mapSectorToCustomerClass(params.sector));
      }

      const response = await fetch(`${GENABILITY_BASE_URL}/tariffs?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new TariffLookupError(
          `Genability API error: ${response.status} ${response.statusText}`,
          params.utilityName
        );
      }

      const data: GenabilityResponse = await response.json();
      
      logger.info({
        count: data.count,
        zipCode: params.zipCode
      }, 'Genability search completed');

      return this.transformGenabilityTariffs(data.results);

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        params
      }, 'Genability tariff search failed');
      
      throw new TariffLookupError(
        'Failed to search Genability tariffs',
        params.utilityName,
        { originalError: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Transform Genability data to our Tariff format
   */
  private transformGenabilityTariffs(results: GenabilityResponse['results']): Tariff[] {
    return results
      .filter(result => result.isActive)
      .map(result => ({
        id: `genability_${result.masterTariffId}`,
        utilityId: `lse_${result.lseId}`,
        utilityName: result.lseName,
        tariffName: result.tariffName,
        effectiveDate: new Date(result.effectiveDate),
        endDate: result.endDate ? new Date(result.endDate) : undefined,
        sector: this.mapCustomerClassToSector(result.customerClass),
        rates: { // Simplified - would need detailed tariff API call
          rateType: 'flat',
          fixedCharges: 0,
          energyRates: []
        },
        source: 'genability',
        sourceId: result.masterTariffId.toString(),
        lastUpdated: new Date(),
      }));
  }

  /**
   * Map sector to Genability customer class
   */
  private mapSectorToCustomerClass(sector: string): string {
    const mapping: Record<string, string> = {
      'residential': 'RESIDENTIAL',
      'commercial': 'GENERAL',
      'industrial': 'INDUSTRIAL'
    };
    return mapping[sector] || 'RESIDENTIAL';
  }

  /**
   * Map Genability customer class to our sector
   */
  private mapCustomerClassToSector(customerClass: string): 'residential' | 'commercial' | 'industrial' {
    const normalized = customerClass.toLowerCase();
    if (normalized.includes('residential')) return 'residential';
    if (normalized.includes('industrial')) return 'industrial';
    return 'commercial'; // Default for general/commercial classes
  }
}

/**
 * Utility API Service (placeholder - would need actual implementation)
 */
class UtilityAPIService {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.UTILITY_API_KEY;
  }

  async searchTariffs(params: TariffSearchParams): Promise<Tariff[]> {
    // Placeholder - would implement actual UtilityAPI integration
    logger.info({ params }, 'UtilityAPI search requested');
    return [];
  }
}

/**
 * Main Tariff Service that orchestrates multiple data sources
 */
export class TariffService {
  private openEI: OpenEIService;
  private genability: GenabilityService;
  private utilityAPI: UtilityAPIService;

  constructor() {
    this.openEI = new OpenEIService();
    this.genability = new GenabilityService();
    this.utilityAPI = new UtilityAPIService();
  }

  /**
   * Find tariffs matching the search criteria
   */
  async findTariffs(params: TariffSearchParams): Promise<Tariff[]> {
    try {
      logger.info({ params }, 'Starting tariff search');

      // First, check cache
      const cachedTariffs = await this.searchCachedTariffs(params);
      if (cachedTariffs.length > 0) {
        logger.info({ count: cachedTariffs.length }, 'Returning cached tariffs');
        return cachedTariffs;
      }

      // Search multiple data sources in parallel
      const searchPromises = [
        this.searchWithRetry(() => this.openEI.searchTariffs(params), 'OpenEI'),
        this.searchWithRetry(() => this.genability.searchTariffs(params), 'Genability'),
        this.searchWithRetry(() => this.utilityAPI.searchTariffs(params), 'UtilityAPI'),
      ];

      const results = await Promise.allSettled(searchPromises);
      
      // Combine results from all sources
      const allTariffs: Tariff[] = [];
      for (const result of results) {
        if (result.status === 'fulfilled') {
          allTariffs.push(...result.value);
        } else {
          logger.warn({
            error: result.reason instanceof Error ? result.reason.message : 'Unknown error'
          }, 'Tariff source failed');
        }
      }

      // Deduplicate and rank results
      const uniqueTariffs = this.deduplicateTariffs(allTariffs);
      const rankedTariffs = this.rankTariffs(uniqueTariffs, params);

      // Cache results for future use
      await this.cacheTariffs(rankedTariffs, params);

      logger.info({
        totalFound: allTariffs.length,
        uniqueCount: uniqueTariffs.length,
        returnedCount: rankedTariffs.length
      }, 'Tariff search completed');

      return rankedTariffs;

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        params
      }, 'Tariff search failed');
      
      throw new TariffLookupError(
        'Failed to find tariffs',
        params.utilityName,
        { searchParams: params }
      );
    }
  }

  /**
   * Find specific tariff by utility and rate schedule
   */
  async findTariffBySchedule(
    utilityName: string, 
    rateSchedule: string, 
    zipCode?: string
  ): Promise<Tariff | null> {
    try {
      const params: TariffSearchParams = {
        utilityName,
        rateSchedule,
        zipCode,
        sector: 'residential'
      };

      const tariffs = await this.findTariffs(params);
      
      // Find exact match for rate schedule
      const exactMatch = tariffs.find(tariff => 
        tariff.tariffName.toLowerCase().includes(rateSchedule.toLowerCase()) ||
        tariff.tariffName.toLowerCase().replace(/[^a-z0-9]/g, '').includes(
          rateSchedule.toLowerCase().replace(/[^a-z0-9]/g, '')
        )
      );

      if (exactMatch) {
        logger.info({
          utilityName,
          rateSchedule,
          tariffId: exactMatch.id
        }, 'Found exact tariff match');
        return exactMatch;
      }

      // Return best match if no exact match
      return tariffs.length > 0 ? tariffs[0] : null;

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        utilityName,
        rateSchedule
      }, 'Failed to find tariff by schedule');
      
      return null; // Return null instead of throwing for specific searches
    }
  }

  /**
   * Get tariff by ID from cache or external source
   */
  async getTariffById(tariffId: string): Promise<Tariff | null> {
    try {
      // First check database cache
      const cached = await prisma.tariff.findUnique({
        where: { id: tariffId }
      });

      if (cached && this.isTariffCacheFresh(cached.lastUpdated)) {
        return this.transformDbTariff(cached);
      }

      // If not cached or stale, would fetch from external API
      // This is a simplified implementation
      logger.info({ tariffId }, 'Tariff not found in cache');
      return null;

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        tariffId
      }, 'Failed to get tariff by ID');
      return null;
    }
  }

  /**
   * Validate tariff data against bill information
   */
  async validateTariffMatch(
    tariff: Tariff,
    billData: {
      utilityName?: string;
      rateSchedule?: string;
      serviceAddress?: string;
    }
  ): Promise<{ isMatch: boolean; confidence: number; reasons: string[] }> {
    const reasons: string[] = [];
    let confidence = 0;
    let matches = 0;
    let total = 0;

    // Check utility name match
    total++;
    if (billData.utilityName && tariff.utilityName) {
      const utilityMatch = this.fuzzyMatch(
        billData.utilityName.toLowerCase(),
        tariff.utilityName.toLowerCase()
      );
      if (utilityMatch > 0.8) {
        matches++;
        confidence += utilityMatch;
        reasons.push(`Utility name match: ${utilityMatch.toFixed(2)}`);
      } else {
        reasons.push(`Utility name mismatch: ${billData.utilityName} vs ${tariff.utilityName}`);
      }
    }

    // Check rate schedule match
    if (billData.rateSchedule) {
      total++;
      const scheduleMatch = this.fuzzyMatch(
        billData.rateSchedule.toLowerCase(),
        tariff.tariffName.toLowerCase()
      );
      if (scheduleMatch > 0.7) {
        matches++;
        confidence += scheduleMatch;
        reasons.push(`Rate schedule match: ${scheduleMatch.toFixed(2)}`);
      } else {
        reasons.push(`Rate schedule mismatch: ${billData.rateSchedule} vs ${tariff.tariffName}`);
      }
    }

    // Check if tariff is currently active
    const now = new Date();
    const isActive = tariff.effectiveDate <= now && (!tariff.endDate || tariff.endDate >= now);
    if (isActive) {
      reasons.push('Tariff is currently active');
    } else {
      reasons.push('Tariff is not currently active');
      confidence *= 0.5; // Reduce confidence for inactive tariffs
    }

    const finalConfidence = total > 0 ? confidence / total : 0;
    const isMatch = finalConfidence > 0.7 && matches >= total * 0.5;

    logger.info({
      tariffId: tariff.id,
      isMatch,
      confidence: finalConfidence,
      matches,
      total
    }, 'Tariff validation completed');

    return {
      isMatch,
      confidence: finalConfidence,
      reasons
    };
  }

  /**
   * Search cached tariffs in database
   */
  private async searchCachedTariffs(params: TariffSearchParams): Promise<Tariff[]> {
    try {
      const where: Record<string, unknown> = {};

      if (params.sector) {
        where.sector = params.sector;
      }

      // Check cache freshness
      const oneHourAgo = new Date(Date.now() - TARIFF_CACHE_DURATION);
      where.lastUpdated = { gte: oneHourAgo };

      if (params.utilityName) {
        // Use utility relation
        where.utility = {
          name: { contains: params.utilityName, mode: 'insensitive' }
        };
      }

      const cachedTariffs = await prisma.tariff.findMany({
        where,
        include: { utility: true },
        take: 10,
        orderBy: { lastUpdated: 'desc' }
      });

      return cachedTariffs.map(this.transformDbTariff);

    } catch (error) {
      logger.warn({
        error: error instanceof Error ? error.message : 'Unknown error',
        params
      }, 'Failed to search cached tariffs');
      return [];
    }
  }

  /**
   * Cache tariffs in database
   */
  private async cacheTariffs(tariffs: Tariff[], _params: TariffSearchParams): Promise<void> {
    try {
      for (const tariff of tariffs.slice(0, 5)) { // Cache top 5 results
        await prisma.tariff.upsert({
          where: { id: tariff.id },
          create: {
            id: tariff.id,
            utilityId: tariff.utilityId,
            tariffName: tariff.tariffName,
            effectiveDate: tariff.effectiveDate,
            endDate: tariff.endDate,
            sector: tariff.sector,
            voltage: tariff.voltage,
            phaseWiring: tariff.phaseWiring,
            rateStructure: tariff.rates as unknown as Prisma.InputJsonValue,
            source: tariff.source,
            sourceId: tariff.sourceId,
            lastUpdated: new Date(),
            serviceTerritory: tariff.serviceTerritory as unknown as Prisma.InputJsonValue,
          },
          update: {
            rateStructure: tariff.rates as unknown as Prisma.InputJsonValue,
            lastUpdated: new Date(),
          }
        });
      }

      logger.info({ count: Math.min(tariffs.length, 5) }, 'Cached tariffs');

    } catch (error) {
      logger.warn({
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Failed to cache tariffs');
    }
  }

  /**
   * Transform database tariff to our format
   */
  private transformDbTariff(dbTariff: Record<string, unknown>): Tariff {
    return {
      id: dbTariff.id as string,
      utilityId: dbTariff.utilityId as string,
      utilityName: (dbTariff.utility as Record<string, unknown>)?.name as string || 'Unknown Utility',
      tariffName: dbTariff.tariffName as string,
      effectiveDate: dbTariff.effectiveDate as Date,
      endDate: dbTariff.endDate as Date | undefined,
      sector: dbTariff.sector as 'residential' | 'commercial' | 'industrial',
      voltage: dbTariff.voltage as string | undefined,
      phaseWiring: dbTariff.phaseWiring as 'single' | 'three' | undefined,
      rates: dbTariff.rateStructure as TariffRate,
      source: dbTariff.source as 'openei' | 'genability' | 'utility_api' | 'manual',
      sourceId: dbTariff.sourceId as string | undefined,
      lastUpdated: dbTariff.lastUpdated as Date,
      serviceTerritory: dbTariff.serviceTerritory as Tariff['serviceTerritory'],
    };
  }

  /**
   * Search with retry wrapper
   */
  private async searchWithRetry<T>(
    searchFn: () => Promise<T>, 
    sourceName: string
  ): Promise<T> {
    return retry(searchFn, {
      maxRetries: 2,
      baseDelay: 1000,
      maxDelay: 3000,
      onRetry: (error, attempt) => {
        logger.warn({ attempt, error: error.message }, `${sourceName} search retry`);
      }
    });
  }

  /**
   * Remove duplicate tariffs
   */
  private deduplicateTariffs(tariffs: Tariff[]): Tariff[] {
    const seen = new Set<string>();
    const unique: Tariff[] = [];

    for (const tariff of tariffs) {
      // Create a key based on utility and tariff name
      const key = `${tariff.utilityName}_${tariff.tariffName}`.toLowerCase().replace(/\s+/g, '');
      
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(tariff);
      }
    }

    return unique;
  }

  /**
   * Rank tariffs by relevance
   */
  private rankTariffs(tariffs: Tariff[], params: TariffSearchParams): Tariff[] {
    return tariffs.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Prefer exact utility name matches
      if (params.utilityName) {
        if (a.utilityName.toLowerCase().includes(params.utilityName.toLowerCase())) scoreA += 10;
        if (b.utilityName.toLowerCase().includes(params.utilityName.toLowerCase())) scoreB += 10;
      }

      // Prefer exact rate schedule matches
      if (params.rateSchedule) {
        if (a.tariffName.toLowerCase().includes(params.rateSchedule.toLowerCase())) scoreA += 8;
        if (b.tariffName.toLowerCase().includes(params.rateSchedule.toLowerCase())) scoreB += 8;
      }

      // Prefer currently active tariffs
      const now = new Date();
      const aActive = a.effectiveDate <= now && (!a.endDate || a.endDate >= now);
      const bActive = b.effectiveDate <= now && (!b.endDate || b.endDate >= now);
      if (aActive) scoreA += 5;
      if (bActive) scoreB += 5;

      // Prefer OpenEI and Genability over other sources
      if (a.source === 'openei' || a.source === 'genability') scoreA += 3;
      if (b.source === 'openei' || b.source === 'genability') scoreB += 3;

      return scoreB - scoreA;
    });
  }

  /**
   * Check if cached tariff is still fresh
   */
  private isTariffCacheFresh(lastUpdated: Date): boolean {
    const cacheAge = Date.now() - lastUpdated.getTime();
    return cacheAge < TARIFF_CACHE_DURATION;
  }

  /**
   * Fuzzy string matching
   */
  private fuzzyMatch(str1: string, str2: string): number {
    // Simple similarity calculation - could use more sophisticated algorithms
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

// Export singleton instance
export const tariffService = new TariffService();

// Export individual services for testing
export { OpenEIService, GenabilityService, UtilityAPIService };
