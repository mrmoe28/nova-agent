# 🔍 Deployment Monitor Agent - Setup Guide

## Overview

The Deployment Monitor Agent continuously watches your Vercel deployments for errors and automatically generates detailed error reports with fix suggestions for collaborative resolution with Gemini.

---

## 🚀 Quick Start

### 1. Get Your Vercel Token

1. Go to https://vercel.com/account/tokens
2. Create a new token with name: "Deployment Monitor"
3. Copy the token

### 2. Set Environment Variables

**Windows PowerShell:**
```powershell
$env:VERCEL_TOKEN="your_vercel_token_here"
```

**Windows Command Prompt:**
```cmd
set VERCEL_TOKEN=your_vercel_token_here
```

**Linux/Mac:**
```bash
export VERCEL_TOKEN="your_vercel_token_here"
```

**Add to `.env.local`** (recommended):
```bash
# Vercel Monitoring
VERCEL_TOKEN=your_vercel_token_here
VERCEL_PROJECT_ID=your_project_id  # Optional
VERCEL_TEAM_ID=your_team_id        # Optional
```

### 3. Run the Monitor

```bash
# Start monitoring
node deployment-monitor.js

# Or run in background
node deployment-monitor.js &

# Windows background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "node deployment-monitor.js" -WindowStyle Minimized
```

---

## 📊 How It Works

### Monitoring Flow

```
┌─────────────────────────────────────────────────┐
│  1. Poll Vercel API every 30s                   │
│  2. Check latest deployment status              │
│  3. If ERROR detected:                          │
│     ├─ Fetch build logs                         │
│     ├─ Analyze error patterns                   │
│     ├─ Generate fix suggestions                 │
│     └─ Create DEPLOYMENT_ERRORS.md              │
│  4. Alert user and log details                  │
└─────────────────────────────────────────────────┘
```

### Error Detection

The agent monitors for:
- ❌ Build failures
- ❌ TypeScript errors
- ❌ Module not found
- ❌ Webpack issues
- ❌ Environment variable problems
- ❌ Prisma client errors
- ❌ Native module conflicts

### Auto-Generated Reports

When an error is detected, the agent creates:
1. **DEPLOYMENT_ERRORS.md** - Human-readable report
2. **deployment-logs/error-*.json** - Detailed JSON log

---

## 🤖 Gemini Collaboration Protocol

### Automated Workflow

When deployment fails:

```
┌──────────────────────────────────────────────────┐
│  DEPLOYMENT ERROR DETECTED                       │
└──────────────┬───────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────┐
│  1. Monitor Agent Creates Error Report           │
│     - DEPLOYMENT_ERRORS.md generated             │
│     - Error patterns identified                  │
│     - Fix suggestions provided                   │
└──────────────┬───────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────┐
│  2. User Reviews Report                          │
│     - Check DEPLOYMENT_ERRORS.md                 │
│     - Share with Gemini                          │
└──────────────┬───────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────┐
│  3. Gemini Analyzes & Implements Fixes           │
│     - Reads error details                        │
│     - Applies suggested fixes                    │
│     - Makes code changes                         │
└──────────────┬───────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────┐
│  4. Claude Validates & Integrates                │
│     - Runs local build test                      │
│     - Checks TypeScript                          │
│     - Commits changes                            │
│     - Pushes to trigger new deployment           │
└──────────────┬───────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────┐
│  5. Monitor Checks New Deployment                │
│     - Verifies success                           │
│     - Or repeats cycle if still failing          │
└──────────────────────────────────────────────────┘
```

---

## 📝 Error Report Format

### Example Output (DEPLOYMENT_ERRORS.md)

```markdown
# 🚨 Vercel Deployment Error Report

**Deployment ID:** dpl_abc123xyz
**Status:** ERROR
**Error Type:** Build Failed

---

## ❌ Error Details

### Build Errors

1. ```
   Module not found: Can't resolve 'canvas'
   ```

### Suggested Fixes

#### 1. Native Module in Serverless Environment [CRITICAL]

**Fix:** Add package to serverExternalPackages in next.config.ts

**Files to check:** next.config.ts

---

## 📝 Action Items for Gemini

1. Review the error messages above
2. Check the suggested fixes
3. Run local build test: `npm run build`
4. Apply fixes to relevant files
5. Commit and push changes
6. Monitor next deployment
```

---

## 🎯 Features

### Intelligent Error Analysis

- **Pattern Matching** - Identifies common error types
- **Context Extraction** - Pulls relevant log sections
- **Priority Assignment** - Ranks fixes by importance
- **File Identification** - Points to files needing changes

### Fix Suggestions Include

- Specific commands to run
- Files to modify
- Environment variables needed
- Configuration changes
- Verification steps

### Common Errors Handled

| Error Type | Detection | Suggested Fix |
|------------|-----------|---------------|
| Module not found | `Cannot find module` | `npm install <package>` |
| TypeScript errors | `Type error` | Run `tsc --noEmit` |
| Native modules | `canvas`, `sharp` | Add to `serverExternalPackages` |
| Webpack issues | `webpack` errors | Check `next.config.ts` |
| Env variables | `Environment variable` | Set in Vercel dashboard |
| Prisma errors | Prisma failures | Add `prisma generate` to build |

---

## 🔧 Configuration Options

### Environment Variables

```bash
# Required
VERCEL_TOKEN=your_token_here

# Optional - for filtering specific project
VERCEL_PROJECT_ID=prj_abc123

# Optional - for team projects
VERCEL_TEAM_ID=team_abc123
```

### Customization

Edit `deployment-monitor.js`:

```javascript
const CONFIG = {
  POLL_INTERVAL: 30000,  // Check every 30 seconds
  LOG_DIR: './deployment-logs',
  ERROR_REPORT_FILE: './DEPLOYMENT_ERRORS.md',
};
```

---

## 📁 Output Files

### DEPLOYMENT_ERRORS.md
- Human-readable error report
- Fix suggestions and action items
- Links to Vercel dashboard
- Updated on each error

### deployment-logs/
```
deployment-logs/
├── error-dpl_abc123-1700000000000.json
├── error-dpl_xyz789-1700000001000.json
└── ...
```

Each JSON file contains:
- Full deployment details
- Complete error analysis
- Structured fix suggestions
- Timestamps and metadata

---

## 🚨 Troubleshooting

### Agent Not Starting

**Issue:** `VERCEL_TOKEN not set`  
**Fix:** Set environment variable as shown in Quick Start

### No Deployments Found

**Issue:** Can't find your project  
**Fix:** Set `VERCEL_PROJECT_ID` to filter specific project

### API Rate Limiting

**Issue:** Too many requests  
**Fix:** Increase `POLL_INTERVAL` (e.g., 60000 for 1 minute)

### Missing Permissions

**Issue:** Token doesn't have access  
**Fix:** Regenerate token with proper scopes

---

## 💡 Best Practices

### 1. Keep Monitor Running
```bash
# Use a terminal multiplexer or run in background
node deployment-monitor.js &
```

### 2. Review Reports Immediately
- Check `DEPLOYMENT_ERRORS.md` when alerted
- Share relevant sections with Gemini

### 3. Test Locally First
```bash
# Always test before pushing
npm run build
```

### 4. Commit Error Reports
```bash
# Track error history
git add deployment-logs/
git commit -m "docs: deployment error log"
```

### 5. Update Monitor
- Pull latest changes regularly
- Monitor for new error patterns
- Suggest improvements

---

## 🔗 Integration with Workflow

### With Git Hooks

Create `.git/hooks/pre-push`:
```bash
#!/bin/bash
echo "Running build check before push..."
npm run build
if [ $? -ne 0 ]; then
    echo "Build failed! Fix errors before pushing."
    exit 1
fi
```

### With CI/CD

The monitor complements CI/CD by:
- Catching errors CI might miss
- Providing detailed context
- Generating actionable reports
- Tracking deployment history

---

## 📈 Monitoring Dashboard Integration

The monitor works with the system monitoring dashboard:
- View deployment status at `/monitoring`
- See real-time build health
- Track error trends
- Monitor fix success rate

---

## 🤝 Collaboration Tips

### For Claude (Integration)
1. Validate all Gemini changes locally
2. Run `npm run build` before committing
3. Check `DEPLOYMENT_ERRORS.md` for patterns
4. Update monitor if new error types appear

### For Gemini (Development)
1. Check `DEPLOYMENT_ERRORS.md` when notified
2. Follow suggested fix order (priority)
3. Test changes locally
4. Request validation from Claude

### For User
1. Keep monitor running during active development
2. Review error reports when alerted
3. Share reports with both AIs
4. Track deployment success rate

---

## 🎯 Success Metrics

Track these to measure effectiveness:
- Time to detect deployment error
- Time to fix and redeploy
- Number of fix iterations needed
- Error pattern identification accuracy
- Suggestion relevance rate

---

## 📚 Additional Resources

- [Vercel API Documentation](https://vercel.com/docs/rest-api)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Error Handling Guide](./TROUBLESHOOTING.md)
- [Monitoring Dashboard](./MONITORING_STATUS.md)

---

*Deployment Monitor Agent v1.0*  
*Part of Nova Agent Parallel Development System*

