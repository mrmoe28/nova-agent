# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**NovaAgent** is an AI Energy Planner for Solar & Battery Systems. It helps solar professionals analyze power bills, design solar + battery systems, generate bills of materials (BOM) with pricing, perform NEC compliance checks, and create professional PDF reports.

**Production URL**: https://novaagent-kappa.vercel.app
**GitHub**: https://github.com/mrmoe28/nova-agent.git
**Database**: PostgreSQL (Neon) with Prisma ORM

## Core Development Commands

```bash
# Development
npm run dev              # Start dev server with Turbopack
npm run build            # Production build
npm start                # Production server
npm run lint             # ESLint
npm test                 # Run Playwright tests
npm test -- --headed     # Run tests in headed mode
npm test -- --ui         # Run tests in UI mode

# Database (Prisma)
npx prisma studio        # Database GUI
npx prisma generate      # Generate Prisma client
npx prisma migrate dev   # Create migration
npx prisma db push       # Push schema to DB (no migration)

# Type checking
npx tsc --noEmit         # Type check without emit

# Vercel deployment
vercel                   # Deploy preview
vercel --prod            # Deploy production
vercel env pull .env.local  # Pull environment variables
vercel logs              # View deployment logs
```

## Architecture Overview

### Technology Stack
- **Framework**: Next.js 15 (App Router) + TypeScript
- **UI**: React 19 + TailwindCSS v4 + shadcn/ui
- **Database**: PostgreSQL (Neon) with Prisma ORM
- **PDF**: pdfkit for report generation
- **OCR**: pdf-parse (PDFs) + tesseract.js (images, disabled in serverless)
- **Web Scraping**: Cheerio (HTTP) + BrowserQL/Browserless (JavaScript rendering)
- **Forms**: react-hook-form + zod validation
- **Logging**: pino + pino-pretty

### Project Workflow (Multi-Step Wizard)

The application follows a linear wizard flow:

1. **Client Intake** (`/wizard/new`) → Create project with client info
2. **Bill Upload** (`/wizard/[projectId]/intake`) → Upload and OCR power bills
3. **System Sizing** (`/wizard/[projectId]/sizing`) → Configure solar/battery system
4. **BOM Generation** (`/wizard/[projectId]/bom`) → Auto-generate equipment list
5. **Review & PDF** (`/wizard/[projectId]/review`) → Generate final PDF report

Each step updates the `Project.status` field: `intake` → `analysis` → `sizing` → `bom` → `plan` → `review` → `complete`

### Database Schema Architecture

**Core Solar Energy Planning Models**:
- `Project` - Main entity (client info, status tracking)
- `Bill` - Uploaded power bills with OCR data (PDF/image/CSV)
- `Analysis` - Usage analysis results (kWh, costs, recommendations)
- `System` - Solar/battery system design (panels, inverters, batteries)
- `BOMItem` - Bill of materials line items with pricing
- `Plan` - Installation plan with NEC compliance checks

**Distributor & Equipment Catalog**:
- `Distributor` - Supplier information (scraped from websites)
- `Equipment` - Product catalog (solar panels, batteries, inverters)
- `ScrapeHistory` - Web scraping job tracking
- `CrawlJob` - Deep crawl job status

**Key Relationships**:
- One `Project` has many `Bills`, `BOMItems`
- One `Project` has one `Analysis`, `System`, `Plan`
- One `Distributor` has many `Equipment` items

### API Endpoints Structure

**Project Management**:
- `POST /api/projects` - Create project
- `GET /api/projects` - List all projects
- `GET /api/projects/[id]` - Get project details
- `PATCH /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Delete project

**Bill Processing Pipeline**:
- `POST /api/upload` - Upload bill file (saves to `/tmp`, runs OCR immediately)
- `POST /api/ocr` - Process single bill with OCR
- `GET /api/ocr?projectId=X` - Batch process all bills for project
- `POST /api/analyze` - Analyze bills → create `Analysis` record

**System Design**:
- `POST /api/size` - Calculate solar/battery sizing → create `System` record
- `POST /api/bom` - Generate bill of materials → create `BOMItem` records
- `POST /api/plan` - Create installation plan with NEC checks → create `Plan` record
- `POST /api/pdf` - Generate and download PDF report

**Distributor & Equipment**:
- `POST /api/distributors` - Create distributor
- `GET /api/distributors` - List distributors
- `POST /api/distributors/scrape-from-url` - Scrape distributor website
- `POST /api/cron/scrape-distributors` - Scheduled scraping job
- `GET /api/equipment` - List equipment catalog

### Web Scraping Architecture

**Three-Mode Scraping System**:

1. **HTTP Scraper** (`src/lib/scraper.ts`):
   - Fast, uses Cheerio for HTML parsing
   - Rotates User-Agent strings to avoid blocks
   - Respects robots.txt and rate limits
   - **Cannot** extract JavaScript-rendered images
   - Used by default for speed

2. **Browser Scraper** (`src/lib/browser-scraper-bql.ts`):
   - Uses BrowserQL (Browserless GraphQL API)
   - Executes real Chrome browser in cloud
   - Scrolls pages to trigger lazy loading
   - **Extracts** JavaScript-rendered images from live DOM
   - Slower but more accurate
   - Requires `BROWSERLESS_TOKEN` env var

3. **🤖 AI Agent Scraper** (`src/lib/ai-agent-scraper.ts`):
   - **NEW**: Intelligent scraping with reasoning and self-correction
   - Uses Claude AI to analyze page structure
   - Makes strategic decisions (browser vs HTTP, deep crawl vs direct scrape)
   - Self-corrects when scraping fails (up to 3 attempts)
   - Automatically detects product links from any page structure
   - Handles pagination, tabs, and lazy loading intelligently
   - Requires `ANTHROPIC_API_KEY` env var

**When to Use Each Mode**:
- **HTTP Mode** (default): Simple HTML pages, fast results
- **Browser Mode** (`useBrowser: true`): JS-heavy sites, bot detection, images
- **AI Agent Mode** (`useAI: true`): Complex sites, unknown structure, self-correcting

**AI Agent Scraper Features**:
1. **Page Analysis**: Claude analyzes HTML and identifies page type (product/category/listing)
2. **Strategy Decision**: Chooses optimal scraping method based on page structure
3. **Self-Correction Loop**: If scraping fails, diagnoses issue and tries alternative approach
4. **Intelligent Product Discovery**: Finds products on ANY website structure
5. **Fallback Safety**: Falls back to traditional scraping if AI fails

**Example API Requests**:
```bash
# Traditional HTTP scraping (fast, simple)
curl -X POST /api/distributors/scrape-from-url \
  -d '{"url":"https://example.com/products", "useBrowser":false}'

# Browser scraping (for JS-rendered images)
curl -X POST /api/distributors/scrape-from-url \
  -d '{"url":"https://example.com/products", "useBrowser":true}'

# AI Agent scraping (intelligent, self-correcting)
curl -X POST /api/distributors/scrape-from-url \
  -d '{"url":"https://example.com/products", "useAI":true}'
```

**Scraping Best Practices**:
- Always check `robots.txt` before scraping
- Use rate limiting (min 300ms between requests)
- Rotate User-Agent headers
- Log all scraping operations with pino
- Store scraped data with timestamps
- Use AI mode for unknown/complex websites

### OCR Text Extraction

**File Upload Flow** (`/api/upload`):
1. Save file to `/tmp/uploads/{projectId}/` (ephemeral in serverless)
2. Immediately run OCR while file exists in `/tmp`
3. Extract text using pdf-parse (PDF) or tesseract.js (images)
4. Parse extracted text with regex patterns
5. Store `ocrText` and `extractedData` JSON in database
6. File deleted after serverless function completes

**OCR Support**:
- ✅ **PDF files** - Works in production (pdf-parse)
- ⚠️ **Image files** - Disabled in Vercel serverless (tesseract.js needs canvas/DOMMatrix)
- ✅ **CSV files** - Direct text parsing

**Data Extraction Patterns**:
- kWh usage: `total\s*(?:usage|consumption|kwh)[:\s]*(\d+(?:,\d+)?(?:\.\d+)?)\s*kWh`
- kW demand: `(?:peak|maximum|max)\s*demand[:\s]*(\d+(?:\.\d+)?)\s*kW`
- Total cost: `(?:total\s*amount|amount\s*due)[:\s]*\$?\s*(\d+(?:,\d+)?(?:\.\d+)?)`
- Account number, billing period, utility company name

### PDF Report Generation

**Report Contents** (`src/lib/pdf-generator.ts`):
- Client information and project details
- Usage analysis with monthly breakdown
- System design specifications (solar, battery, inverter)
- Complete bill of materials with pricing
- NEC compliance checklist (690.8, 690.12, 690.13, 705.12, 706)
- Installation steps and timeline
- Labor hour estimates

**Branding**:
- Deep Navy (#0A0F1C) and Electric Cyan (#22D3EE)
- Lightning bolt logo at `/public/novaagent-logo.svg`
- NovaAgent ⚡ branding throughout

## Environment Variables & Configuration

### Centralized Configuration System

All configurable values are managed through `src/lib/config.ts`, which provides environment variable overrides with sensible defaults. This allows deployment-specific configuration without code changes.

**Configuration Categories**:
1. **System Sizing** - Solar/battery calculation parameters
2. **Web Scraping** - Rate limits, timeouts, retry strategies
3. **Browser Automation** - Viewport, scroll timing, endpoint URLs
4. **AI Agent** - Claude model, tokens, analysis parameters
5. **File Upload** - Size limits, allowed file types
6. **OCR** - Confidence thresholds, validation limits
7. **Caching** - Timeout durations
8. **API Routes** - Function execution limits

### Required Environment Variables

```bash
# Database (REQUIRED)
DATABASE_URL="postgresql://user:password@host/database"
```

### Optional Environment Variables

```bash
# Web Scraping
BROWSERLESS_TOKEN=""        # For BrowserQL scraper (product images)
BROWSERLESS_ENDPOINT=""     # Custom Browserless instance URL
ANTHROPIC_API_KEY=""        # For AI Agent scraper (intelligent scraping)

# Cron Jobs
CRON_SECRET=""              # Secret for scheduled scraping

# Logging
LOG_LEVEL="info"            # info | debug | warn | error

# System Sizing Defaults
SOLAR_SIZING_FACTOR="1.2"        # Solar oversizing (120%)
PEAK_SUN_HOURS="4"               # Average peak sun hours
SOLAR_PANEL_WATTAGE="400"        # Standard panel wattage
SOLAR_COST_PER_WATT="2.5"        # Cost per watt ($)
BATTERY_COST_PER_KWH="800"       # Cost per kWh ($)
INVERTER_COST_PER_KW="1200"      # Cost per kW ($)
INSTALLATION_BASE_COST="5000"    # Base installation cost ($)

# Scraper Configuration
SCRAPER_RATE_LIMIT="1000"        # Rate limit (ms)
SCRAPER_TIMEOUT="30000"          # Request timeout (ms)
SCRAPER_MAX_RETRIES="3"          # Max retry attempts
SCRAPER_BASE_DELAY="1000"        # Backoff base delay (ms)
SCRAPER_MAX_DELAY="10000"        # Backoff max delay (ms)

# Browser Configuration
BROWSER_WIDTH="1920"             # Viewport width
BROWSER_HEIGHT="1080"            # Viewport height
BROWSER_NAV_TIMEOUT="30000"      # Navigation timeout (ms)
BROWSER_MAX_SCROLLS="10"         # Max scroll attempts
BROWSER_SCROLL_INTERVAL="1500"   # Scroll interval (ms)

# AI Configuration
CLAUDE_MODEL="claude-3-5-sonnet-20241022"  # Claude model ID
CLAUDE_MAX_TOKENS="2000"                   # Max response tokens
AI_MAX_ATTEMPTS="3"                        # Self-correction attempts
AI_MAX_LINK_SAMPLES="50"                   # Links to analyze
```

### Configuration Usage

All configuration is accessed through `src/lib/config.ts`:

```typescript
import { SYSTEM_SIZING, SCRAPER_CONFIG, AI_CONFIG } from '@/lib/config'

// Use in your code
const solarKw = (dailyKwh / SYSTEM_SIZING.PEAK_SUN_HOURS) * SYSTEM_SIZING.SOLAR_SIZING_FACTOR
const html = await fetchHTML(url, { timeout: SCRAPER_CONFIG.DEFAULT_TIMEOUT })
const response = await anthropic.messages.create({ model: AI_CONFIG.MODEL })
```

### Environment Setup

```bash
# Copy template with all configuration options
cp .env.example .env.local

# Pull from Vercel (production values)
vercel env pull .env.local

# Push to Vercel (update production)
vercel env push .env.local
```

**See `.env.example` for complete configuration documentation.**

## File Upload Important Notes

⚠️ **Serverless Limitations**:
- Files uploaded to `/tmp/uploads/{projectId}/`
- `/tmp` is ephemeral - deleted after function execution
- OCR must happen immediately during upload
- For persistent storage, use Vercel Blob or AWS S3

⚠️ **Image OCR in Production**:
- Tesseract.js disabled (needs canvas/DOMMatrix)
- PDF files recommended for best results
- Users see warning toast when OCR falls back to demo data

## Development Workflow

### Adding New Features

1. **Research First**: Check web best practices before implementing
2. **Update CONTEXT.md**: Document decisions and architecture
3. **Create Migration**: `npx prisma migrate dev --name feature_name`
4. **Implement API**: Create route in `src/app/api/`
5. **Build UI**: Use shadcn/ui components
6. **Test**: Run `npm run lint` and `npm run build`
7. **Commit**: Use Conventional Commits format
8. **Deploy**: Push to trigger Vercel deployment

### Testing Locally

```bash
# Start dev server
npm run dev

# In another terminal, run Prisma Studio
npx prisma studio

# Check logs with pino-pretty
# Logs automatically formatted in development
```

### Common Development Tasks

**Adding shadcn/ui Component**:
```bash
npx shadcn@latest add button
npx shadcn@latest add card
```

**Database Changes**:
```bash
# 1. Edit prisma/schema.prisma
# 2. Create migration
npx prisma migrate dev --name add_new_field
# 3. Generate client
npx prisma generate
```

**Debugging OCR**:
```bash
# Check if file was saved
ls -la /tmp/uploads/

# Check OCR extraction
# Look for ocrText in database via Prisma Studio
```

**Debugging Scraper**:
```bash
# Enable debug logging
export LOG_LEVEL=debug
npm run dev

# Check logs for scraping operations
# Look for: 'Starting scrape-products', 'imageUrl extracted'
```

## Deployment

**Vercel Configuration**:
- Framework: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Node Version: 20.x

**Environment Variables**: Set in Vercel Dashboard
- `DATABASE_URL` - Neon PostgreSQL connection string
- `BROWSERLESS_TOKEN` - Optional, for browser scraping
- `ANTHROPIC_API_KEY` - Optional, for AI Agent scraping
- `CRON_SECRET` - Optional, for scheduled jobs

**Deployment Triggers**:
- Push to `main` branch → Production deployment
- Push to other branches → Preview deployment

## Known Issues & Limitations

### File Storage
- Files uploaded to `/tmp` are ephemeral (serverless limitation)
- OCR processing happens immediately during upload
- For production scale, implement Vercel Blob Storage

### Image OCR
- Tesseract.js disabled in Vercel serverless (canvas/DOMMatrix unavailable)
- PDF files work perfectly
- Users see warning toast when images fall back to demo data

### Web Scraping
- Some sites block scraping → use browser mode
- Browser mode slower but extracts images
- Respect robots.txt and rate limits

### Product Images
- Re-scrape distributors with browser mode enabled to populate images
- Default scraper (HTTP) doesn't extract JS-rendered images
- Browser scraper extracts images from live DOM

## Error Fix Reference

### Database Migration Errors (October 2025)

**Issue:** Production 500 errors due to missing database columns (`BOMItem.imageUrl`)

**Root Cause:**
- Migrations created but not applied to production database
- Failed migration blocking new migrations from being applied

**Prevention:**
1. **Before Every Deployment:**
   ```bash
   # Check migration status
   npx prisma migrate status

   # Apply pending migrations
   DATABASE_URL=<prod-url> npx prisma migrate deploy
   ```

2. **Handle Failed Migrations:**
   ```bash
   # If migration already applied to DB
   npx prisma migrate resolve --applied <migration-name>

   # If migration needs to be rolled back
   npx prisma migrate resolve --rolled-back <migration-name>
   ```

3. **Never Add to Build Script:**
   - ❌ Don't add `prisma migrate deploy` to Vercel build script
   - ✅ Run migrations manually before deploying code changes
   - **Reason:** Race conditions and build failures

**See:** `DATABASE_MIGRATION_500_ERROR_FIX.md` for complete details

---

See CONTEXT.md for detailed error fixes and solutions from past debugging sessions.

## Additional Notes

- Always update CONTEXT.md with significant changes
- Run `npm run lint` before committing
- Use toast notifications (sonner) instead of alert()
- Follow Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`
- Browser mode checkbox defaults to checked for re-scraping
