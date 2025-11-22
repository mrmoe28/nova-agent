/**
 * Enhanced Energy System Types for NovaAgent
 * Provides comprehensive type safety for bill analysis, tariff modeling,
 * load profiling, and precision system sizing.
 */

// ==================== BILL ANALYSIS TYPES ====================

export interface OCRResult {
  text: string;
  confidence: number;
  boundingBoxes?: Array<{
    text: string;
    confidence: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  processingMethod: 'tesseract' | 'anthropic' | 'azure-form-recognizer';
  processingTime: number;
  warnings?: string[];
}

export interface BillLineItem {
  description: string;
  quantity?: number;
  rate?: number;
  amount: number;
  units?: string;
  category: 'energy' | 'demand' | 'delivery' | 'tax' | 'fee' | 'credit' | 'other';
  subcategory?: string;
}

export interface BillingPeriod {
  startDate: Date;
  endDate: Date;
  daysInPeriod: number;
  isEstimated: boolean;
  previousReading?: number;
  currentReading?: number;
  meterMultiplier?: number;
}

export interface ParsedBillData {
  // Core identification
  accountNumber?: string;
  serviceAddress?: string;
  utilityName?: string;
  meterNumber?: string;

  // Billing period info
  billingPeriod: BillingPeriod;
  billDate: Date;
  dueDate?: Date;

  // Energy consumption
  totalKwh: number;
  peakKw?: number;
  offPeakKwh?: number;
  midPeakKwh?: number;
  onPeakKwh?: number;

  // Financial data
  totalAmount: number;
  energyCharges: number;
  demandCharges?: number;
  deliveryCharges?: number;
  taxes: number;
  fees: number;
  credits?: number;
  lineItems: BillLineItem[];

  // Tariff information
  rateSchedule?: string;
  tariffId?: string;

  // Quality metrics
  parseConfidence: number;
  totalVariance: number; // Difference between sum of line items and total amount
  warnings: string[];
  errors: string[];
}

export interface BillValidationResult {
  isValid: boolean;
  confidence: number;
  totalVariance: number;
  toleranceExceeded: boolean;
  missingFields: string[];
  anomalies: Array<{
    type: 'usage_spike' | 'missing_period' | 'duplicate_period' | 'tariff_mismatch' | 'bill_parsing_error' | 'ocr_low_confidence' | 'tariff_unavailable' | 'production_variance' | 'sizing_confidence_low' | 'validation_failure';
    severity: 'info' | 'warning' | 'error';
    message: string;
    suggestedAction?: string;
  }>;
}

// ==================== TARIFF MODELING TYPES ====================

export interface TariffRate {
  rateType: 'flat' | 'tiered' | 'tou' | 'demand';
  energyRates?: Array<{
    fromKwh?: number;
    toKwh?: number;
    rate: number;
    timeOfUse?: 'on_peak' | 'mid_peak' | 'off_peak';
    season?: 'summer' | 'winter';
    applicableDays?: number[]; // 0-6 for Sunday-Saturday
  }>;
  demandRates?: Array<{
    rate: number;
    timeOfUse?: string;
    season?: string;
  }>;
  fixedCharges: number;
  minimumCharge?: number;
}

export interface Tariff {
  id: string;
  utilityId: string;
  utilityName: string;
  tariffName: string;
  effectiveDate: Date;
  endDate?: Date;
  
  // Rate structure
  rates: TariffRate;
  
  // Metadata
  sector: 'residential' | 'commercial' | 'industrial';
  voltage?: string;
  phaseWiring?: 'single' | 'three';
  
  // Source information
  source: 'openei' | 'genability' | 'utility_api' | 'manual';
  sourceId?: string;
  lastUpdated: Date;
  
  // Geographic coverage
  serviceTerritory?: {
    state: string;
    zipCodes?: string[];
    counties?: string[];
  };
}

// ==================== LOAD PROFILING TYPES ====================

export interface LoadProfile {
  id: string;
  projectId: string;
  profileType: 'monthly' | 'hourly' | '15_minute';
  dataPoints: Array<{
    timestamp: Date;
    kwhUsage: number;
    kwDemand?: number;
    temperature?: number;
    isEstimated: boolean;
  }>;

  // Profile characteristics
  annualKwh: number;
  peakKw: number;
  loadFactor: number;
  
  // Time-of-use breakdown
  onPeakKwh?: number;
  midPeakKwh?: number;
  offPeakKwh?: number;
  
  // Quality metrics
  dataCompleteness: number; // Percentage of complete data points
  estimationMethod?: 'bill_disaggregation' | 'smart_meter' | 'typical_profiles';
  confidence: number;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface CriticalLoadProfile {
  projectId: string;
  circuits: Array<{
    name: string;
    description?: string;
    estimatedKw: number;
    priority: 'essential' | 'important' | 'optional';
    typicalHoursPerDay: number;
  }>;
  
  totalCriticalKw: number;
  averageDailyKwh: number;
  peakSimultaneousKw: number;
  diversityFactor: number;
}

// ==================== PRODUCTION MODELING TYPES ====================

export interface SolarResource {
  id: string;
  latitude: number;
  longitude: number;
  timezone: string;

  // Irradiance data
  ghi: number[]; // Global Horizontal Irradiance (monthly averages)
  dni: number[]; // Direct Normal Irradiance
  dhi: number[]; // Diffuse Horizontal Irradiance

  // Climate data
  temperature: number[]; // Monthly average temperatures

  // Data source
  source: 'nsrdb' | 'pvwatts' | 'sam' | 'aurora' | 'helioscope';
  dataYear: number;
  spatialResolution?: number; // km
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SystemConfiguration {
  // Array configuration
  tilt: number;
  azimuth: number;
  trackingType: 'fixed' | 'single_axis' | 'dual_axis';
  
  // Shading and losses
  shadingLoss: number; // Percentage
  soilingLoss: number;
  dcLosses: number;
  acLosses: number;
  inverterEfficiency: number;
  
  // Module specifications
  moduleType: 'standard' | 'premium' | 'thin_film';
  moduleEfficiency?: number;
  temperatureCoefficient?: number;
  
  // Installation factors
  installationType: 'roof_mount' | 'ground_mount' | 'carport' | 'tracker';
  roofType?: 'composition' | 'tile' | 'metal' | 'flat';
}

export interface ProductionEstimate {
  id: string;
  projectId: string;
  systemSizeKw: number;
  configuration: SystemConfiguration;
  solarResource: SolarResource;
  
  // Production estimates
  annualProduction: number; // kWh
  monthlyProduction: number[]; // 12 months
  hourlyProduction?: number[]; // 8760 hours
  
  // Performance metrics
  specificYield: number; // kWh/kW/year
  performanceRatio: number;
  capacityFactor: number;
  
  // Degradation modeling
  year1Degradation: number;
  annualDegradation: number;
  productionProfile25Years: number[];
  
  // Validation
  modelingMethod: 'pvwatts' | 'sam' | 'aurora' | 'helioscope' | 'pvsyst';
  confidence: number;
  
  createdAt: Date;
}

// ==================== BATTERY MODELING TYPES ====================

export interface BatterySpecs {
  manufacturer: string;
  model: string;
  chemistry: 'lithium_ion' | 'lithium_phosphate' | 'lead_acid';
  
  // Electrical specifications
  nominalVoltage: number;
  nominalCapacityKwh: number;
  usableCapacityKwh: number;
  maxChargeRateKw: number;
  maxDischargeRateKw: number;
  
  // Performance characteristics
  roundTripEfficiency: number;
  maxDoD: number; // Maximum Depth of Discharge
  cycleLife: number;
  calendarLife: number;
  
  // Environmental
  operatingTempMin: number;
  operatingTempMax: number;
  
  // Safety and compliance
  ul9540Listed: boolean;
  ul9540aReported: boolean;
  ul1973Listed: boolean;
}

export interface BatteryPerformanceModel {
  batteryId: string;
  specs: BatterySpecs;
  
  // Dispatch strategy
  dispatchMode: 'self_consumption' | 'time_of_use' | 'backup_only' | 'peak_shaving';
  
  // Performance modeling
  dailyCycles: number;
  seasonalEfficiency: number[];
  temperatureEffects: boolean;
  
  // Economic parameters
  warrantyYears: number;
  warrantyThroughput: number; // kWh
  replacementCost?: number;
}

// ==================== EQUIPMENT CATALOG TYPES ====================

export interface EquipmentCatalogItem {
  id: string;
  category: 'solar_panel' | 'inverter' | 'battery' | 'mounting' | 'electrical';
  
  // Basic info
  manufacturer: string;
  model: string;
  description?: string;
  
  // Technical specifications (varies by category)
  specifications: Record<string, unknown>;
  
  // Compliance and certifications
  certifications: string[];
  necCompliant: boolean;
  ulListed: boolean;
  
  // Commercial info
  distributorId?: string;
  currentPrice?: number;
  availability: 'in_stock' | 'limited' | 'backordered' | 'discontinued';
  leadTime?: number;
  
  // Data quality
  dataSource: 'manufacturer' | 'distributor' | 'certified_database';
  lastVerified: Date;
}

// ==================== SYSTEM SIZING TYPES ====================

export interface SizingInputs {
  projectId: string;
  
  // Customer requirements
  goals: Array<'bill_reduction' | 'backup_power' | 'net_zero' | 'roi_optimization'>;
  budgetConstraint?: number;
  backupDuration?: number; // hours
  criticalLoads?: CriticalLoadProfile;
  
  // Site characteristics
  location: {
    latitude: number;
    longitude: number;
    address: string;
    timezone: string;
  };
  
  // Existing data
  loadProfile?: LoadProfile;
  tariff?: Tariff;
  billHistory: ParsedBillData[];
  
  // Constraints
  maxSystemSizeKw?: number;
  roofArea?: number; // square feet
  shadingConstraints?: string[];
  utilityInterconnectionLimits?: number;
}

export interface SizingRecommendation {
  projectId: string;
  
  // Recommended system
  solarSizeKw: number;
  batterySizeKwh: number;
  inverterSizeKw: number;
  
  // Selected equipment
  selectedEquipment: {
    solarPanels: EquipmentCatalogItem;
    inverters: EquipmentCatalogItem;
    batteries?: EquipmentCatalogItem;
    mounting: EquipmentCatalogItem;
  };
  
  // Performance projections
  productionEstimate: ProductionEstimate;
  batteryPerformance?: BatteryPerformanceModel;
  
  // Financial analysis
  systemCost: number;
  annualSavings: number;
  paybackPeriod: number;
  roi25Year: number;
  netPresentValue: number;
  
  // Utility analysis
  newBillProjection: number[];
  gridExportKwh: number;
  selfConsumptionRate: number;
  backupCapability: {
    autonomyHours: number;
    criticalLoadsCovered: string[];
  };
  
  // Validation metrics
  confidence: number;
  alternativeOptions: Array<{
    description: string;
    sizingDifference: string;
    costDifference: number;
    performanceTrade: string;
  }>;
  
  createdAt: Date;
  methodology: string;
}

// ==================== VALIDATION & MONITORING TYPES ====================

export interface ValidationFixture {
  id: string;
  name: string;
  description: string;
  
  // Test inputs
  billFiles: string[];
  expectedBillData: ParsedBillData[];
  siteCharacteristics: SizingInputs;
  
  // Expected outputs
  expectedProductionEstimate: ProductionEstimate;
  expectedSizingRecommendation: SizingRecommendation;
  
  // Tolerances
  allowedVariances: {
    billParsingAccuracy: number;
    productionEstimate: number;
    systemSizing: number;
    costEstimate: number;
  };
  
  // Metadata
  source: 'real_project' | 'synthetic' | 'benchmark';
  createdAt: Date;
  lastValidated: Date;
  validationStatus: 'passing' | 'failing' | 'warning';
}

export interface ProjectMetrics {
  projectId: string;
  
  // Bill analysis metrics
  billParsingAccuracy: number;
  ocrConfidence: number;
  totalBillVariance: number;
  detectedAnomalies: number;
  
  // Sizing accuracy metrics
  productionModelConfidence: number;
  equipmentMatchConfidence: number;
  financialProjectionAccuracy?: number;
  
  // Performance tracking (post-installation)
  actualVsPredictedProduction?: number;
  actualVsPredictedSavings?: number;
  actualVsPredictedUsage?: number;
  
  // Quality scores
  overallConfidence: number;
  riskFactors: string[];
  recommendationsQuality: 'high' | 'medium' | 'low';
  
  lastUpdated: Date;
}

export interface SystemAlert {
  id: string;
  projectId?: string;
  type: 'bill_parsing_error' | 'ocr_low_confidence' | 'tariff_unavailable' | 
        'production_variance' | 'sizing_confidence_low' | 'validation_failure';
  severity: 'info' | 'warning' | 'error' | 'critical';
  
  message: string;
  details?: Record<string, unknown>;
  suggestedActions: string[];
  
  // Resolution
  status: 'open' | 'acknowledged' | 'resolved' | 'false_positive';
  resolvedBy?: string;
  resolvedAt?: Date;
  
  createdAt: Date;
}

// ==================== ERROR TYPES ====================

export class EnergyAnalysisError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'EnergyAnalysisError';
  }
}

export class BillParsingError extends EnergyAnalysisError {
  constructor(message: string, public confidence: number, details?: Record<string, unknown>) {
    super(message, 'BILL_PARSING_ERROR', details, confidence > 0.5);
  }
}

export class TariffLookupError extends EnergyAnalysisError {
  constructor(message: string, public utilityName?: string, details?: Record<string, unknown>) {
    super(message, 'TARIFF_LOOKUP_ERROR', details, true);
  }
}

export class ProductionModelingError extends EnergyAnalysisError {
  constructor(message: string, public location?: string, details?: Record<string, unknown>) {
    super(message, 'PRODUCTION_MODELING_ERROR', details, true);
  }
}

// ==================== API RESPONSE TYPES ====================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    recoverable: boolean;
  };
  warnings?: string[];
  metadata?: {
    processingTime: number;
    confidence?: number;
    correlationId: string;
  };
}

export type BillAnalysisResponse = ApiResponse<{
  parsedBills: ParsedBillData[];
  validation: BillValidationResult;
  loadProfile?: LoadProfile;
  tariff?: Tariff;
  recommendations: string[];
}>;

export type SizingResponse = ApiResponse<{
  recommendation: SizingRecommendation;
  alternatives: SizingRecommendation[];
  metrics: ProjectMetrics;
  alerts: SystemAlert[];
}>;
