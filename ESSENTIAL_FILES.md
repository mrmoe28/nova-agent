# Essential Files for App to Run

## ✅ REQUIRED (Cannot Delete)

### Core Configuration
- `package.json` - Dependencies and scripts
- `package-lock.json` - Locked dependency versions
- `tsconfig.json` - TypeScript configuration
- `next.config.ts` - Next.js configuration
- `postcss.config.mjs` - PostCSS configuration
- `eslint.config.mjs` - ESLint configuration (optional but recommended)
- `components.json` - Shadcn UI configuration

### Database
- `prisma/schema.prisma` - Database schema (REQUIRED)

### Source Code
- `src/` - All application code (REQUIRED)
  - `src/app/` - Next.js pages and API routes
  - `src/components/` - React components
  - `src/lib/` - Utility functions and services
  - `src/types/` - TypeScript type definitions

### Public Assets
- `public/` - Static files (images, SVGs)

### Environment
- `.env` or `.env.local` - Environment variables (create if missing)

---

## ❌ NOT NEEDED (Can Delete)

### Documentation Files (60+ .md files)
All these can be deleted - they're just documentation:
- `*.md` files in root (AGENTS.md, CONTEXT.md, README.md, etc.)
- `docs/` folder - Documentation only

### Test Files
- `tests/` - Test files (not needed for production)
- `test-results/` - Test output
- `playwright-report/` - Test reports
- `playwright.config.ts` - Test configuration

### Scripts (Optional)
- `scripts/` - Utility scripts (not needed at runtime)
- `server/` - Python OCR service (optional, can use external service)

### Build/Cache Files (Auto-generated)
- `node_modules/` - Can be regenerated with `npm install`
- `.next/` - Build output (auto-generated)
- `.prisma-cache/` - Prisma cache (auto-generated)
- `*.log` files - Log files
- `.dev-server.pid` - Dev server PID file

### Backup Files
- `*.backup` files
- `*.backup2`, `*.backup3` files

### Duplicate Project Folders
- `nova-agent/` - Appears to be a duplicate
- `nova-agent_cloned/` - Duplicate
- `nova-agent-repo-new/` - Duplicate
- Keep only `nova-agent-main/`

### Utility Scripts
- `paste.ps1`, `paste.sh`, `paste-screenshot.ps1` - Not needed for app

---

## 📊 Summary

**Essential:** ~50-100 files (src/, prisma/, config files)
**Not Essential:** 200+ files (docs, tests, scripts, duplicates)

**Minimum to run:**
1. `package.json` + `package-lock.json`
2. `prisma/schema.prisma`
3. `src/` folder
4. `public/` folder
5. Config files (next.config.ts, tsconfig.json, etc.)
6. `.env` file

Everything else can be deleted or regenerated.

