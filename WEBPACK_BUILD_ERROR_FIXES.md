# WebPack Build Error Fixes

## Problem
TypeError: Cannot read properties of undefined (reading 'length') at WasmHash._updateWithBuffer during Vercel build process.

## Root Causes Identified
1. **Missing Prisma Generate in Build Script**: Build script didn't include `prisma generate` before `next build`
2. **Complex Next.js Configuration**: Over-configured image settings and file tracing causing WebPack conflicts
3. **WASM Module Processing**: `tesseract.js` uses WASM and webpack tries to process it during build, causing WasmHash errors
4. **Node.js Version Compatibility**: Node.js v22+ may have compatibility issues with webpack's WASM implementation
5. **Potential Package Compatibility Issues**: Latest Next.js 15.5.5 and React 19.1.0 with older packages

## Applied Fixes

### 1. Updated Build Script (package.json)
```json
"build": "prisma generate && next build"
```
**Reasoning**: Ensures Prisma client is generated before build, preventing database-related build errors.

### 2. Webpack Configuration for WASM Modules (next.config.ts) ✅ **PRIMARY FIX**
Added webpack configuration to properly handle WASM modules:

```typescript
webpack: (config, { isServer }) => {
  // Externalize tesseract.js and its WASM dependencies to prevent webpack from processing them
  if (isServer) {
    config.externals = config.externals || [];
    config.externals.push({
      'tesseract.js': 'commonjs tesseract.js',
    });
  }

  // Configure webpack to handle WASM files properly
  config.experiments = {
    ...config.experiments,
    asyncWebAssembly: true,
  };

  // Ignore WASM files during build analysis to prevent WasmHash errors
  config.module = config.module || {};
  config.module.rules = config.module.rules || [];
  config.module.rules.push({
    test: /\.wasm$/,
    type: 'asset/resource',
  });

  return config;
}
```

**Also added to serverExternalPackages**:
```typescript
serverExternalPackages: ['pdf-parse', 'pdfkit', 'tesseract.js']
```

**Reasoning**: 
- Externalizing `tesseract.js` prevents webpack from trying to bundle its WASM dependencies
- Configuring `asyncWebAssembly` enables proper WASM support
- Treating `.wasm` files as assets prevents webpack from processing them with WasmHash

### 3. Simplified Next.js Configuration (next.config.ts) 
**Removed**:
- Complex image device sizes and formats configuration
- `outputFileTracingRoot` path configuration  
- Detailed content security policies
- Multiple image optimization settings

**Kept Essential**:
- `serverExternalPackages: ['pdf-parse', 'pdfkit', 'tesseract.js']` for server components
- Basic remote image patterns for scraped content
- ESLint disable during builds
- SVG support
- Webpack WASM configuration (see above)

**Reasoning**: Complex configurations can cause WebPack bundling conflicts, especially with WASM modules.

### 4. Node.js Version Recommendations
**Recommended**: Use Node.js 18.x or 20.x (LTS versions)

**Why**: Node.js v22+ may have compatibility issues with webpack's WASM hash implementation. The error log shows Node.js v22.21.1, which may be causing the issue.

**Solutions**:
- **For Vercel**: Set Node.js version in project settings or add to `package.json`:
  ```json
  "engines": {
    "node": ">=18.0.0 <22.0.0"
  }
  ```
- **For Local Development**: Create `.nvmrc` file:
  ```
  20
  ```
  Then use: `nvm use` or `nvm install 20`

### 5. Problematic Dependencies to Watch
- `sharp` (v0.34.4) - Image processing with native binaries
- `puppeteer-core` (v24.25.0) - Browser automation with large binary dependencies
- `tesseract.js` (v6.0.1) - WASM-based OCR that can cause WebPack issues ✅ **NOW EXTERNALIZED**
- `unpdf` (v1.3.2) - PDF processing with potential binary conflicts

### 6. Environment Variable Issues
Ensure all required environment variables are properly set in Vercel:
- `DATABASE_URL`
- `CRON_SECRET`  
- Any API keys for scraping services

### 7. Vercel Configuration
Current vercel.json is simplified and should work. If issues persist, try removing function-specific configurations temporarily.

## Verification Steps
1. Test local build: `npm run build`
2. Check for dependency warnings during install
3. Verify Prisma generation works: `npx prisma generate`
4. Verify Node.js version: `node --version` (should be 18.x or 20.x)
5. Deploy to Vercel and monitor build logs

## If Error Persists After These Fixes
1. **Clear node_modules and reinstall**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
2. **Check for circular imports** in the codebase
3. **Increase build memory** (if on Vercel, check build settings)
4. **Split build command** (run prisma generate separately):
   ```json
   "build": "next build",
   "prebuild": "prisma generate"
   ```
5. **Try updating to more stable versions** of Next.js and React (if compatible)
6. **Use Vercel's edge runtime** for problematic functions (if applicable)

## Summary of Key Fixes
✅ **Externalized tesseract.js** - Prevents webpack from processing WASM
✅ **Configured webpack for WASM** - Proper handling of WASM modules
✅ **Added WASM file rule** - Treats .wasm files as assets
✅ **Node.js version** - Use 18.x or 20.x (LTS)
✅ **Build script** - Includes prisma generate
