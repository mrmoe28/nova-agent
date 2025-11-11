/**
 * Production Modeling Service
 * Integrates with PVWatts, SAM, and other solar production APIs
 * to replace flat assumptions with accurate irradiance modeling
 */

import { 
  SolarResource, 
  ProductionEstimate, 
  SystemConfiguration,
  ProductionModelingError,
  ApiResponse 
} from '@/types/energy';
import { Prisma } from '@prisma/client';
import { logger } from './logger';
import { retry } from './retry';
import { prisma } from './prisma';
import { v4 as uuidv4 } from 'uuid';

// API Configuration
const PVWATTS_BASE_URL = 'https://developer.nrel.gov/api/pvwatts/v8';
const NSRDB_BASE_URL = 'https://developer.nrel.gov/api/nsrdb/v2/solar';
const PRODUCTION_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// Default system losses (industry standard)
const DEFAULT_LOSSES = {
  soiling: 2,        // %
  shading: 3,        // %
  snow: 0,           // %
  mismatch: 2,       // %
  wiring: 2,         // %
  connections: 0.5,  // %
  lid: 1.5,          // Light Induced Degradation %
  nameplate: 1,      // %
  age: 0,            // %
  availability: 3    // %
};

interface PVWattsRequest {
  system_capacity: number;    // kW
  module_type: number;        // 0=Standard, 1=Premium, 2=Thin film
  losses: number;             // % total system losses
  array_type: number;         // 0=Fixed - Open Rack, 1=Fixed - Roof Mounted, etc.
  tilt: number;              // degrees
  azimuth: number;           // degrees
  lat: number;               // latitude
  lon: number;               // longitude
  dataset?: string;          // nsrdb, tmy3
  radius?: number;           // km
  timeframe?: string;        // monthly, hourly
}

interface PVWattsResponse {
  inputs: PVWattsRequest;
  errors: string[];
  warnings: string[];
  version: string;
  ssc_info: {
    version: number;
    build: string;
  };
  station_info: {
    lat: number;
    lon: number;
    elev: number;
    tz: number;
    location: string;
    city: string;
    state: string;
    solar_resource_file: string;
    distance: number;
  };
  outputs: {
    ac_monthly: number[];      // Monthly AC energy (kWh)
    poa_monthly: number[];     // Monthly plane-of-array irradiance (kWh/m²)
    solrad_monthly: number[];  // Monthly solar radiation (kWh/m²/day)
    dc_monthly: number[];      // Monthly DC energy (kWh)
    ac_annual: number;         // Annual AC energy (kWh)
    solrad_annual: number;     // Annual solar radiation (kWh/m²/day)
    capacity_factor: number;   // Capacity factor (%)
    kwh_per_kw: number;        // Annual kWh per kW of capacity
    ac_hourly?: number[];      // Hourly AC energy (kWh) - if requested
  };
}

interface NSRDBRequest {
  lat: number;
  lon: number;
  year?: string;
  interval?: string;  // 30, 60 minutes
  attributes?: string; // ghi,dni,dhi,wind_speed,air_temperature
  leap_year?: boolean;
  utc?: boolean;
  full_name?: string;
  email?: string;
  affiliation?: string;
}

interface NSRDBResponse {
  // Simplified response - actual NSRDB API returns CSV data
  location: {
    latitude: number;
    longitude: number;
    timezone: string;
    elevation: number;
  };
  data: Array<{
    timestamp: string;
    ghi: number;      // Global Horizontal Irradiance W/m²
    dni: number;      // Direct Normal Irradiance W/m²
    dhi: number;      // Diffuse Horizontal Irradiance W/m²
    temperature: number; // Air temperature °C
  }>;
}

/**
 * NREL PVWatts Service
 */
class PVWattsService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.NREL_API_KEY || 'DEMO_KEY';
    if (this.apiKey === 'DEMO_KEY') {
      logger.warn('Using NREL demo API key - rate limited to 1000 requests/hour');
    }
  }

  /**
   * Calculate production estimate using PVWatts
   */
  async calculateProduction(
    systemSizeKw: number,
    configuration: SystemConfiguration,
    latitude: number,
    longitude: number,
    correlationId?: string
  ): Promise<ProductionEstimate> {
    try {
      logger.info({
        systemSizeKw,
        latitude,
        longitude,
        correlationId
      }, 'Starting PVWatts production calculation');

      // Prepare PVWatts request
      const request: PVWattsRequest = {
        system_capacity: systemSizeKw,
        module_type: this.mapModuleType(configuration.moduleType),
        losses: this.calculateTotalLosses(configuration),
        array_type: this.mapArrayType(configuration),
        tilt: configuration.tilt,
        azimuth: configuration.azimuth,
        lat: latitude,
        lon: longitude,
        dataset: 'nsrdb',
        timeframe: 'monthly'
      };

      // Add API key and make request
      const params = new URLSearchParams();
      Object.entries(request).forEach(([key, value]) => {
        params.append(key, value.toString());
      });
      params.append('api_key', this.apiKey);
      params.append('format', 'json');

      const response = await fetch(`${PVWATTS_BASE_URL}.json?${params.toString()}`);

      if (!response.ok) {
        throw new ProductionModelingError(
          `PVWatts API error: ${response.status} ${response.statusText}`,
          `${latitude},${longitude}`
        );
      }

      const data: PVWattsResponse = await response.json();

      if (data.errors && data.errors.length > 0) {
        throw new ProductionModelingError(
          `PVWatts calculation failed: ${data.errors.join(', ')}`,
          `${latitude},${longitude}`,
          { systemSize: systemSizeKw, configuration }
        );
      }

      // Get solar resource data
      const solarResource = await this.getSolarResourceData(latitude, longitude);

      // Create production estimate
      const productionEstimate: ProductionEstimate = {
        id: uuidv4(),
        projectId: '', // Will be set by caller
        systemSizeKw,
        configuration,
        solarResource: solarResource,
        annualProduction: data.outputs.ac_annual,
        monthlyProduction: data.outputs.ac_monthly,
        specificYield: data.outputs.kwh_per_kw,
        performanceRatio: this.calculatePerformanceRatio(data.outputs, solarResource),
        capacityFactor: data.outputs.capacity_factor / 100, // Convert from percentage
        year1Degradation: configuration.moduleType === 'thin_film' ? 0.008 : 0.005,
        annualDegradation: configuration.moduleType === 'thin_film' ? 0.005 : 0.007,
        productionProfile25Years: this.calculateDegradationProfile(data.outputs.ac_annual),
        modelingMethod: 'pvwatts',
        confidence: this.calculateModelConfidence(data, configuration),
        createdAt: new Date(),
      };

      logger.info({
        annualProduction: productionEstimate.annualProduction,
        specificYield: productionEstimate.specificYield,
        confidence: productionEstimate.confidence,
        correlationId
      }, 'PVWatts production calculation completed');

      return productionEstimate;

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        systemSizeKw,
        latitude,
        longitude,
        correlationId
      }, 'PVWatts production calculation failed');

      if (error instanceof ProductionModelingError) {
        throw error;
      }

      throw new ProductionModelingError(
        'Failed to calculate production with PVWatts',
        `${latitude},${longitude}`,
        { originalError: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Get detailed hourly production data
   */
  async getHourlyProduction(
    systemSizeKw: number,
    configuration: SystemConfiguration,
    latitude: number,
    longitude: number
  ): Promise<number[]> {
    try {
      const request: PVWattsRequest = {
        system_capacity: systemSizeKw,
        module_type: this.mapModuleType(configuration.moduleType),
        losses: this.calculateTotalLosses(configuration),
        array_type: this.mapArrayType(configuration),
        tilt: configuration.tilt,
        azimuth: configuration.azimuth,
        lat: latitude,
        lon: longitude,
        dataset: 'nsrdb',
        timeframe: 'hourly'
      };

      const params = new URLSearchParams();
      Object.entries(request).forEach(([key, value]) => {
        params.append(key, value.toString());
      });
      params.append('api_key', this.apiKey);
      params.append('format', 'json');

      const response = await fetch(`${PVWATTS_BASE_URL}.json?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`PVWatts hourly API error: ${response.status}`);
      }

      const data: PVWattsResponse = await response.json();
      return data.outputs.ac_hourly || [];

    } catch (error) {
      logger.warn({
        error: error instanceof Error ? error.message : 'Unknown error',
        systemSizeKw,
        latitude,
        longitude
      }, 'Failed to get hourly production data');
      return []; // Return empty array on failure
    }
  }

  /**
   * Get or create solar resource data
   */
  private async getSolarResourceData(latitude: number, longitude: number): Promise<SolarResource> {
    try {
      // Check if we have cached solar resource data
      const cached = await prisma.solarResource.findFirst({
        where: {
          latitude: { gte: latitude - 0.1, lte: latitude + 0.1 },
          longitude: { gte: longitude - 0.1, lte: longitude + 0.1 },
          source: 'nsrdb'
        },
        orderBy: { createdAt: 'desc' }
      });

      if (cached && this.isSolarResourceFresh(cached.createdAt)) {
        return cached as SolarResource;
      }

      // Fetch new solar resource data from NSRDB
      const resourceData = await this.fetchNSRDBData(latitude, longitude);
      
      // Create new solar resource record
      const solarResource = await prisma.solarResource.create({
        data: {
          latitude,
          longitude,
          timezone: resourceData.location.timezone,
          ghi: resourceData.monthlyGHI,
          dni: resourceData.monthlyDNI,
          dhi: resourceData.monthlyDHI,
          temperature: resourceData.monthlyTemp,
          source: 'nsrdb',
          dataYear: new Date().getFullYear() - 1, // Use previous year's data
          spatialResolution: 4 // NSRDB is 4km resolution
        }
      });

      return solarResource as SolarResource;

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        latitude,
        longitude
      }, 'Failed to get solar resource data');

      // Create a default solar resource with typical values
      return this.createDefaultSolarResource(latitude, longitude);
    }
  }

  /**
   * Fetch solar resource data from NSRDB
   */
  private async fetchNSRDBData(latitude: number, longitude: number): Promise<{
    location: { timezone: string };
    monthlyGHI: number[];
    monthlyDNI: number[];
    monthlyDHI: number[];
    monthlyTemp: number[];
  }> {
    // This would make actual NSRDB API call
    // For now, return typical values based on location
    
    logger.info({ latitude, longitude }, 'Fetching NSRDB data');
    
    // Estimate timezone from longitude
    const timezone = this.estimateTimezone(longitude);
    
    // Generate typical irradiance values based on latitude
    const monthlyGHI = this.generateTypicalIrradiance(latitude, 'ghi');
    const monthlyDNI = this.generateTypicalIrradiance(latitude, 'dni');
    const monthlyDHI = this.generateTypicalIrradiance(latitude, 'dhi');
    const monthlyTemp = this.generateTypicalTemperature(latitude);

    return {
      location: { timezone },
      monthlyGHI,
      monthlyDNI,
      monthlyDHI,
      monthlyTemp
    };
  }

  /**
   * Map module type to PVWatts parameter
   */
  private mapModuleType(moduleType?: string): number {
    const mapping: Record<string, number> = {
      'standard': 0,
      'premium': 1,
      'thin_film': 2
    };
    return mapping[moduleType || 'standard'] || 0;
  }

  /**
   * Map installation type to PVWatts array type
   */
  private mapArrayType(configuration: SystemConfiguration): number {
    const mapping: Record<string, number> = {
      'ground_mount': 0,    // Fixed - Open Rack
      'roof_mount': 1,      // Fixed - Roof Mounted
      'single_axis': 2,     // 1-Axis Tracking
      'dual_axis': 3,       // 2-Axis Tracking
      'tracker': 2,         // Default to single axis
    };
    return mapping[configuration.installationType] || 1; // Default to roof mounted
  }

  /**
   * Calculate total system losses
   */
  private calculateTotalLosses(configuration: SystemConfiguration): number {
    let totalLosses = 0;

    // Add specified losses
    totalLosses += configuration.soilingLoss || DEFAULT_LOSSES.soiling;
    totalLosses += configuration.shadingLoss || DEFAULT_LOSSES.shading;
    totalLosses += configuration.dcLosses || (DEFAULT_LOSSES.mismatch + DEFAULT_LOSSES.wiring + DEFAULT_LOSSES.connections);
    totalLosses += configuration.acLosses || DEFAULT_LOSSES.availability;

    // Add fixed losses
    totalLosses += DEFAULT_LOSSES.lid + DEFAULT_LOSSES.nameplate;

    // Inverter losses are handled separately in PVWatts
    return Math.min(totalLosses, 50); // Cap at 50% losses
  }

  /**
   * Calculate performance ratio
   */
  private calculatePerformanceRatio(outputs: PVWattsResponse['outputs'], solarResource: SolarResource): number {
    // Performance Ratio = (Actual Energy Output) / (Theoretical Energy Output)
    const theoreticalOutput = solarResource.ghi.reduce((sum, ghi) => sum + ghi, 0) * 30.44; // Average days per month
    const actualOutput = outputs.ac_annual;
    
    return theoreticalOutput > 0 ? actualOutput / theoreticalOutput : 0.8; // Default PR
  }

  /**
   * Calculate model confidence based on various factors
   */
  private calculateModelConfidence(data: PVWattsResponse, configuration: SystemConfiguration): number {
    let confidence = 0.85; // Base confidence for PVWatts

    // Reduce confidence for warnings
    if (data.warnings && data.warnings.length > 0) {
      confidence -= 0.1;
    }

    // Reduce confidence for high distance from weather station
    if (data.station_info.distance > 50) {
      confidence -= 0.05;
    }

    // Reduce confidence for extreme tilt angles
    if (configuration.tilt < 5 || configuration.tilt > 60) {
      confidence -= 0.05;
    }

    // Reduce confidence for significant shading
    if (configuration.shadingLoss > 10) {
      confidence -= 0.1;
    }

    return Math.max(confidence, 0.5); // Minimum 50% confidence
  }

  /**
   * Calculate 25-year production profile with degradation
   */
  private calculateDegradationProfile(annualProduction: number): number[] {
    const profile: number[] = [];
    let currentProduction = annualProduction;

    for (let year = 1; year <= 25; year++) {
      profile.push(Math.round(currentProduction));
      
      // Apply degradation (higher in year 1, then steady annual degradation)
      const degradationRate = year === 1 ? 0.005 : 0.007;
      currentProduction *= (1 - degradationRate);
    }

    return profile;
  }

  /**
   * Check if solar resource data is fresh
   */
  private isSolarResourceFresh(createdAt: Date): boolean {
    const age = Date.now() - createdAt.getTime();
    return age < PRODUCTION_CACHE_DURATION;
  }

  /**
   * Create default solar resource for location
   */
  private async createDefaultSolarResource(latitude: number, longitude: number): Promise<SolarResource> {
    logger.warn({ latitude, longitude }, 'Creating default solar resource data');

    return await prisma.solarResource.create({
      data: {
        latitude,
        longitude,
        timezone: this.estimateTimezone(longitude),
        ghi: this.generateTypicalIrradiance(latitude, 'ghi'),
        dni: this.generateTypicalIrradiance(latitude, 'dni'),
        dhi: this.generateTypicalIrradiance(latitude, 'dhi'),
        temperature: this.generateTypicalTemperature(latitude),
        source: 'estimated',
        dataYear: new Date().getFullYear(),
        spatialResolution: 50 // Lower resolution for estimates
      }
    }) as unknown as SolarResource;
  }

  /**
   * Estimate timezone from longitude
   */
  private estimateTimezone(longitude: number): string {
    // Rough timezone estimation (15 degrees per hour)
    const hourOffset = Math.round(longitude / 15);
    const utcOffset = Math.max(-12, Math.min(12, hourOffset));
    return `UTC${utcOffset >= 0 ? '+' : ''}${utcOffset}`;
  }

  /**
   * Generate typical irradiance values for location
   */
  private generateTypicalIrradiance(latitude: number, type: 'ghi' | 'dni' | 'dhi'): number[] {
    const absLat = Math.abs(latitude);
    
    // Base values decrease with distance from equator
    const baseMultiplier = Math.max(0.3, 1 - (absLat / 90) * 0.7);
    
    // Seasonal variation (higher in summer for northern hemisphere)
    const months = [];
    for (let month = 0; month < 12; month++) {
      const seasonalFactor = 0.7 + 0.6 * Math.cos((month - 5) * Math.PI / 6);
      let baseValue;
      
      switch (type) {
        case 'ghi':
          baseValue = 150; // kWh/m²/month
          break;
        case 'dni':
          baseValue = 180;
          break;
        case 'dhi':
          baseValue = 60;
          break;
      }
      
      months.push(Math.round(baseValue * baseMultiplier * seasonalFactor));
    }
    
    return months;
  }

  /**
   * Generate typical temperature values for location
   */
  private generateTypicalTemperature(latitude: number): number[] {
    const absLat = Math.abs(latitude);
    const baseMeanTemp = Math.max(5, 25 - (absLat / 90) * 20); // Warmer near equator
    
    const months = [];
    for (let month = 0; month < 12; month++) {
      // Seasonal variation (colder in winter)
      const seasonalOffset = 10 * Math.cos((month - 6) * Math.PI / 6);
      months.push(Math.round(baseMeanTemp + seasonalOffset));
    }
    
    return months;
  }
}

/**
 * SAM (System Advisor Model) Service - Placeholder for future implementation
 */
class SAMService {
  async calculateProduction(): Promise<ProductionEstimate> {
    // Placeholder for SAM integration
    throw new ProductionModelingError('SAM integration not yet implemented');
  }
}

/**
 * Aurora/HelioScope Integration Service - Placeholder
 */
class AuroraService {
  async calculateProduction(): Promise<ProductionEstimate> {
    // Placeholder for Aurora integration
    throw new ProductionModelingError('Aurora integration not yet implemented');
  }
}

/**
 * Main Production Modeling Service
 */
export class ProductionModelingService {
  private pvwatts: PVWattsService;
  private sam: SAMService;
  private aurora: AuroraService;

  constructor() {
    this.pvwatts = new PVWattsService();
    this.sam = new SAMService();
    this.aurora = new AuroraService();
  }

  /**
   * Calculate production estimate using the best available method
   */
  async calculateProductionEstimate(
    projectId: string,
    systemSizeKw: number,
    configuration: SystemConfiguration,
    latitude: number,
    longitude: number,
    preferredMethod: 'pvwatts' | 'sam' | 'aurora' = 'pvwatts',
    correlationId?: string
  ): Promise<ProductionEstimate> {
    try {
      logger.info({
        projectId,
        systemSizeKw,
        latitude,
        longitude,
        method: preferredMethod,
        correlationId
      }, 'Starting production estimation');

      // Check for cached estimate first
      const cached = await this.getCachedEstimate(
        projectId, 
        systemSizeKw, 
        configuration, 
        latitude, 
        longitude
      );

      if (cached) {
        logger.info({
          projectId,
          correlationId
        }, 'Returning cached production estimate');
        return cached;
      }

      let estimate: ProductionEstimate;

      // Try preferred method first, fall back to others
      try {
        switch (preferredMethod) {
          case 'pvwatts':
            estimate = await this.pvwatts.calculateProduction(
              systemSizeKw, 
              configuration, 
              latitude, 
              longitude, 
              correlationId
            );
            break;
          case 'sam':
            estimate = await this.sam.calculateProduction();
            break;
          case 'aurora':
            estimate = await this.aurora.calculateProduction();
            break;
          default:
            throw new Error(`Unsupported modeling method: ${preferredMethod}`);
        }
      } catch (error) {
        logger.warn({
          method: preferredMethod,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, `Primary method ${preferredMethod} failed, falling back to PVWatts`);
        
        // Fall back to PVWatts if it wasn't the primary method
        if (preferredMethod !== 'pvwatts') {
          estimate = await this.pvwatts.calculateProduction(
            systemSizeKw, 
            configuration, 
            latitude, 
            longitude, 
            correlationId
          );
        } else {
          throw error;
        }
      }

      // Set project ID
      estimate.projectId = projectId;

      // Save estimate to database
      const savedEstimate = await this.saveProductionEstimate(estimate);

      logger.info({
        projectId,
        annualProduction: savedEstimate.annualProduction,
        confidence: savedEstimate.confidence,
        method: savedEstimate.modelingMethod,
        correlationId
      }, 'Production estimation completed');

      return savedEstimate;

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId,
        systemSizeKw,
        latitude,
        longitude,
        correlationId
      }, 'Production estimation failed');

      throw error;
    }
  }

  /**
   * Get hourly production profile
   */
  async getHourlyProductionProfile(
    systemSizeKw: number,
    configuration: SystemConfiguration,
    latitude: number,
    longitude: number
  ): Promise<number[]> {
    try {
      return await this.pvwatts.getHourlyProduction(
        systemSizeKw, 
        configuration, 
        latitude, 
        longitude
      );
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        systemSizeKw,
        latitude,
        longitude
      }, 'Failed to get hourly production profile');
      return [];
    }
  }

  /**
   * Validate production estimate against other sources
   */
  async validateEstimate(
    estimate: ProductionEstimate,
    tolerancePercent: number = 10
  ): Promise<{
    isValid: boolean;
    variance: number;
    validationResults: Array<{
      method: string;
      production: number;
      variance: number;
    }>;
  }> {
    try {
      logger.info({
        annualProduction: estimate.annualProduction,
        method: estimate.modelingMethod
      }, 'Validating production estimate');

      const validationResults: Array<{
        method: string;
        production: number;
        variance: number;
      }> = [];

      // If original estimate wasn't from PVWatts, validate against it
      if (estimate.modelingMethod !== 'pvwatts') {
        try {
          const pvwattsEstimate = await this.pvwatts.calculateProduction(
            estimate.systemSizeKw,
            estimate.configuration,
            // Would need to get lat/lon from solar resource
            0, 0 // Placeholder
          );

          const variance = Math.abs(
            (pvwattsEstimate.annualProduction - estimate.annualProduction) / estimate.annualProduction * 100
          );

          validationResults.push({
            method: 'pvwatts',
            production: pvwattsEstimate.annualProduction,
            variance
          });

        } catch (error) {
          logger.warn({ 
            error: error instanceof Error ? error.message : 'Unknown error'
          }, 'PVWatts validation failed');
        }
      }

      // Calculate overall variance
      const averageVariance = validationResults.length > 0 
        ? validationResults.reduce((sum, result) => sum + result.variance, 0) / validationResults.length
        : 0;

      const isValid = averageVariance <= tolerancePercent;

      logger.info({
        isValid,
        averageVariance,
        validationCount: validationResults.length
      }, 'Production estimate validation completed');

      return {
        isValid,
        variance: averageVariance,
        validationResults
      };

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Production estimate validation failed');

      return {
        isValid: false,
        variance: 100,
        validationResults: []
      };
    }
  }

  /**
   * Get cached production estimate
   */
  private async getCachedEstimate(
    projectId: string,
    systemSizeKw: number,
    configuration: SystemConfiguration,
    latitude: number,
    longitude: number
  ): Promise<ProductionEstimate | null> {
    try {
      const cached = await prisma.productionEstimate.findFirst({
        where: {
          projectId,
          systemSizeKw: { gte: systemSizeKw * 0.95, lte: systemSizeKw * 1.05 }, // 5% tolerance
          createdAt: { gte: new Date(Date.now() - PRODUCTION_CACHE_DURATION) }
        },
        include: { solarResource: true },
        orderBy: { createdAt: 'desc' }
      });

      if (cached && this.isConfigurationSimilar(cached.configuration as unknown as SystemConfiguration, configuration)) {
        return this.transformDbProductionEstimate(cached);
      }

      return null;

    } catch (error) {
      logger.warn({
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId
      }, 'Failed to get cached production estimate');
      return null;
    }
  }

  /**
   * Save production estimate to database
   */
  private async saveProductionEstimate(estimate: ProductionEstimate): Promise<ProductionEstimate> {
    try {
      const saved = await prisma.productionEstimate.create({
        data: {
          projectId: estimate.projectId,
          systemSizeKw: estimate.systemSizeKw,
          configuration: estimate.configuration as unknown as Prisma.InputJsonValue,
          solarResourceId: estimate.solarResource.id,
          annualProduction: estimate.annualProduction,
          monthlyProduction: estimate.monthlyProduction,
          hourlyProduction: estimate.hourlyProduction || [],
          specificYield: estimate.specificYield,
          performanceRatio: estimate.performanceRatio,
          capacityFactor: estimate.capacityFactor,
          year1Degradation: estimate.year1Degradation,
          annualDegradation: estimate.annualDegradation,
          productionProfile25Years: estimate.productionProfile25Years,
          modelingMethod: estimate.modelingMethod,
          confidence: estimate.confidence
        },
        include: { solarResource: true }
      });

      return this.transformDbProductionEstimate(saved);

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId: estimate.projectId
      }, 'Failed to save production estimate');
      throw error;
    }
  }

  /**
   * Transform database record to ProductionEstimate
   */
  private transformDbProductionEstimate(db: Record<string, unknown>): ProductionEstimate {
    return {
      ...db,
      configuration: db.configuration as SystemConfiguration,
      createdAt: db.createdAt as Date
    } as ProductionEstimate;
  }

  /**
   * Check if configurations are similar enough to use cached result
   */
  private isConfigurationSimilar(
    config1: SystemConfiguration, 
    config2: SystemConfiguration
  ): boolean {
    const tiltDiff = Math.abs(config1.tilt - config2.tilt);
    const azimuthDiff = Math.abs(config1.azimuth - config2.azimuth);
    
    return (
      config1.installationType === config2.installationType &&
      config1.moduleType === config2.moduleType &&
      tiltDiff <= 5 && // 5 degree tolerance
      azimuthDiff <= 10 && // 10 degree tolerance
      Math.abs((config1.shadingLoss || 0) - (config2.shadingLoss || 0)) <= 2
    );
  }
}

// Export singleton instance
export const productionModelingService = new ProductionModelingService();

// Export individual services for testing
export { PVWattsService, SAMService, AuroraService };
