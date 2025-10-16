-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientName" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'intake',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ocrText" TEXT,
    "extractedData" TEXT,
    CONSTRAINT "Bill_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "monthlyUsageKwh" REAL NOT NULL,
    "peakDemandKw" REAL,
    "averageCostPerKwh" REAL NOT NULL,
    "annualCostUsd" REAL NOT NULL,
    "recommendations" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Analysis_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "System" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "solarPanelCount" INTEGER NOT NULL,
    "solarPanelWattage" INTEGER NOT NULL,
    "totalSolarKw" REAL NOT NULL,
    "batteryKwh" REAL NOT NULL,
    "batteryType" TEXT NOT NULL,
    "inverterKw" REAL NOT NULL,
    "inverterType" TEXT NOT NULL,
    "backupDurationHrs" INTEGER NOT NULL,
    "criticalLoadKw" REAL NOT NULL,
    "estimatedCostUsd" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "System_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BOMItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "manufacturer" TEXT,
    "modelNumber" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceUsd" REAL NOT NULL,
    "totalPriceUsd" REAL NOT NULL,
    "sourceUrl" TEXT,
    "notes" TEXT,
    CONSTRAINT "BOMItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "necChecks" TEXT NOT NULL,
    "warnings" TEXT,
    "installSteps" TEXT NOT NULL,
    "timeline" TEXT,
    "laborHoursEst" REAL,
    "permitNotes" TEXT,
    "finalPdfPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Plan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Bill_projectId_idx" ON "Bill"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Analysis_projectId_key" ON "Analysis"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "System_projectId_key" ON "System"("projectId");

-- CreateIndex
CREATE INDEX "BOMItem_projectId_idx" ON "BOMItem"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_projectId_key" ON "Plan"("projectId");
