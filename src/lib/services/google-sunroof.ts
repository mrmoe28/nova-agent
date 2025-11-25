/**
 * Google Sunroof API Integration
 * Provides automatic roof analysis, shading detection, and solar potential
 */

export interface RoofSegment {
  center: {
    latitude: number;
    longitude: number;
  };
  boundingBox: {
    sw: { latitude: number; longitude: number };
    ne: { latitude: number; longitude: number };
  };
  planeHeightAtCenterMeters: number;
  azimuthDegrees: number;
  pitchDegrees: number;
  areaMeters2: number;
  sunshineQuantiles: number[]; // Hourly sunshine estimates
  stats: {
    areaMeters2: number;
    sunshineQuantiles: number[];
    groundAreaMeters2: number;
  };
}

export interface SunroofData {
  name: string; // Address
  center: {
    latitude: number;
    longitude: number;
  };
  imageryDate: {
    year: number;
    month: number;
    day: number;
  };
  imageryProcessedDate: {
    year: number;
    month: number;
    day: number;
  };
  postalCode: string;
  administrativeArea: string;

  // Solar potential summary
  solarPotential: {
    maxArrayPanelsCount: number;
    maxArrayAreaMeters2: number;
    maxSunshineHoursPerYear: number;
    carbonOffsetFactorKgPerMwh: number;

    // Financial estimates
    wholeRoofStats: {
      areaMeters2: number;
      sunshineQuantiles: number[];
      groundAreaMeters2: number;
    };

    // Panel configurations
    solarPanelConfigs: Array<{
      panelsCount: number;
      yearlyEnergyDcKwh: number;
      roofSegmentSummaries: Array<{
        pitchDegrees: number;
        azimuthDegrees: number;
        panelsCount: number;
        yearlyEnergyDcKwh: number;
      }>;
    }>;

    // Financial configurations
    financialAnalyses: Array<{
      monthlyBill: {
        units: number; // USD
      };
      defaultBill: boolean;
      averageKwhPerMonth: number;
      panelConfigIndex: number;
    }>;
  };

  // Roof segments
  roofSegmentStats: RoofSegment[];
}

export interface SunroofAnalysis {
  address: string;
  roofArea: number; // square feet
  usableRoofArea: number; // square feet
  maxPanelCount: number;
  maxSystemSizeKw: number;
  averageAzimuth: number; // degrees
  averageTilt: number; // degrees
  annualSunshineHours: number;
  shadingFactor: number; // 0-1, where 1 is no shading
  estimatedAnnualProductionKwh: number;
  optimalPanelLayout: Array<{
    segmentId: number;
    panelCount: number;
    azimuth: number;
    tilt: number;
    annualProduction: number;
  }>;
  imageryDate: string;
  confidence: number;
}

class GoogleSunroofService {
  private apiKey: string;
  private baseUrl = 'https://solar.googleapis.com/v1';

  constructor() {
    this.apiKey = process.env.GOOGLE_SUNROOF_API_KEY || '';
  }

  /**
   * Check if Google Sunroof API is configured
   */
  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  /**
   * Get building insights for an address
   */
  async getBuildingInsights(address: string): Promise<SunroofData> {
    if (!this.isConfigured()) {
      throw new Error('Google Sunroof API key not configured');
    }

    const url = `${this.baseUrl}/buildingInsights:findClosest?location.address=${encodeURIComponent(address)}&key=${this.apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Sunroof API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Analyze roof for solar potential
   */
  async analyzeRoof(address: string): Promise<SunroofAnalysis> {
    const sunroofData = await this.getBuildingInsights(address);

    // Extract roof statistics
    const wholeRoofStats = sunroofData.solarPotential.wholeRoofStats;
    const roofAreaM2 = wholeRoofStats.areaMeters2;
    const roofAreaSqFt = roofAreaM2 * 10.764; // Convert to square feet

    // Calculate usable roof area (accounting for obstacles, setbacks, etc.)
    const maxArrayArea = sunroofData.solarPotential.maxArrayAreaMeters2;
    const usableRoofAreaSqFt = maxArrayArea * 10.764;

    // Panel capacity
    const maxPanelCount = sunroofData.solarPotential.maxArrayPanelsCount;
    const panelWattage = 400; // Standard panel wattage
    const maxSystemSizeKw = (maxPanelCount * panelWattage) / 1000;

    // Sunshine hours
    const annualSunshineHours = sunroofData.solarPotential.maxSunshineHoursPerYear;

    // Calculate average azimuth and tilt from roof segments
    const segments = sunroofData.roofSegmentStats;
    const weightedAzimuth = segments.reduce((sum, seg) =>
      sum + (seg.azimuthDegrees * seg.areaMeters2), 0
    ) / roofAreaM2;

    const weightedTilt = segments.reduce((sum, seg) =>
      sum + (seg.pitchDegrees * seg.areaMeters2), 0
    ) / roofAreaM2;

    // Calculate shading factor from sunshine quantiles
    // Sunshine quantiles represent how much sun different parts of the roof receive
    const avgSunshineQuantile = wholeRoofStats.sunshineQuantiles.reduce((a, b) => a + b, 0) /
      wholeRoofStats.sunshineQuantiles.length;
    const maxPossibleSunshine = 4383; // Maximum possible sunshine hours/year (12 hrs/day)
    const shadingFactor = Math.min(annualSunshineHours / maxPossibleSunshine, 1);

    // Estimate annual production from largest panel configuration
    const bestConfig = sunroofData.solarPotential.solarPanelConfigs
      .reduce((best, config) =>
        config.yearlyEnergyDcKwh > best.yearlyEnergyDcKwh ? config : best
      );

    const estimatedAnnualProductionKwh = bestConfig.yearlyEnergyDcKwh;

    // Create optimal panel layout from best configuration
    const optimalPanelLayout = bestConfig.roofSegmentSummaries.map((summary, idx) => ({
      segmentId: idx,
      panelCount: summary.panelsCount,
      azimuth: summary.azimuthDegrees,
      tilt: summary.pitchDegrees,
      annualProduction: summary.yearlyEnergyDcKwh,
    }));

    // Imagery date
    const imgDate = sunroofData.imageryDate;
    const imageryDate = `${imgDate.year}-${String(imgDate.month).padStart(2, '0')}-${String(imgDate.day).padStart(2, '0')}`;

    // Confidence based on imagery age and data completeness
    const monthsSinceImagery = this.monthsSince(imageryDate);
    const imageryConfidence = Math.max(0, 1 - (monthsSinceImagery / 60)); // Degrade over 5 years
    const dataCompleteness = segments.length > 0 ? 1 : 0;
    const confidence = (imageryConfidence * 0.6) + (dataCompleteness * 0.4);

    return {
      address: sunroofData.name,
      roofArea: roofAreaSqFt,
      usableRoofArea: usableRoofAreaSqFt,
      maxPanelCount,
      maxSystemSizeKw,
      averageAzimuth: weightedAzimuth,
      averageTilt: weightedTilt,
      annualSunshineHours,
      shadingFactor,
      estimatedAnnualProductionKwh,
      optimalPanelLayout,
      imageryDate,
      confidence,
    };
  }

  /**
   * Calculate months since a date string
   */
  private monthsSince(dateStr: string): number {
    const date = new Date(dateStr);
    const now = new Date();
    return (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 30);
  }

  /**
   * Get imagery quality and date
   */
  async getImageryInfo(address: string): Promise<{
    date: string;
    quality: 'high' | 'medium' | 'low';
    monthsOld: number;
  }> {
    const sunroofData = await this.getBuildingInsights(address);
    const imgDate = sunroofData.imageryDate;
    const imageryDate = `${imgDate.year}-${String(imgDate.month).padStart(2, '0')}-${String(imgDate.day).padStart(2, '0')}`;
    const monthsOld = this.monthsSince(imageryDate);

    let quality: 'high' | 'medium' | 'low';
    if (monthsOld < 24) {
      quality = 'high';
    } else if (monthsOld < 48) {
      quality = 'medium';
    } else {
      quality = 'low';
    }

    return {
      date: imageryDate,
      quality,
      monthsOld,
    };
  }
}

export const googleSunroofService = new GoogleSunroofService();
