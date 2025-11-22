# Complete Scraping Workflow Analysis

## Problem Identified

The error "Invalid `prisma.crawlJob.update()` invocation: No record was found for an update" occurs due to a **race condition** between:

1. The scraping route creating and updating CrawlJob records
2. The cleanup script marking old "running" jobs as failed
3. Orphaned job deletion removing CrawlJob records with null distributorId

## Database Schema Analysis

### CrawlJob Model (schema.prisma:200-220)

```prisma
model CrawlJob {
  id                String       @id @default(cuid())
  type              String       // 'full' | 'category' | 'product' | 'distributor'
  status            String       @default("pending") // 'pending' | 'running' | 'completed' | 'failed'
  targetUrl         String?
  distributorId     String?      // ⚠️ Can be NULL
  productsProcessed Int          @default(0)
  productsUpdated   Int          @default(0)
  errorMessage      String?
  metadata          String?
  startedAt         DateTime?
  completedAt       DateTime?
  createdAt         DateTime     @default(now())

  distributor       Distributor? @relation(fields: [distributorId], references: [id], onDelete: SetNull)
  // ⚠️ onDelete: SetNull means distributorId becomes NULL when distributor deleted
}
```

**Key Issues:**
1. `distributorId` is nullable
2. `onDelete: SetNull` means when a Distributor is deleted, the CrawlJob persists but `distributorId` becomes NULL
3. No cascading delete - orphaned CrawlJobs remain in database

## Complete Scraping Flow

### Route 1: `/api/distributors/scrape-from-url` (Main Route)

**File**: `src/app/api/distributors/scrape-from-url/route.ts`

**Flow**:
```typescript
1. Line 65-74: CREATE CrawlJob with status="running"
   - distributorId can be null if distributor doesn't exist yet
   - startedAt set to now()
   
2. Line 77-89: Scrape company info (5s timeout)
   
3. Line 93-246: Scrape products (can take MINUTES)
   - AI mode: Variable time
   - Deep crawl: 3-30 pages, 2s rate limit = 1-10 minutes
   - Browser mode: Even slower
   
4. Line 248-446: Save to database (can take MINUTES with 500 products)
   - Creates/updates distributor
   - Creates/updates equipment records
   - Creates price snapshots
   - Creates scrape history
   
5. Line 448-463: UPDATE CrawlJob to "completed"
   ⚠️ FAILS HERE if CrawlJob was deleted/cleaned up during steps 2-4
```

**Problem**: Between step 1 and step 5, the CrawlJob can be:
- Marked as failed by cleanup script (>5 min)
- Deleted as orphaned (distributorId = null)
- Deleted if user deletes distributor during scrape

### Route 2: `/api/scrape` (Simple Route)

**File**: `src/app/api/scrape/route.ts`

**Flow**:
- Does NOT create CrawlJob records
- Direct scraping only
- No tracking
- **Not affected by this issue** ✅

### Route 3: `/api/distributors/discover` (Discovery Route)

**File**: `src/app/api/distributors/discover/route.ts`

**Flow**:
- Does NOT create CrawlJob records
- Quick analysis only
- **Not affected by this issue** ✅

### Route 4: `/api/cron/scrape-distributors` (Scheduled Route)

**File**: `src/app/api/cron/scrape-distributors/route.ts`

**Flow**:
```typescript
1. Line 70-78: CREATE CrawlJob with status="running" for each distributor
2. Line 90-168: Scrape company + products
3. Line 236-268: UPDATE CrawlJob to "completed"
```

**Same Problem**: Can fail on update if cleaned up ⚠️

## Race Conditions Identified

### Race Condition #1: Cleanup Script vs Active Scraping

**Timeline**:
```
T=0:00   User clicks "Scrape" on Renewable Outdoors
T=0:01   CrawlJob created (status="running", distributorId=null)
T=0:05   Company info scraped
T=2:00   Deep crawl finds 55 products (2 min)
T=4:00   Saving 55 products to database (2 min)
T=5:01   ⚠️ Cleanup script runs, finds job >5 min old
T=5:02   ⚠️ Cleanup marks job as "failed" OR deletes it (orphaned)
T=6:00   Scraping completes, tries to UPDATE CrawlJob
T=6:01   ❌ ERROR: "No record was found for an update"
```

### Race Condition #2: User Deletes Distributor During Scrape

**Timeline**:
```
T=0:00   User starts scraping Distributor A
T=0:01   CrawlJob created with distributorId="A"
T=2:00   User deletes Distributor A from UI
T=2:01   Database: distributor deleted, CrawlJob.distributorId → NULL
T=5:00   Scraping completes, tries to update CrawlJob
T=5:01   Either succeeds (job exists) or fails (job deleted by cleanup)
```

### Race Condition #3: Multiple Concurrent Scrapes

**Timeline**:
```
T=0:00   User A starts scraping Site 1 (Tab 1)
T=0:10   User B starts scraping Site 2 (Tab 2)
T=0:20   User A starts scraping Site 3 (Tab 3)
T=5:00   All 3 jobs running, cleanup script runs
T=5:01   Cleanup sees multiple old jobs, marks/deletes them
T=6:00   All 3 try to update → all fail
```

## Current Fix (Partial Solution)

**File**: `src/app/api/distributors/scrape-from-url/route.ts:448-490`

```typescript
// Update CrawlJob to completed status
if (crawlJobId) {
  try {
    // Check if crawl job still exists before updating
    const existingJob = await prisma.crawlJob.findUnique({
      where: { id: crawlJobId },
    });

    if (existingJob) {
      await prisma.crawlJob.update({ /* ... */ });
    } else {
      logger.warn("CrawlJob not found for update (may have been cleaned up)");
    }
  } catch (updateError) {
    logger.error("Failed to update crawl job status");
  }
}
```

**What it does**: ✅ Prevents the crash by checking if job exists
**What it doesn't do**: ❌ Doesn't prevent the race condition

## Complete Solution

### Fix 1: Increase Cleanup Threshold ✅

**File**: `fix-stuck-scrapes.ts:18`

```typescript
// OLD: 5 minutes
const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

// NEW: 30 minutes (max scraping time)
const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
```

**Rationale**: Give scraping operations time to complete before cleanup

### Fix 2: Add Heartbeat Updates ✅

**File**: `src/app/api/distributors/scrape-from-url/route.ts`

```typescript
// Add periodic heartbeat to show job is still alive
const heartbeat = setInterval(async () => {
  if (crawlJobId) {
    try {
      await prisma.crawlJob.update({
        where: { id: crawlJobId },
        data: { startedAt: new Date() }, // Update timestamp
      });
    } catch (error) {
      clearInterval(heartbeat);
    }
  }
}, 60000); // Every 1 minute

try {
  // ... scraping logic ...
} finally {
  clearInterval(heartbeat);
}
```

### Fix 3: Don't Delete Orphaned Jobs Immediately ✅

**File**: `fix-stuck-scrapes.ts`

```typescript
// Don't delete orphaned jobs less than 1 hour old
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

const orphanedJobs = await prisma.crawlJob.findMany({
  where: {
    distributorId: null,
    createdAt: { lt: oneHourAgo }, // Only old orphans
  },
});
```

### Fix 4: Use Database Transactions ✅

**File**: `src/app/api/distributors/scrape-from-url/route.ts`

```typescript
// Wrap the entire operation in a transaction
const result = await prisma.$transaction(async (tx) => {
  // Create CrawlJob
  const crawlJob = await tx.crawlJob.create({ /* ... */ });
  
  // ... do scraping (outside transaction) ...
  
  // Update CrawlJob (inside transaction)
  await tx.crawlJob.update({ /* ... */ });
  
  return { crawlJob, products, equipment };
}, {
  maxWait: 10000, // 10 seconds
  timeout: 300000, // 5 minutes
});
```

### Fix 5: Add Job Lock ✅

**File**: `src/app/api/distributors/scrape-from-url/route.ts`

```typescript
// Add a lock field to prevent cleanup during active scraping
const crawlJob = await prisma.crawlJob.create({
  data: {
    type: scrapeProducts ? "full" : "distributor",
    status: "running",
    targetUrl: url,
    distributorId: distributorId || null,
    startedAt: new Date(),
    metadata: JSON.stringify({ locked: true }), // Lock flag
  },
});
```

**Cleanup script checks lock**:
```typescript
const stuckJobs = await prisma.crawlJob.findMany({
  where: {
    status: "running",
    startedAt: { lt: thirtyMinutesAgo },
    metadata: {
      not: { contains: '"locked":true' }, // Skip locked jobs
    },
  },
});
```

## Recommended Implementation Priority

### HIGH PRIORITY (Implement Immediately)

1. ✅ **Already Done**: Check if CrawlJob exists before update (prevents crash)
2. **TODO**: Increase cleanup threshold from 5min → 30min
3. **TODO**: Don't delete orphaned jobs <1 hour old

### MEDIUM PRIORITY (Implement Soon)

4. **TODO**: Add heartbeat updates every 60s
5. **TODO**: Add lock mechanism to prevent cleanup

### LOW PRIORITY (Future Enhancement)

6. Add proper job queue (Bull, BullMQ, or similar)
7. Use Redis for distributed locks
8. Implement job retry logic
9. Add job monitoring dashboard

## Files to Update

### 1. fix-stuck-scrapes.ts

```typescript
// Change threshold
-const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
+const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

// Don't delete recent orphans
const orphanedJobs = await prisma.crawlJob.findMany({
  where: {
    distributorId: null,
+   createdAt: { lt: new Date(Date.now() - 60 * 60 * 1000) }, // 1 hour
  },
});
```

### 2. src/app/api/distributors/scrape-from-url/route.ts

```typescript
// Add heartbeat
+const heartbeat = setInterval(async () => {
+  if (crawlJobId) {
+    try {
+      await prisma.crawlJob.update({
+        where: { id: crawlJobId },
+        data: { startedAt: new Date() },
+      });
+    } catch (error) {
+      clearInterval(heartbeat);
+    }
+  }
+}, 60000);

try {
  // ... existing scraping logic ...
} finally {
+  clearInterval(heartbeat);
}
```

### 3. src/app/api/cron/scrape-distributors/route.ts

Apply the same heartbeat pattern.

## Testing Plan

1. **Test stuck job cleanup**:
   ```bash
   # Create a test job
   # Wait 6 minutes
   # Run cleanup script
   # Verify threshold works
   ```

2. **Test concurrent scraping**:
   ```bash
   # Start 3 scrapes simultaneously
   # Run cleanup during scrapes
   # Verify none fail
   ```

3. **Test orphan cleanup**:
   ```bash
   # Create distributor, start scrape
   # Delete distributor during scrape
   # Verify job completes without error
   # Verify old orphans get cleaned up
   ```

## Current State

- ✅ Crash prevented (check before update)
- ❌ Race condition still exists (cleanup too aggressive)
- ❌ Orphaned jobs deleted too quickly
- ❌ No heartbeat mechanism
- ❌ No job lock mechanism

## Next Steps

1. Update `fix-stuck-scrapes.ts` with 30min threshold
2. Add heartbeat to scraping routes
3. Test on Renewable Outdoors
4. Monitor for errors
5. Implement job lock if issues persist

