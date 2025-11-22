# 🏢 Distributor Setup Guide

## Issue: Empty Distributor Dropdown

If you see an empty distributor dropdown in the System Sizing page, it means there are no distributors in your database yet.

---

## ✅ Quick Fix

Run this command to seed sample distributors:

```bash
npm run seed:distributors
```

This will create 4 sample distributors:
- SolarPro Supply
- Green Energy Wholesale
- Battery & Solar Direct  
- Renewable Equipment Co

---

## 🔍 Check Current Distributors

To see what distributors are in your database:

```bash
npm run check:distributors
```

---

## 📊 What Happened

### Root Cause
The database was empty of distributors, causing the dropdown to show "Select a distributor for pricing" but have no options to select.

### Solution
1. Created `seed-distributors.js` - Seeds sample distributors (without websites)
2. Created `check-distributors.js` - Checks distributor status
3. Created `fix-distributor-websites.js` - Removes invalid placeholder URLs
4. Added npm scripts for easy access
5. Seeded 4 sample distributors to the database

**Important:** Sample distributors have `website: null` to prevent scraping errors. When you add real distributors, provide actual website URLs.

---

## 🔧 Manual Setup Options

### Option 1: Use the Bulk Import Feature (Recommended)
1. Navigate to Distributors page
2. Click "Bulk Import"
3. Upload distributor data

### Option 2: Add Manually Through UI
1. Go to Distributors page
2. Click "Add Distributor"
3. Fill in details and save

### Option 3: Use Seed Scripts (Quick)
```bash
npm run seed:distributors
```

---

## 📁 Files Added

```
seed-distributors.js       - Seeds sample distributors
check-distributors.js      - Checks distributor count
```

**Package.json scripts:**
```json
{
  "seed:distributors": "node seed-distributors.js",
  "check:distributors": "node check-distributors.js"
}
```

---

## 🎯 For Production

**Important:** The sample distributors are for development/testing only.

For production:
1. **Remove** sample distributors
2. **Import** real distributor data
3. **Update** with actual contact information
4. **Add equipment** to each distributor

```bash
# To remove sample data (use with caution)
# You would need to delete them through the UI or database
```

---

## 🧪 Testing

After seeding distributors:

1. **Refresh the sizing page**
2. **Click the distributor dropdown**
3. **You should now see 4 options:**
   - SolarPro Supply (0 products)
   - Green Energy Wholesale (0 products)
   - Battery & Solar Direct (0 products)
   - Renewable Equipment Co (0 products)

Note: "(0 products)" means no equipment is assigned yet. You'll need to add equipment to each distributor for full functionality.

---

## 🚀 Next Steps

1. ✅ Seed distributors (completed)
2. ⏳ Add equipment to distributors
3. ⏳ Configure distributor preferences
4. ⏳ Test BOM generation with distributor pricing

---

## 📝 Common Issues

### "No distributors found"
**Solution:** Run `npm run seed:distributors`

### "Distributors exist but dropdown still empty"
**Solution:** 
1. Check browser console for errors
2. Verify API is running: `curl http://localhost:3000/api/distributors`
3. Refresh the page
4. Check if distributors are marked as `isActive: true`

### "Rescrape failing with HTTP 404 errors"
**Problem:** Distributors have placeholder `example.com` URLs that don't exist  
**Solution:** Run `npm run fix:distributor-websites` to remove invalid URLs

This sets `website: null` for distributors with placeholder URLs. The scraper will skip them automatically.

### "Created distributors but need to remove them"
**Solution:** Use the Distributors page UI to delete, or use Prisma Studio:
```bash
npx prisma studio
```

---

*Issue resolved: Empty distributor dropdown*  
*Solution: Seeded sample distributors*

