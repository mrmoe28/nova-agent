# File Storage Issue & Solution

**Issue:** Uploaded bill PDFs return 404 errors when trying to view them

**Date:** October 20, 2025

---

## Problem

Users were unable to view uploaded bill documents. When clicking on uploaded bills, they would get a 404 error trying to access URLs like:

```
/tmp/uploads/cmgx9nhbz0000k304r6mobedb/1760851785514__Recent_Power_Usage7_-_Georgia_Power.pdf
```

---

## Root Cause

1. **Files stored in `/tmp`**: The upload route saves files to `/tmp/uploads/` directory
2. **Not publicly accessible**: `/tmp` is not served by Next.js or Vercel
3. **Ephemeral storage**: On Vercel's serverless platform, `/tmp` is cleared after function execution
4. **No serving route**: There was no API endpoint to retrieve and serve these files

### Why `/tmp`?

The code comment in `upload/route.ts` explains:
```typescript
// Use /tmp directory for serverless environment (Vercel)
// Note: Files in /tmp are ephemeral and will be deleted after function execution
```

This means files uploaded during one request may not be available in the next request!

---

## Solution Implemented

### 1. Created File Serving API Route ✅

**New endpoint:** `GET /api/files/bills/[billId]`

Located at: `src/app/api/files/[...path]/route.ts`

**How it works:**
- Takes a bill ID from the URL
- Looks up the bill in the database to get the file path
- Reads the file from `/tmp` if still available
- Serves it with proper content type headers
- Returns 410 Gone if file was cleared from `/tmp`

**Usage:**
```
https://novaagent-kappa.vercel.app/api/files/bills/cmgx9os3g0004k304dz7s0cbv
```

Instead of trying to access the file path directly, use the bill ID.

---

## Limitations

### ⚠️ **Important: Files in `/tmp` are temporary!**

On Vercel's serverless platform:
- Files are stored in `/tmp` during function execution
- `/tmp` storage is cleared between different function invocations
- Files may disappear after ~5-15 minutes
- This is NOT suitable for long-term storage

### What This Means:
- ✅ Files available immediately after upload
- ✅ OCR processing works (happens during upload)
- ❌ Files may disappear after serverless function completes
- ❌ Not reliable for viewing bills later
- ❌ Bills uploaded hours/days ago likely gone

---

## Recommended Long-Term Solution

For production use, replace `/tmp` storage with **persistent blob storage**:

### Option 1: Vercel Blob (Recommended) ⭐

**Pros:**
- Native Vercel integration
- Simple API
- CDN-backed
- Automatic scaling

**Setup:**
```bash
npm install @vercel/blob
```

**Update `src/app/api/upload/route.ts`:**
```typescript
import { put } from '@vercel/blob';

// Instead of saving to /tmp
const blob = await put(`bills/${projectId}/${fileName}`, buffer, {
  access: 'public',
  contentType: file.type,
});

// Save blob.url to database instead of filePath
const bill = await prisma.bill.create({
  data: {
    // ...
    filePath: blob.url, // This is now a public URL
  },
});
```

### Option 2: AWS S3

**Pros:**
- Industry standard
- Highly scalable
- Cost-effective

**Setup:**
```bash
npm install @aws-sdk/client-s3
```

### Option 3: Cloudflare R2

**Pros:**
- S3-compatible API
- No egress fees
- Great for large files

---

## Files Modified

1. **Created:** `src/app/api/files/[...path]/route.ts`
   - New API endpoint to serve bill files by ID
   - Handles PDF, image, and CSV files
   - Returns 410 Gone when files are cleared

2. **No changes needed to:**
   - `src/app/api/upload/route.ts` (still saves to `/tmp`)
   - Database schema (filePath still stores local path)

---

## Testing

### Test File Serving:

1. Upload a bill to a project
2. Get the bill ID from the response
3. Access via: `https://novaagent-kappa.vercel.app/api/files/bills/[BILL_ID]`

### Expected Behaviors:

**Immediately after upload:**
- ✅ File should display correctly
- ✅ PDF should open in browser
- ✅ Images should display

**After 10+ minutes:**
- ⚠️ File may return 410 Gone error
- ⚠️ Message: "File no longer available"
- ⚠️ Suggestion to re-upload

---

## Migration Path

### Phase 1: Current (Temporary Fix) ✅
- Use `/tmp` storage with file serving API
- Works for immediate viewing
- Not suitable for production long-term

### Phase 2: Add Blob Storage (Recommended)
1. Set up Vercel Blob or S3
2. Update upload route to save to blob storage
3. Update database to store blob URLs
4. Update file serving to redirect to blob URLs
5. Migrate existing files (or inform users to re-upload)

### Phase 3: Cleanup
1. Remove `/tmp` file handling
2. Remove local file serving route
3. Update documentation

---

## Environment Variables Needed (Phase 2)

For Vercel Blob:
```env
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

For AWS S3:
```env
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET_NAME=novaagent-bills
```

---

## Cost Considerations

### Current (`/tmp` storage):
- **Cost:** $0 (free)
- **Reliability:** Poor (ephemeral)
- **Scalability:** Limited

### Vercel Blob:
- **Cost:** ~$0.15/GB storage + $0.30/GB bandwidth
- **Free tier:** 500GB bandwidth/month
- **Reliability:** Excellent
- **Scalability:** Unlimited

### AWS S3:
- **Cost:** ~$0.023/GB storage + $0.09/GB bandwidth
- **Free tier:** 5GB storage, 20k GET requests
- **Reliability:** Excellent (99.999999999% durability)
- **Scalability:** Unlimited

---

## Immediate Action Items

1. ✅ **DONE:** Created file serving API route
2. ⏳ **TODO:** Test bill viewing after deployment
3. ⏳ **TODO:** Decide on blob storage provider
4. ⏳ **TODO:** Implement blob storage (Phase 2)
5. ⏳ **TODO:** Migrate existing bills or notify users

---

## For Users (Current Workaround)

If you see "File no longer available" errors:

1. **Bills disappear after ~10-15 minutes**
   - This is expected with current `/tmp` storage
   - Files are automatically cleared by the serverless platform

2. **Workaround:**
   - Re-upload your bills when needed
   - OCR data is preserved in the database (no need to re-process)
   - Only the file viewing is affected

3. **Coming Soon:**
   - Permanent file storage
   - Bills will remain accessible indefinitely
   - No need to re-upload

---

## Technical Details

### File Path Format:
```
/tmp/uploads/[projectId]/[timestamp]_[filename]
```

### Database Storage:
```typescript
{
  id: "cmgx9os3g0004k304dz7s0cbv",
  fileName: "Recent_Power_Usage7_-_Georgia_Power.pdf",
  fileType: "pdf",
  filePath: "/tmp/uploads/cmgx9nhbz0000k304r6mobedb/1760851785514__Recent_Power_Usage7_-_Georgia_Power.pdf",
  ocrText: "...", // Preserved even if file is gone
  extractedData: "{...}", // Preserved
}
```

### Serving Flow:
1. User clicks bill → `/api/files/bills/[billId]`
2. Look up bill in database → get filePath
3. Try to read file from `/tmp`
4. If exists → serve with proper headers
5. If missing → return 410 Gone

---

## Related Issues

- **Issue:** 404 errors viewing bills
- **Cause:** `/tmp` files not publicly accessible
- **Fix:** Created API serving route
- **Limitation:** Files are still ephemeral

---

**Status:** Temporary fix deployed ✅  
**Production Solution:** Pending (requires blob storage)  
**Priority:** Medium-High (works but not production-ready)

**Last Updated:** October 20, 2025
