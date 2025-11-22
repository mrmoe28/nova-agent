# Deployment Troubleshooting Guide

## 🚨 Recent Deployment Errors Detected

Based on your Vercel deployment history, there are several failed deployments. Here's a comprehensive troubleshooting guide to resolve common issues.

## 🔍 Common Deployment Issues & Solutions

### 1. Database Connection Issues

**Error**: `PrismaClientInitializationError` or database connection timeouts

**Solution**:
```bash
# Check if DATABASE_URL is set correctly
vercel env ls

# If missing, add it:
vercel env add DATABASE_URL production
# Enter your PostgreSQL connection string

# Pull environment variables locally
vercel env pull .env.local

# Test database connection
npx prisma db push
```

### 2. Missing Environment Variables

**Error**: Application crashes on startup or missing functionality

**Required Variables**:
```bash
# Essential (REQUIRED)
DATABASE_URL=postgresql://user:password@host/database

# Optional but recommended
NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
ANTHROPIC_API_KEY=sk-ant-xxx  # For AI scraping features
BROWSERLESS_TOKEN=xxx         # For browser scraping features
```

**Add missing variables**:
```bash
# Add each missing variable
vercel env add NEXT_PUBLIC_BASE_URL production
vercel env add ANTHROPIC_API_KEY production
vercel env add BROWSERLESS_TOKEN production

# Redeploy after adding variables
git commit --allow-empty -m "Trigger redeploy"
git push
```

### 3. Build Errors

**Error**: TypeScript compilation failures or dependency issues

**Solution**:
```bash
# Test build locally first
npm run build

# If successful locally but failing on Vercel:
# Clear Vercel cache and redeploy
vercel --prod --force

# Update dependencies if needed
npm update
npm audit fix
```

### 4. Function Timeout Issues

**Error**: Vercel function timeouts (10-60s limits)

**Problem**: The new scraping functionality might timeout on Vercel's function limits.

**Solution**: Update `vercel.json`:
```json
{
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "src/app/api/distributors/discover/route.ts": {
      "maxDuration": 60
    },
    "src/app/api/distributors/bulk-import/route.ts": {
      "maxDuration": 300
    },
    "src/app/api/distributors/scrape-from-url/route.ts": {
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

### 5. Memory Issues

**Error**: Out of memory errors during scraping

**Solution**: Add memory limits to `vercel.json`:
```json
{
  "functions": {
    "src/app/api/distributors/**": {
      "memory": 1024
    }
  }
}
```

### 6. Import/Export Issues

**Error**: Module resolution failures or dynamic imports

**Common fixes**:
- Ensure all imports use proper file extensions
- Check for circular dependencies
- Verify dynamic imports are properly handled

### 7. Sharp Image Processing Issues

**Error**: Sharp library compilation failures

**Solution**: Force Sharp installation:
```bash
npm install sharp --platform=linux --arch=x64
git add package-lock.json
git commit -m "Fix Sharp for Linux deployment"
git push
```

## 🛠️ Quick Fix Commands

### Immediate Actions
```bash
# 1. Update Vercel CLI
npm install -g vercel@latest

# 2. Check deployment status
vercel ls

# 3. Pull latest environment variables
vercel env pull .env.local

# 4. Test build locally
npm run build

# 5. Force redeploy if needed
vercel --prod --force
```

### Environment Variable Setup
```bash
# Check what's currently set
vercel env ls

# Required variables for full functionality:
vercel env add DATABASE_URL production
vercel env add NEXT_PUBLIC_BASE_URL production

# Optional but recommended:
vercel env add ANTHROPIC_API_KEY production
vercel env add BROWSERLESS_TOKEN production
vercel env add LOG_LEVEL production
```

## 📊 Deployment Checklist

### Before Deploying
- [ ] Local build passes: `npm run build`
- [ ] Database connection works: `npx prisma db push`
- [ ] Environment variables are set
- [ ] No TypeScript errors
- [ ] All dependencies are up to date

### After Failed Deployment
- [ ] Check Vercel dashboard for specific error
- [ ] Review build logs in Vercel dashboard
- [ ] Test specific API endpoints locally
- [ ] Verify environment variables are set
- [ ] Check function timeout limits

## 🚀 Optimized vercel.json Configuration

Create/update your `vercel.json`:
```json
{
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "src/app/api/distributors/discover/route.ts": {
      "maxDuration": 60,
      "memory": 1024
    },
    "src/app/api/distributors/bulk-import/route.ts": {
      "maxDuration": 300,
      "memory": 1024
    },
    "src/app/api/distributors/scrape-from-url/route.ts": {
      "maxDuration": 60,
      "memory": 512
    },
    "src/app/api/cron/scrape-distributors/route.ts": {
      "maxDuration": 300,
      "memory": 1024
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

## 🔧 Database Setup for Production

### Neon Database (Recommended)
```bash
# 1. Create Neon database at https://neon.tech
# 2. Copy connection string
# 3. Add to Vercel:
vercel env add DATABASE_URL production
# Paste: postgresql://user:password@host/database

# 4. Run migrations:
npx prisma migrate deploy
```

### Alternative: Vercel Postgres
```bash
# 1. Go to Vercel dashboard > Storage > Create Database
# 2. Select "Vercel Postgres"
# 3. Database will be auto-configured
# 4. Run migrations:
npx prisma migrate deploy
```

## 🐛 Debugging Failed Deployments

### Get Specific Error Information
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project: `novaagent`
3. Click on the failed deployment
4. Review the "Build Logs" and "Function Logs"

### Common Error Patterns
- **Build fails**: Usually TypeScript or dependency issues
- **Function timeout**: Scraping operations taking too long
- **Memory errors**: Large file processing or memory leaks
- **Database errors**: Missing DATABASE_URL or connection issues
- **Module errors**: Import/export or dependency resolution

### Local Testing Commands
```bash
# Test everything works locally
npm run build && npm start

# Test specific API endpoints
curl http://localhost:3000/api/distributors
curl http://localhost:3000/api/equipment

# Test database connection
npx prisma studio
```

## 🎯 Next Steps

1. **Check specific errors** in Vercel dashboard
2. **Update vercel.json** with the optimized configuration above
3. **Set required environment variables**
4. **Test deployment** with a simple change:
   ```bash
   git commit --allow-empty -m "Test deployment"
   git push
   ```

## 📞 If Issues Persist

If you continue experiencing deployment errors:

1. Share the specific error message from Vercel dashboard
2. Check which environment variables are missing
3. Verify database connection string format
4. Consider temporarily disabling scraping features to isolate issues

The new scraping functionality is complex and may require proper environment setup for external services (Anthropic AI, Browserless). Start with basic functionality and gradually enable advanced features.
