-- AlterTable
ALTER TABLE "Distributor" ADD COLUMN     "lastScrapedAt" TIMESTAMP(3),
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "paymentTerms" TEXT,
ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "scrapeMetadata" TEXT,
ADD COLUMN     "shippingInfo" TEXT;

-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "lastScrapedAt" TIMESTAMP(3),
ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "reviewCount" INTEGER,
ADD COLUMN     "sourceUrl" TEXT,
ADD COLUMN     "warranty" TEXT;

-- CreateTable
CREATE TABLE "ScrapeHistory" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "itemsFound" INTEGER NOT NULL DEFAULT 0,
    "itemsSaved" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metadata" TEXT,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrapeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScrapeHistory_distributorId_idx" ON "ScrapeHistory"("distributorId");

-- CreateIndex
CREATE INDEX "ScrapeHistory_scrapedAt_idx" ON "ScrapeHistory"("scrapedAt");

-- CreateIndex
CREATE INDEX "Distributor_website_idx" ON "Distributor"("website");

-- CreateIndex
CREATE INDEX "Equipment_manufacturer_idx" ON "Equipment"("manufacturer");

-- AddForeignKey
ALTER TABLE "ScrapeHistory" ADD CONSTRAINT "ScrapeHistory_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
