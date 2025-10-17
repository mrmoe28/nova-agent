# NovaAgent Project Context

## Current State

NovaAgent is a fully functional Next.js 14 production-ready web application for solar energy planning and system design. The application has been scaffolded and implemented with all core features working.

## Project Overview

**NovaAgent** is an AI Energy Planner for Solar & Battery Systems that helps solar professionals:
- Analyze power bills and usage patterns
- Design solar + battery storage systems
- Generate bills of materials (BOM) with pricing
- Perform NEC compliance checks
- Create professional PDF reports

## Technology Stack

- **Framework**: Next.js 15 with App Router + TypeScript
- **Styling**: TailwindCSS v4 + shadcn/ui components
- **Database**: PostgreSQL (Neon) with Prisma ORM
- **PDF Generation**: pdfkit
- **OCR**: pdf-parse (PDF text extraction) + tesseract.js (image OCR)
- **Forms**: react-hook-form + zod validation
- **UI Components**: shadcn/ui (button, card, input, label, select, textarea)

## Architecture

### Database Schema
- **Project**: Main entity (client info, status tracking)
- **Bill**: Power bill uploads (PDF/image/CSV)
- **Analysis**: Usage analysis results
- **System**: Solar/battery system design specs
- **BOMItem**: Bill of materials line items
- **Plan**: Installation plan with NEC checks

### API Endpoints
- `POST /api/projects` - Create new project
- `GET /api/projects` - List all projects
- `GET /api/projects/[id]` - Get project details
- `PATCH /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Delete project
- `POST /api/upload` - Upload bill files (PDF/image/CSV)
- `POST /api/ocr` - Process single bill with OCR
- `GET /api/ocr?projectId=X` - Batch process all bills for project
- `POST /api/analyze` - Analyze bills and generate usage data (uses OCR data when available)
- `POST /api/size` - Calculate system sizing
- `POST /api/bom` - Generate bill of materials
- `POST /api/plan` - Create installation plan with NEC checks
- `POST /api/pdf` - Generate and download PDF report

### UI Pages
- `/` - Landing page with hero/dashboard
- `/wizard/new` - Create new project (client intake form)
- `/wizard/[projectId]/intake` - Bill upload page (demo mode available)
- `/wizard/[projectId]/sizing` - System sizing configuration
- `/wizard/[projectId]/bom` - Bill of materials review
- `/wizard/[projectId]/review` - Final review and PDF generation
- `/projects` - Projects list page

## Key Features Implemented

### 1. Project Wizard Flow
Multi-step wizard guiding users through:
1. Client intake (name, address, contact info)
2. Bill upload with OCR processing (real file upload required - no demo mode)
3. System sizing (backup duration, critical loads)
4. BOM generation (automated equipment list)
5. Review and PDF generation

### 2. System Sizing Engine
Calculates based on:
- Monthly usage patterns
- Backup duration requirements
- Critical load specifications
- Standard solar panels (400W)
- Battery storage (lithium default)
- Inverter capacity

### 3. NEC Compliance Checks
Automated checks for:
- NEC 690.8 (Circuit Sizing)
- NEC 690.12 (Rapid Shutdown)
- NEC 690.13 (Disconnecting Means)
- NEC 705.12 (Point of Connection)
- NEC 706 (Energy Storage Systems)

### 4. OCR Text Extraction
Automatic extraction of bill data using:
- **PDF text extraction** via pdf-parse for digital PDFs
- **Image OCR** via tesseract.js for scanned bills/photos
- **CSV parsing** for spreadsheet bills
- Smart regex patterns to extract:
  - kWh usage and kW demand
  - Total costs and energy charges
  - Account numbers and billing periods
  - Utility company names
  - Average daily usage calculations

### 5. PDF Report Generation
Professional branded PDFs include:
- Client information
- Usage analysis
- System design specifications
- Complete bill of materials
- NEC compliance checklist
- Installation plan and timeline

## Branding

- **Name**: NovaAgent ⚡
- **Tagline**: AI Energy Planner for Solar & Battery Systems
- **Colors**:
  - Deep Navy: #0A0F1C
  - Electric Cyan: #22D3EE
  - Accent Cyan: #6EE7F9
  - White: #FFFFFF
- **Logo**: SVG lightning bolt icon at `/public/novaagent-logo.svg`

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Database operations
npx prisma migrate dev
npx prisma generate
npx prisma studio
```

## Current Status

**Status**: ✅ Fully Functional & Deployed

- **GitHub**: https://github.com/mrmoe28/nova-agent.git
- **Production**: https://novaagent-kappa.vercel.app
- **Database**: Neon PostgreSQL (serverless)
- **Dev Server**: http://localhost:3002

All core features implemented and tested:
- ✅ Database schema and migrations (PostgreSQL)
- ✅ Production database on Neon with persistent storage
- ✅ All API endpoints working (including OCR processing)
- ✅ Complete wizard UI flow
- ✅ **Real file upload** with drag-and-drop (PDF/image/CSV)
- ✅ **OCR text extraction** from bills (pdf-parse + tesseract.js)
- ✅ **Bill data parsing** with smart regex patterns
- ✅ Analysis using OCR data with demo fallback
- ✅ PDF generation with NovaAgent branding
- ✅ Projects list and management
- ✅ ESLint passing
- ✅ Build passing
- ✅ Deployed to Vercel
- ✅ Code pushed to GitHub

## Next Steps

Potential enhancements:
1. Add user authentication (login/signup)
2. Integrate real equipment pricing APIs
3. Add project export/import functionality
4. Implement email delivery of PDF reports
5. Add analytics dashboard
6. Mobile-responsive improvements
7. Add unit and integration tests
8. Enhance OCR accuracy with more utility company patterns
9. Add bill comparison visualization

## Known Issues

- Build has font-related warnings (works fine in dev mode)
- Equipment pricing is mocked data
- OCR accuracy depends on bill format clarity
- **File storage uses /tmp directory in serverless**: Files are ephemeral and deleted after processing (consider Vercel Blob Storage for persistent storage)
- **Image OCR disabled in production**: Tesseract.js requires canvas/DOMMatrix APIs not available in Vercel serverless - PDF files recommended for best results

### Recent Fixes (2025-10-17)

#### Image Upload UX Improvements
**Problem**: Users were unaware when image OCR failed in production, leading to confusion about demo data fallbacks.

**Root Cause**:
1. Tesseract.js OCR disabled in serverless (requires canvas/DOMMatrix APIs)
2. FileUpload component ignored API warnings
3. No visual feedback about OCR processing status
4. Users uploaded images thinking they'd be processed correctly

**Solution Implemented**:
1. ✅ Added Sonner toast notifications for upload feedback
2. ✅ Display warnings when OCR fails and fallback data is used
3. ✅ Visual indicators showing OCR status (green checkmark) and fallback data (amber warning icon)
4. ✅ Added prominent messaging recommending PDF files for best accuracy
5. ✅ Enhanced error handling with descriptive toast messages

**Files Modified**:
- `src/app/layout.tsx` - Added Sonner Toaster component
- `src/components/FileUpload.tsx` - Complete UX overhaul with toast notifications and status indicators
- `src/components/ui/sonner.tsx` - Installed shadcn/ui Sonner component

**Result**: Users now have clear visibility into upload status and are guided toward using PDF files for optimal OCR results.

#### Product Image Extraction Fix
**Problem**: All 126 equipment items showing placeholder icons instead of product images.

**Root Cause**:
1. Products scraped with `useBrowser=false` (default) which can't extract JS-rendered images
2. Browser scraper with sophisticated image extraction exists but wasn't used
3. All equipment `imageUrl` fields are `null` in database

**Solution Implemented**:
1. ✅ Changed `useBrowser` default from `false` to `true` on distributor detail page
2. ✅ Updated checkbox label to "Browser Mode (extracts product images, slower but more accurate)"
3. ✅ Browser mode now pre-checked by default for re-scraping

**Files Modified**:
- `src/app/distributors/[id]/page.tsx` - Default browser mode to true, update label

**How to Get Product Images**:
1. Visit any distributor detail page: `/distributors/[id]`
2. Ensure "Browser Mode" checkbox is checked (now default)
3. Click "Rescrape" button
4. Wait for browser scraping to complete (slower but extracts images)
5. Product images will populate in equipment catalog

**Result**: Users can now re-scrape distributors to extract product images using the browser-based scraper with live DOM inspection.

## Notes for Future Development

- **No demo mode**: Real bill uploads with OCR extraction required
- OCR processing is triggered when user clicks "Process Bills & Continue"
- Analysis fails if no OCR data extracted (requires valid bill uploads)
- Extracted bill data includes: kWh usage, kW demand, costs, billing period, account info
- All monetary values in USD
- System sizing uses conservative estimates (1.2x safety factors)
- PDF save path: Browser download (not server-side save)
- Database: Neon PostgreSQL (serverless/production-ready)
- **File uploads stored in `/tmp/uploads/{projectId}/`** (serverless environment)
  - Files in `/tmp` are ephemeral and deleted after function execution
  - OCR processing should happen immediately after upload
  - For production scale, consider Vercel Blob Storage or AWS S3

## OCR Implementation Details

### Libraries Used
- **pdf-parse**: Fast, native PDF text extraction for digital PDFs (works in serverless)
- **tesseract.js**: JavaScript OCR for scanned images - **DISABLED in production serverless environments** due to canvas/DOMMatrix dependency issues

### Serverless Considerations
- **Production (Vercel)**: Image OCR disabled - Tesseract.js requires browser DOM APIs (DOMMatrix, canvas) not available in Node.js serverless
- **Local Development**: Full OCR support for all file types
- **Recommended**: Use PDF bills in production for best results
- **Fix Applied**: Dynamic import with environment detection to prevent crashes

### Supported File Types
- PDF (text-based and scanned)
- Images (JPG, JPEG, PNG)
- CSV (direct text parsing)

### Data Extraction Patterns
Regex patterns extract:
- Energy usage: `(\d+(?:,\d+)?)\s*kWh` with total usage variants
- Demand: `(?:peak\s*)?demand[:\s]*(\d+(?:\.\d+)?)\s*kW`
- Costs: Total amount, energy charges, demand charges
- Billing info: Period dates, account numbers
- Utility companies: PG&E, Duke Energy, SCE, Con Edison, etc.

### API Flow
1. Upload bill → `/api/upload` (saves file, creates DB record)
2. Process OCR → `/api/ocr` POST (extracts text, parses data, updates DB)
3. Analyze → `/api/analyze` (aggregates OCR data from all bills, calculates metrics)

### Database Schema
```prisma
model Bill {
  ocrText       String?  // Raw extracted text
  extractedData String?  // JSON string of ParsedBillData
}
```
