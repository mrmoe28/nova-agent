#!/usr/bin/env node

/**
 * Vercel Deployment Monitor Agent
 * 
 * This agent monitors Vercel deployments for errors and creates
 * detailed error reports for collaborative fixing with Gemini.
 * 
 * Features:
 * - Polls Vercel API for deployment status
 * - Detects build failures and errors
 * - Generates error reports with context
 * - Creates actionable fix suggestions
 * - Logs all issues for tracking
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  VERCEL_TOKEN: process.env.VERCEL_TOKEN || '',
  VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID || '',
  VERCEL_TEAM_ID: process.env.VERCEL_TEAM_ID || '',
  POLL_INTERVAL: 30000, // 30 seconds
  LOG_DIR: './deployment-logs',
  ERROR_REPORT_FILE: './DEPLOYMENT_ERRORS.md',
};

// Ensure log directory exists
if (!fs.existsSync(CONFIG.LOG_DIR)) {
  fs.mkdirSync(CONFIG.LOG_DIR, { recursive: true });
}

/**
 * Makes an HTTPS request to the Vercel API
 */
function vercelApiRequest(endpoint, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.vercel.com',
      path: endpoint,
      method: method,
      headers: {
        'Authorization': `Bearer ${CONFIG.VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Fetches the latest deployments
 */
async function getLatestDeployments(limit = 5) {
  try {
    let endpoint = `/v6/deployments?limit=${limit}`;
    
    if (CONFIG.VERCEL_PROJECT_ID) {
      endpoint += `&projectId=${CONFIG.VERCEL_PROJECT_ID}`;
    }
    if (CONFIG.VERCEL_TEAM_ID) {
      endpoint += `&teamId=${CONFIG.VERCEL_TEAM_ID}`;
    }

    const response = await vercelApiRequest(endpoint);
    return response.deployments || [];
  } catch (error) {
    console.error('Error fetching deployments:', error.message);
    return [];
  }
}

/**
 * Fetches build logs for a deployment
 */
async function getBuildLogs(deploymentId) {
  try {
    let endpoint = `/v1/deployments/${deploymentId}/events`;
    if (CONFIG.VERCEL_TEAM_ID) {
      endpoint += `?teamId=${CONFIG.VERCEL_TEAM_ID}`;
    }

    const response = await vercelApiRequest(endpoint);
    return response;
  } catch (error) {
    console.error('Error fetching build logs:', error.message);
    return null;
  }
}

/**
 * Analyzes deployment errors and extracts key information
 */
function analyzeError(deployment, logs) {
  const analysis = {
    deploymentId: deployment.uid,
    url: deployment.url,
    state: deployment.state,
    createdAt: new Date(deployment.createdAt).toLocaleString(),
    commit: deployment.meta?.githubCommitSha || 'N/A',
    branch: deployment.meta?.githubCommitRef || 'N/A',
    errorType: 'Unknown',
    errorMessages: [],
    buildErrors: [],
    suggestions: [],
  };

  // Determine error type from state
  if (deployment.state === 'ERROR') {
    analysis.errorType = 'Build Failed';
  } else if (deployment.state === 'CANCELED') {
    analysis.errorType = 'Build Canceled';
  } else if (deployment.readyState === 'ERROR') {
    analysis.errorType = 'Runtime Error';
  }

  // Extract error messages from logs
  if (logs && Array.isArray(logs)) {
    logs.forEach(log => {
      if (log.type === 'stderr' || log.type === 'error') {
        analysis.errorMessages.push(log.payload?.text || log.text || 'Unknown error');
      }
      
      // Look for build errors
      const text = log.payload?.text || log.text || '';
      if (text.includes('Failed to compile') || 
          text.includes('Module not found') ||
          text.includes('Type error') ||
          text.includes('Cannot find module')) {
        analysis.buildErrors.push(text);
      }
    });
  }

  // Generate fix suggestions based on error type
  analysis.suggestions = generateFixSuggestions(analysis);

  return analysis;
}

/**
 * Generates fix suggestions based on error analysis
 */
function generateFixSuggestions(analysis) {
  const suggestions = [];

  // Module not found errors
  if (analysis.buildErrors.some(e => e.includes('Module not found') || e.includes('Cannot find module'))) {
    suggestions.push({
      issue: 'Missing Module Dependencies',
      fix: 'Check package.json and run `npm install` or `npm install <missing-package>`',
      priority: 'HIGH',
      commands: ['npm install', 'npm run build'],
    });
  }

  // TypeScript errors
  if (analysis.buildErrors.some(e => e.includes('Type error'))) {
    suggestions.push({
      issue: 'TypeScript Type Errors',
      fix: 'Run `npx tsc --noEmit` locally to identify type issues',
      priority: 'HIGH',
      commands: ['npx tsc --noEmit', 'npm run build'],
    });
  }

  // Canvas/native module errors
  if (analysis.buildErrors.some(e => e.includes('canvas') || e.includes('sharp'))) {
    suggestions.push({
      issue: 'Native Module in Serverless Environment',
      fix: 'Add package to serverExternalPackages in next.config.ts',
      priority: 'CRITICAL',
      files: ['next.config.ts'],
    });
  }

  // Webpack errors
  if (analysis.buildErrors.some(e => e.includes('webpack'))) {
    suggestions.push({
      issue: 'Webpack Configuration Issue',
      fix: 'Check webpack config in next.config.ts',
      priority: 'HIGH',
      files: ['next.config.ts'],
    });
  }

  // Environment variable errors
  if (analysis.buildErrors.some(e => e.includes('Environment variable') || e.includes('DATABASE_URL'))) {
    suggestions.push({
      issue: 'Missing Environment Variables',
      fix: 'Add required environment variables in Vercel dashboard',
      priority: 'CRITICAL',
      action: 'Configure in Vercel: Settings > Environment Variables',
    });
  }

  // Prisma errors
  if (analysis.buildErrors.some(e => e.includes('Prisma') || e.includes('prisma'))) {
    suggestions.push({
      issue: 'Prisma Client Generation',
      fix: 'Ensure `prisma generate` runs in build script',
      priority: 'HIGH',
      files: ['package.json'],
      check: 'build script should include "prisma generate"',
    });
  }

  return suggestions;
}

/**
 * Creates a detailed error report
 */
function createErrorReport(analysis) {
  const timestamp = new Date().toISOString();
  const reportContent = `
# 🚨 Vercel Deployment Error Report

**Generated:** ${timestamp}  
**Deployment ID:** ${analysis.deploymentId}  
**URL:** https://${analysis.url}  
**Status:** ${analysis.state}  

---

## 📊 Deployment Info

- **Created:** ${analysis.createdAt}
- **Commit:** ${analysis.commit}
- **Branch:** ${analysis.branch}
- **Error Type:** ${analysis.errorType}

---

## ❌ Error Details

### Build Errors

${analysis.buildErrors.length > 0 
  ? analysis.buildErrors.map((err, idx) => `${idx + 1}. \`\`\`\n${err.trim()}\n\`\`\``).join('\n\n')
  : '*No specific build errors captured*'}

### Error Messages

${analysis.errorMessages.length > 0
  ? analysis.errorMessages.map((msg, idx) => `${idx + 1}. ${msg}`).join('\n')
  : '*No error messages captured*'}

---

## 🔧 Suggested Fixes

${analysis.suggestions.length > 0
  ? analysis.suggestions.map((s, idx) => `
### ${idx + 1}. ${s.issue} [${s.priority}]

**Fix:** ${s.fix}

${s.commands ? `**Commands:**\n\`\`\`bash\n${s.commands.join('\n')}\n\`\`\`` : ''}
${s.files ? `**Files to check:** ${s.files.join(', ')}` : ''}
${s.action ? `**Action:** ${s.action}` : ''}
${s.check ? `**Verify:** ${s.check}` : ''}
`).join('\n')
  : '*No specific suggestions generated*'}

---

## 📝 Action Items for Gemini

1. Review the error messages above
2. Check the suggested fixes
3. Run local build test: \`npm run build\`
4. Apply fixes to relevant files
5. Commit and push changes
6. Monitor next deployment

---

## 🔗 Useful Links

- [Vercel Deployment](https://vercel.com/deployments/${analysis.deploymentId})
- [View Logs](https://vercel.com/deployments/${analysis.deploymentId}/logs)
- [Project Dashboard](https://vercel.com/dashboard)

---

*Report generated by Deployment Monitor Agent*
`;

  // Write report to file
  fs.writeFileSync(CONFIG.ERROR_REPORT_FILE, reportContent.trim());
  
  // Also log to deployment logs directory
  const logFile = path.join(
    CONFIG.LOG_DIR,
    `error-${analysis.deploymentId}-${Date.now()}.json`
  );
  fs.writeFileSync(logFile, JSON.stringify(analysis, null, 2));

  return reportContent;
}

/**
 * Monitors deployments continuously
 */
let lastCheckedDeploymentId = null;
let isMonitoring = false;

async function monitorDeployments() {
  if (isMonitoring) {
    console.log('[MONITOR] Already checking, skipping...');
    return;
  }

  isMonitoring = true;
  console.log(`[${new Date().toLocaleTimeString()}] Checking Vercel deployments...`);

  try {
    const deployments = await getLatestDeployments(3);
    
    if (deployments.length === 0) {
      console.log('[MONITOR] No deployments found');
      isMonitoring = false;
      return;
    }

    const latestDeployment = deployments[0];
    
    // Skip if we've already checked this deployment
    if (latestDeployment.uid === lastCheckedDeploymentId) {
      console.log('[MONITOR] No new deployments');
      isMonitoring = false;
      return;
    }

    console.log(`[MONITOR] Latest deployment: ${latestDeployment.uid}`);
    console.log(`[MONITOR] State: ${latestDeployment.state}`);
    console.log(`[MONITOR] URL: https://${latestDeployment.url}`);

    // Check if deployment has errors
    if (latestDeployment.state === 'ERROR' || latestDeployment.readyState === 'ERROR') {
      console.log('⚠️  [ALERT] Deployment error detected!');
      
      // Fetch logs
      const logs = await getBuildLogs(latestDeployment.uid);
      
      // Analyze error
      const analysis = analyzeError(latestDeployment, logs);
      
      // Create report
      const report = createErrorReport(analysis);
      
      console.log('📝 [REPORT] Error report created:');
      console.log(CONFIG.ERROR_REPORT_FILE);
      console.log('\n--- ERROR SUMMARY ---');
      console.log(`Type: ${analysis.errorType}`);
      console.log(`Suggestions: ${analysis.suggestions.length}`);
      console.log(`Build Errors: ${analysis.buildErrors.length}`);
      console.log('--------------------\n');
      
      // Alert user
      console.log('🚨 ACTION REQUIRED: Review DEPLOYMENT_ERRORS.md for details');
    } else if (latestDeployment.state === 'READY') {
      console.log('✅ [SUCCESS] Deployment successful!');
    } else {
      console.log(`⏳ [PENDING] Deployment state: ${latestDeployment.state}`);
    }

    lastCheckedDeploymentId = latestDeployment.uid;
    
  } catch (error) {
    console.error('[ERROR]', error.message);
  }

  isMonitoring = false;
}

/**
 * Starts the monitoring agent
 */
function startMonitoring() {
  console.log('🔍 Vercel Deployment Monitor Agent Starting...\n');
  
  // Check configuration
  if (!CONFIG.VERCEL_TOKEN) {
    console.error('❌ ERROR: VERCEL_TOKEN not set');
    console.log('Please set VERCEL_TOKEN environment variable');
    console.log('Get your token from: https://vercel.com/account/tokens');
    process.exit(1);
  }

  console.log('✅ Configuration loaded');
  console.log(`📊 Poll interval: ${CONFIG.POLL_INTERVAL / 1000}s`);
  console.log(`📁 Log directory: ${CONFIG.LOG_DIR}`);
  console.log(`📝 Error reports: ${CONFIG.ERROR_REPORT_FILE}\n`);
  console.log('👁️  Monitoring started...\n');

  // Initial check
  monitorDeployments();

  // Set up polling
  setInterval(monitorDeployments, CONFIG.POLL_INTERVAL);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down monitoring agent...');
  process.exit(0);
});

// Start monitoring if run directly
if (require.main === module) {
  startMonitoring();
}

module.exports = { monitorDeployments, analyzeError, createErrorReport };


