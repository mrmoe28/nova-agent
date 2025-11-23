# Vercel Deployment Guide

## ✅ TypeScript Errors Fixed

All TypeScript compilation errors have been resolved:
- Fixed nullable `job.startedAt` in diagnostic scripts
- All scripts now compile successfully
- Ready for production deployment

## 🚀 Deploy to Vercel

### Prerequisites

1. **Install Vercel CLI** (if not already installed):
```bash
npm i -g vercel
```

2. **Login to Vercel**:
```bash
vercel login
```

3. **Link Project** (first time only):
```bash
vercel link
```

### Deploy Commands

#### Preview Deployment (Test)
```bash
vercel
```

#### Production Deployment
```bash
vercel --prod
```

## 📊 Monitor Deployment

### Option 1: Use Monitoring Script
```bash
npx tsx monitor-vercel-deployment.ts
```

This script will:
- Show latest deployment status
- Check if deployment is ready
- Test homepage and API health
- Show production URL

### Option 2: Vercel CLI Commands

```bash
# List recent deployments
vercel ls

# Inspect specific deployment
vercel inspect <deployment-url>

# View logs
vercel logs <deployment-url>

# View logs for production
vercel logs --prod
```

### Option 3: Vercel Dashboard

Visit: https://vercel.com/dashboard

## 🔧 Environment Variables

Make sure these are set in Vercel Dashboard:

### Required
- `DATABASE_URL` - Neon PostgreSQL connection string
- `CRON_SECRET` - Secret for cron job authentication

### Optional (for advanced features)
- `ANTHROPIC_API_KEY` - For AI-powered scraping
- `BROWSER_WS_ENDPOINT` - For browser-based scraping
- `BROWSERLESS_TOKEN` - Browserless.io token

### Set via CLI
```bash
# Add environment variable
vercel env add DATABASE_URL production

# List environment variables
vercel env ls

# Remove environment variable
vercel env rm DATABASE_URL production
```

## 🏗️ Build Configuration

Your `vercel.json` is already configured:

```json
{
  "framework": "nextjs",
  "buildCommand": "prisma generate && next build",
  "installCommand": "npm install",
  "regions": ["iad1"],
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 60
    }
  },
  "crons": [
    {
      "path": "/api/cron/scrape-distributors",
      "schedule": "0 2 * * *"
    }
  ]
}
```

## ✅ Pre-Deployment Checklist

- [x] TypeScript errors fixed
- [x] Database migrations applied
- [x] Environment variables configured
- [x] Scraping race conditions resolved
- [x] CrawlJob heartbeat implemented
- [ ] Test locally with `npm run build`
- [ ] Deploy to preview: `vercel`
- [ ] Test preview deployment
- [ ] Deploy to production: `vercel --prod`
- [ ] Monitor production deployment

## 🧪 Test Deployment

After deploying, test these endpoints:

```bash
# Replace <your-domain> with your Vercel URL

# 1. Homepage
curl https://<your-domain>

# 2. API Health
curl https://<your-domain>/api/monitoring/status

# 3. Test Scraper (GET)
curl "https://<your-domain>/api/scrape?url=https://renewableoutdoors.com"

# 4. Check Equipment Count
curl https://<your-domain>/api/equipment
```

## 📈 Monitor Production

### Check Scraping Status
```bash
# SSH into your production database
psql $DATABASE_URL

# Check recent crawl jobs
SELECT id, type, status, "targetUrl", "startedAt", "completedAt"
FROM "CrawlJob"
ORDER BY "createdAt" DESC
LIMIT 10;

# Check equipment count
SELECT COUNT(*) FROM "Equipment";

# Check by distributor
SELECT d.name, COUNT(e.id) as product_count
FROM "Distributor" d
LEFT JOIN "Equipment" e ON d.id = e."distributorId"
GROUP BY d.id, d.name
ORDER BY product_count DESC;
```

### Check Logs
```bash
# Real-time logs
vercel logs --follow

# Last 100 lines
vercel logs -n 100

# Filter by function
vercel logs --prod | grep "scrape-api"
```

### Check Cron Jobs
```bash
# View cron job logs
vercel logs --prod | grep "cron"

# Test cron endpoint manually
curl -X GET https://<your-domain>/api/cron/scrape-distributors \
  -H "Authorization: Bearer $CRON_SECRET"
```

## 🐛 Troubleshooting

### Build Fails

**Error**: `prisma generate` fails
```bash
# Ensure DATABASE_URL is set
vercel env add DATABASE_URL production

# Redeploy
vercel --prod --force
```

**Error**: TypeScript compilation fails
```bash
# Test locally first
npm run build

# Check for errors
npm run lint
```

### Runtime Errors

**Error**: Database connection fails
```bash
# Check DATABASE_URL format
# Should be: postgresql://user:pass@host/db?sslmode=require

# Test connection locally
npx prisma db push
```

**Error**: Scraping times out
```bash
# Check maxDuration in vercel.json (currently 60s)
# Increase if needed (requires Pro plan for >60s)
```

**Error**: CrawlJob update fails
```bash
# Already fixed with:
# - 30min cleanup threshold
# - Heartbeat mechanism
# - Existence checks

# Run cleanup script to fix stuck jobs
npx tsx fix-stuck-scrapes.ts
```

## 📊 Performance Metrics

After deployment, monitor:

1. **Build Time**: Should be <5 minutes
2. **Function Duration**: Scraping should complete in <60s (preview) or <5min (cron)
3. **Database Queries**: Check slow queries in Neon dashboard
4. **Error Rate**: Should be <1% on production

## 🎯 Post-Deployment Tasks

1. **Test Renewable Outdoors Scraper**:
```bash
curl -X POST https://<your-domain>/api/distributors/scrape-from-url \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://renewableoutdoors.com",
    "saveToDatabase": true,
    "scrapeProducts": true,
    "maxProducts": 10
  }'
```

2. **Verify Equipment Saved**:
```bash
curl https://<your-domain>/api/equipment
```

3. **Check Crawl Jobs**:
```bash
# Use the diagnostic script
npx tsx check-scraping-status.ts
```

4. **Monitor for 24 hours**:
   - Check Vercel dashboard
   - Check error logs
   - Check database for new products
   - Check cron job runs at 2 AM UTC

## 🔄 Continuous Deployment

Changes pushed to `master` branch automatically trigger Vercel deployments.

**Current Status**: All recent changes pushed to GitHub ✅

**Recent Commits**:
1. Fixed Shopify product URL detection
2. Added diagnostic and cleanup tools
3. Fixed CrawlJob race conditions
4. Added heartbeat mechanism
5. Fixed TypeScript compilation errors

**All ready for deployment!** 🚀

## Quick Deployment

```bash
# Test build locally
npm run build

# Deploy to preview
vercel

# If preview looks good, promote to production
vercel --prod

# Monitor
npx tsx monitor-vercel-deployment.ts
```

Your application is ready for production deployment!



