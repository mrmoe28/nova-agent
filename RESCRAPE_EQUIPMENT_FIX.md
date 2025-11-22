# Rescrape Equipment Issue - Fix Summary

## Problem
When rescraping a URL, the system was only showing previously scraped equipment items and not detecting new products that were added to the website.

## Root Cause
The deduplication logic was too narrow - it only checked for existing equipment by `sourceUrl`. This caused several issues:

1. **Products without sourceUrls**: If products were scraped from listing pages without individual product URLs, they wouldn't have `sourceUrl` values. These products were always treated as new, even if they matched existing products by name/model.

2. **Changed sourceUrls**: If a product's URL changed (e.g., due to URL structure changes on the website), it would be treated as a completely new product, creating duplicates.

3. **Missing fallback matching**: There was no fallback mechanism to match products by name + modelNumber or name + manufacturer when sourceUrl wasn't available or didn't match.

## Solution Implemented

### 1. Enhanced Deduplication Logic
The deduplication now uses a multi-strategy approach:

**Strategy 1: Match by sourceUrl (most reliable)**
- If a product has a `sourceUrl`, check if any existing equipment has the same `sourceUrl`
- This is the most accurate way to identify duplicates

**Strategy 2: Match by name + modelNumber**
- For products without `sourceUrl` or when sourceUrl doesn't match
- Normalizes names and modelNumbers (lowercase, trimmed) for comparison
- Creates composite keys like `"product-name::model-123"` for fast lookup

**Strategy 3: Match by name + manufacturer (fallback)**
- If name + modelNumber doesn't match, try name + manufacturer
- Useful when modelNumber isn't available but manufacturer is

### 2. Cache Clearing on Rescrape
- Added automatic cache clearing when rescraping an existing distributor
- Ensures fresh product data is fetched instead of using stale cached data
- Prevents old cached product information from being returned

### 3. Enhanced Logging
Added detailed logging to track:
- How many products were found vs saved
- How many are new vs existing (updated)
- Sample of new products being created
- Sample of existing products being updated
- Matching strategy used (sourceUrl, name+model, or name+manufacturer)

## Code Changes

### File: `src/app/api/distributors/scrape-from-url/route.ts`

**Before:**
```typescript
// Only checked by sourceUrl
const existingBySourceUrl = await prisma.equipment.findMany({
  where: {
    distributorId: distributor.id,
    sourceUrl: { in: sourceUrls },
  },
});

for (const product of validProducts) {
  const existing = product.sourceUrl
    ? existingMap.get(product.sourceUrl)
    : null;
  // ...
}
```

**After:**
```typescript
// Get ALL existing equipment and create multiple lookup maps
const allExistingEquipment = await prisma.equipment.findMany({
  where: { distributorId: distributor.id },
});

// Create lookup maps for fast matching
const sourceUrlMap = new Map<string, Equipment>();
const nameModelMap = new Map<string, Equipment>();
const nameManufacturerMap = new Map<string, Equipment>();

// Index by multiple strategies
for (const eq of allExistingEquipment) {
  if (eq.sourceUrl) sourceUrlMap.set(eq.sourceUrl, eq);
  // Index by name+model and name+manufacturer...
}

// Match using multiple strategies
for (const product of validProducts) {
  let existing = null;
  
  // Strategy 1: sourceUrl
  if (product.sourceUrl) {
    existing = sourceUrlMap.get(product.sourceUrl);
  }
  
  // Strategy 2: name + modelNumber
  if (!existing && product.name && product.modelNumber) {
    const key = `${normalizedName}::${normalizedModel}`;
    existing = nameModelMap.get(key);
  }
  
  // Strategy 3: name + manufacturer
  if (!existing && product.name && product.manufacturer) {
    const key = `${normalizedName}::${normalizedManufacturer}`;
    existing = nameManufacturerMap.get(key);
  }
  
  // ...
}
```

## Testing Recommendations

1. **Test with products that have sourceUrls**: Verify that products with URLs are properly matched
2. **Test with products without sourceUrls**: Verify that products from listing pages are matched by name+model
3. **Test with new products**: Verify that truly new products are created (not matched to existing ones)
4. **Test rescraping**: Verify that rescraping detects new products added to the website
5. **Check logs**: Review the detailed logs to see which matching strategy was used for each product

## Expected Behavior After Fix

- ✅ New products added to the website will be detected and created
- ✅ Existing products will be updated (not duplicated) even if they don't have sourceUrls
- ✅ Products with changed URLs will be matched by name+model instead of creating duplicates
- ✅ Cache is cleared on rescrape to ensure fresh data
- ✅ Detailed logs show exactly what's happening with each product

## Related Files
- `src/app/api/distributors/scrape-from-url/route.ts` - Main scraping route with deduplication logic
- `src/lib/cache.ts` - Cache implementation with clearAllCaches() function
- `src/lib/scraper.ts` - Product scraping functions

