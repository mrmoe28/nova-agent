-- Enhanced Energy Analysis Schema
-- Adds comprehensive support for accurate bill parsing, tariff modeling, 
-- load profiling, production estimation, and system sizing validation

-- ==================== TARIFF MANAGEMENT ====================

-- Utility companies and service territories
CREATE TABLE "Utility" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "serviceTerritory" JSONB,
    "regulatoryBody" TEXT,
    "websiteUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Utility_pkey" PRIMARY KEY ("id")
);

-- Tariff structures and rate schedules
CREATE TABLE "Tariff" (
    "id" TEXT NOT NULL,
    "utilityId" TEXT NOT NULL,
    "tariffName" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "sector" TEXT NOT NULL DEFAULT 'residential',
    "voltage" TEXT,
    "phaseWiring" TEXT,
    
    -- Rate structure (JSON for flexibility)
    "rateStructure" JSONB NOT NULL,
    
    -- Source information
    "source" TEXT NOT NULL,
    "sourceId" TEXT,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Geographic coverage
    "serviceTerritory" JSONB,
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tariff_pkey" PRIMARY KEY ("id")
);

-- ==================== ENHANCED BILL ANALYSIS ====================

-- Extended bill data with enhanced parsing and validation
CREATE TABLE "EnhancedBill" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "originalBillId" TEXT NOT NULL, -- References existing Bill table
    
    -- Enhanced parsing results
    "parsedData" JSONB NOT NULL,
    "lineItems" JSONB NOT NULL,
    "ocrResult" JSONB,
    
    -- Validation metrics
    "parseConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalVariance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "validationResult" JSONB NOT NULL,
    
    -- Tariff association
    "tariffId" TEXT,
    "rateSchedule" TEXT,
    
    -- Processing metadata
    "processingMethod" TEXT NOT NULL,
    "processingTime" INTEGER NOT NULL,
    "correlationId" TEXT,
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnhancedBill_pkey" PRIMARY KEY ("id")
);

-- ==================== LOAD PROFILING ====================

-- Customer load profiles and usage patterns
CREATE TABLE "LoadProfile" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "profileType" TEXT NOT NULL DEFAULT 'monthly',
    
    -- Profile data points
    "dataPoints" JSONB NOT NULL,
    
    -- Profile characteristics
    "annualKwh" DOUBLE PRECISION NOT NULL,
    "peakKw" DOUBLE PRECISION NOT NULL,
    "loadFactor" DOUBLE PRECISION NOT NULL,
    
    -- Time-of-use breakdown
    "onPeakKwh" DOUBLE PRECISION,
    "midPeakKwh" DOUBLE PRECISION,
    "offPeakKwh" DOUBLE PRECISION,
    
    -- Quality metrics
    "dataCompleteness" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimationMethod" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoadProfile_pkey" PRIMARY KEY ("id")
);

-- Critical load circuits for backup sizing
CREATE TABLE "CriticalLoadProfile" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    
    -- Critical circuits definition
    "circuits" JSONB NOT NULL,
    
    -- Summary metrics
    "totalCriticalKw" DOUBLE PRECISION NOT NULL,
    "averageDailyKwh" DOUBLE PRECISION NOT NULL,
    "peakSimultaneousKw" DOUBLE PRECISION NOT NULL,
    "diversityFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CriticalLoadProfile_pkey" PRIMARY KEY ("id")
);

-- ==================== PRODUCTION MODELING ====================

-- Solar resource data for locations
CREATE TABLE "SolarResource" (
    "id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "timezone" TEXT NOT NULL,
    
    -- Irradiance data (monthly arrays)
    "ghi" DOUBLE PRECISION[],
    "dni" DOUBLE PRECISION[],
    "dhi" DOUBLE PRECISION[],
    "temperature" DOUBLE PRECISION[],
    
    -- Data source metadata
    "source" TEXT NOT NULL,
    "dataYear" INTEGER NOT NULL,
    "spatialResolution" DOUBLE PRECISION,
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolarResource_pkey" PRIMARY KEY ("id")
);

-- Production estimates with detailed modeling
CREATE TABLE "ProductionEstimate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "systemSizeKw" DOUBLE PRECISION NOT NULL,
    
    -- System configuration
    "configuration" JSONB NOT NULL,
    "solarResourceId" TEXT NOT NULL,
    
    -- Production estimates
    "annualProduction" DOUBLE PRECISION NOT NULL,
    "monthlyProduction" DOUBLE PRECISION[],
    "hourlyProduction" DOUBLE PRECISION[], -- Optional 8760 array
    
    -- Performance metrics
    "specificYield" DOUBLE PRECISION NOT NULL,
    "performanceRatio" DOUBLE PRECISION NOT NULL,
    "capacityFactor" DOUBLE PRECISION NOT NULL,
    
    -- Degradation modeling
    "year1Degradation" DOUBLE PRECISION NOT NULL DEFAULT 0.005,
    "annualDegradation" DOUBLE PRECISION NOT NULL DEFAULT 0.007,
    "productionProfile25Years" DOUBLE PRECISION[],
    
    -- Model validation
    "modelingMethod" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionEstimate_pkey" PRIMARY KEY ("id")
);

-- ==================== EQUIPMENT CATALOG ====================

-- Enhanced equipment catalog with full specifications
CREATE TABLE "EquipmentCatalog" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    
    -- Basic information
    "manufacturer" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "description" TEXT,
    
    -- Technical specifications (flexible JSON)
    "specifications" JSONB NOT NULL,
    
    -- Compliance and certifications
    "certifications" TEXT[],
    "necCompliant" BOOLEAN NOT NULL DEFAULT false,
    "ulListed" BOOLEAN NOT NULL DEFAULT false,
    
    -- Commercial information
    "distributorId" TEXT,
    "currentPrice" DOUBLE PRECISION,
    "availability" TEXT NOT NULL DEFAULT 'unknown',
    "leadTime" INTEGER,
    
    -- Data quality
    "dataSource" TEXT NOT NULL,
    "lastVerified" TIMESTAMP(3) NOT NULL,
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentCatalog_pkey" PRIMARY KEY ("id")
);

-- Battery performance models
CREATE TABLE "BatteryPerformanceModel" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "equipmentCatalogId" TEXT NOT NULL,
    
    -- Battery specifications
    "batterySpecs" JSONB NOT NULL,
    
    -- Dispatch strategy
    "dispatchMode" TEXT NOT NULL DEFAULT 'self_consumption',
    
    -- Performance modeling
    "dailyCycles" DOUBLE PRECISION NOT NULL,
    "seasonalEfficiency" DOUBLE PRECISION[],
    "temperatureEffects" BOOLEAN NOT NULL DEFAULT true,
    
    -- Economic parameters
    "warrantyYears" INTEGER NOT NULL,
    "warrantyThroughput" DOUBLE PRECISION NOT NULL,
    "replacementCost" DOUBLE PRECISION,
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BatteryPerformanceModel_pkey" PRIMARY KEY ("id")
);

-- ==================== SYSTEM SIZING ====================

-- Enhanced system sizing recommendations
CREATE TABLE "SizingRecommendation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    
    -- Recommended system sizes
    "solarSizeKw" DOUBLE PRECISION NOT NULL,
    "batterySizeKwh" DOUBLE PRECISION NOT NULL,
    "inverterSizeKw" DOUBLE PRECISION NOT NULL,
    
    -- Selected equipment (references to catalog)
    "selectedEquipment" JSONB NOT NULL,
    
    -- Performance projections
    "productionEstimateId" TEXT,
    "batteryPerformanceModelId" TEXT,
    
    -- Financial analysis
    "systemCost" DOUBLE PRECISION NOT NULL,
    "annualSavings" DOUBLE PRECISION NOT NULL,
    "paybackPeriod" DOUBLE PRECISION NOT NULL,
    "roi25Year" DOUBLE PRECISION NOT NULL,
    "netPresentValue" DOUBLE PRECISION NOT NULL,
    
    -- Utility analysis
    "utilityAnalysis" JSONB NOT NULL,
    
    -- Backup capability
    "backupCapability" JSONB NOT NULL,
    
    -- Validation metrics
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "alternativeOptions" JSONB,
    "methodology" TEXT NOT NULL,
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SizingRecommendation_pkey" PRIMARY KEY ("id")
);

-- ==================== VALIDATION & MONITORING ====================

-- Test fixtures for validation
CREATE TABLE "ValidationFixture" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    
    -- Test inputs
    "testInputs" JSONB NOT NULL,
    "expectedOutputs" JSONB NOT NULL,
    "allowedVariances" JSONB NOT NULL,
    
    -- Metadata
    "source" TEXT NOT NULL DEFAULT 'synthetic',
    "validationStatus" TEXT NOT NULL DEFAULT 'pending',
    "lastValidated" TIMESTAMP(3),
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValidationFixture_pkey" PRIMARY KEY ("id")
);

-- Project quality metrics and monitoring
CREATE TABLE "ProjectMetrics" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    
    -- Bill analysis metrics
    "billParsingAccuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ocrConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalBillVariance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "detectedAnomalies" INTEGER NOT NULL DEFAULT 0,
    
    -- Sizing accuracy metrics
    "productionModelConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "equipmentMatchConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "financialProjectionAccuracy" DOUBLE PRECISION,
    
    -- Performance tracking (post-installation)
    "actualVsPredictedProduction" DOUBLE PRECISION,
    "actualVsPredictedSavings" DOUBLE PRECISION,
    "actualVsPredictedUsage" DOUBLE PRECISION,
    
    -- Quality scores
    "overallConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "riskFactors" TEXT[],
    "recommendationsQuality" TEXT NOT NULL DEFAULT 'medium',
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMetrics_pkey" PRIMARY KEY ("id")
);

-- System alerts and monitoring
CREATE TABLE "SystemAlert" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    
    -- Alert content
    "message" TEXT NOT NULL,
    "details" JSONB,
    "suggestedActions" TEXT[],
    
    -- Resolution tracking
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemAlert_pkey" PRIMARY KEY ("id")
);

-- ==================== FOREIGN KEY CONSTRAINTS ====================

-- Tariff relationships
ALTER TABLE "Tariff" ADD CONSTRAINT "Tariff_utilityId_fkey" FOREIGN KEY ("utilityId") REFERENCES "Utility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Enhanced bill relationships
ALTER TABLE "EnhancedBill" ADD CONSTRAINT "EnhancedBill_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnhancedBill" ADD CONSTRAINT "EnhancedBill_originalBillId_fkey" FOREIGN KEY ("originalBillId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnhancedBill" ADD CONSTRAINT "EnhancedBill_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "Tariff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Load profile relationships
ALTER TABLE "LoadProfile" ADD CONSTRAINT "LoadProfile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CriticalLoadProfile" ADD CONSTRAINT "CriticalLoadProfile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Production estimate relationships
ALTER TABLE "ProductionEstimate" ADD CONSTRAINT "ProductionEstimate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductionEstimate" ADD CONSTRAINT "ProductionEstimate_solarResourceId_fkey" FOREIGN KEY ("solarResourceId") REFERENCES "SolarResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Battery performance relationships
ALTER TABLE "BatteryPerformanceModel" ADD CONSTRAINT "BatteryPerformanceModel_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BatteryPerformanceModel" ADD CONSTRAINT "BatteryPerformanceModel_equipmentCatalogId_fkey" FOREIGN KEY ("equipmentCatalogId") REFERENCES "EquipmentCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Equipment catalog relationships
ALTER TABLE "EquipmentCatalog" ADD CONSTRAINT "EquipmentCatalog_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Sizing recommendation relationships
ALTER TABLE "SizingRecommendation" ADD CONSTRAINT "SizingRecommendation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SizingRecommendation" ADD CONSTRAINT "SizingRecommendation_productionEstimateId_fkey" FOREIGN KEY ("productionEstimateId") REFERENCES "ProductionEstimate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SizingRecommendation" ADD CONSTRAINT "SizingRecommendation_batteryPerformanceModelId_fkey" FOREIGN KEY ("batteryPerformanceModelId") REFERENCES "BatteryPerformanceModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Monitoring relationships
ALTER TABLE "ProjectMetrics" ADD CONSTRAINT "ProjectMetrics_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SystemAlert" ADD CONSTRAINT "SystemAlert_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================== INDEXES FOR PERFORMANCE ====================

-- Tariff lookup indexes
CREATE INDEX "Tariff_utilityId_sector_idx" ON "Tariff"("utilityId", "sector");
CREATE INDEX "Tariff_effectiveDate_endDate_idx" ON "Tariff"("effectiveDate", "endDate");

-- Bill analysis indexes
CREATE INDEX "EnhancedBill_projectId_idx" ON "EnhancedBill"("projectId");
CREATE INDEX "EnhancedBill_parseConfidence_idx" ON "EnhancedBill"("parseConfidence");

-- Load profile indexes
CREATE INDEX "LoadProfile_projectId_profileType_idx" ON "LoadProfile"("projectId", "profileType");

-- Equipment catalog indexes
CREATE INDEX "EquipmentCatalog_category_manufacturer_idx" ON "EquipmentCatalog"("category", "manufacturer");
CREATE INDEX "EquipmentCatalog_distributorId_idx" ON "EquipmentCatalog"("distributorId");

-- Solar resource spatial index
CREATE INDEX "SolarResource_location_idx" ON "SolarResource"("latitude", "longitude");

-- Monitoring indexes
CREATE INDEX "SystemAlert_status_severity_idx" ON "SystemAlert"("status", "severity");
CREATE INDEX "SystemAlert_createdAt_idx" ON "SystemAlert"("createdAt");
CREATE INDEX "ProjectMetrics_overallConfidence_idx" ON "ProjectMetrics"("overallConfidence");
