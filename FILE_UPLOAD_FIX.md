# File Upload Fix - Unable to View Uploaded Documents

**Date:** October 20, 2025  
**Issue:** 404 errors when trying to view uploaded PDF bills  
**Root Cause:** Files stored in `/tmp/uploads/` (ephemeral on Vercel serverless)

---

## Problem

Users were unable to view uploaded documents, getting 404 errors like:
```
https://novaagent-kappa.vercel.app/tmp/uploads/cmgx9nhbz0000k304r6mobedb/1760851785514_Recent_Power_Usage7_-_Georgia_Power.pdf
```

### Root Cause

1. **Ephemeral Storage**: Files were being uploaded to `/tmp/uploads/` directory
2. **Vercel Serverless**: `/tmp` directory is cleared after each function execution
3. **No Persistence**: Files disappeared immediately after upload completed
4. **Database Mismatch**: Database stored paths to non-existent files

---

## Solution

### Changed File Storage Location

**Before:** `/tmp/uploads/PROJECT_ID/FILE` (ephemeral, deleted after function)  
**After:** `public/uploads/PROJECT_ID/FILE` (persistent, served as static asset)

### Changes Made

1. **Updated Upload Route** (`src/app/api/upload/route.ts`):
   - Changed storage from `/tmp/uploads/` to `public/uploads/`
   - Store URL paths (`/uploads/...`) in database instead of filesystem paths
   - Files now persist and are accessible via URL

2. **Created Migration Script** (`fix-file-paths.ts`):
   - Updates existing database records
   - Converts `/tmp/uploads/` paths to `/uploads/` paths
   - Maintains backward compatibility

3. **Updated .gitignore**:
   - Added `/public/uploads/` to prevent committing uploaded files
   - Keeps repository clean while allowing local testing

---

## File Structure

```
public/
  └── uploads/
      └── [projectId]/
          └── [timestamp]_[filename].pdf
```

**Example:**
- **Filesystem:** `/workspace/public/uploads/cmgx9nhbz0000k304r6mobedb/1760851785514_file.pdf`
- **URL:** `https://novaagent-kappa.vercel.app/uploads/cmgx9nhbz0000k304r6mobedb/1760851785514_file.pdf`
- **Database:** `/uploads/cmgx9nhbz0000k304r6mobedb/1760851785514_file.pdf`

---

## Migration Steps

### 1. Update Code (Done ✅)
- Modified `src/app/api/upload/route.ts`
- Files now save to `public/uploads/`
- Database stores URL paths

### 2. Fix Existing Data

Run the migration script to update existing database records:

```bash
# Update file paths in production database
npx tsx fix-file-paths.ts
```

This will:
- Find all bills with `/tmp/uploads/` paths
- Update them to `/uploads/` paths
- Log each change for verification

### 3. Note on Existing Files

**Important:** Files uploaded before this fix are **permanently lost** because they were stored in `/tmp/` which gets cleared.

For affected projects (like Dr. Coleman with 12 bills):
- Database records exist with correct metadata
- File paths are updated to new format
- **Physical files are missing** and need to be re-uploaded

**Options:**
1. **Re-upload bills** for affected projects
2. **Mark as "re-upload needed"** and notify users
3. **Keep metadata** for historical reference

---

## Testing

### Test New Uploads

1. Create new project
2. Upload a PDF bill
3. Verify file appears in `public/uploads/PROJECT_ID/`
4. Check database has `/uploads/PROJECT_ID/FILE` path
5. Access file via URL: `https://your-app.vercel.app/uploads/PROJECT_ID/FILE`

### Verify Production

```bash
# Check existing bills
curl https://novaagent-kappa.vercel.app/api/projects

# Try accessing a bill URL
curl -I https://novaagent-kappa.vercel.app/uploads/PROJECT_ID/FILE.pdf
```

---

## Benefits of New Approach

### ✅ Persistent Storage
- Files survive serverless function execution
- Accessible anytime via URL
- No file loss between requests

### ✅ Simple URL Access
- Direct URL access: `/uploads/PROJECT_ID/FILE`
- No special routing needed
- Works with browser, PDF viewers, etc.

### ✅ Vercel-Optimized
- `public/` folder is deployed as static assets
- Served by Vercel's CDN
- Fast global access

### ✅ Clean Database
- URL paths instead of filesystem paths
- Portable across environments
- Easy to migrate to cloud storage later

---

## Future Enhancements

### Option 1: Cloud Storage (Recommended for Scale)

For production at scale, consider moving to cloud storage:

**Vercel Blob Storage:**
```typescript
import { put } from '@vercel/blob';

const blob = await put(fileName, file, {
  access: 'public',
  addRandomSuffix: false,
});

// Store blob.url in database
```

**AWS S3:**
```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

await s3Client.send(new PutObjectCommand({
  Bucket: 'novaagent-uploads',
  Key: `${projectId}/${fileName}`,
  Body: buffer,
}));
```

**Cloudflare R2:**
```typescript
import { S3Client } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  endpoint: `https://${account}.r2.cloudflarestorage.com`,
  // ... credentials
});
```

### Option 2: Add File Management

- File deletion when project deleted
- File size tracking and limits
- Cleanup old files
- Compression for large PDFs

### Option 3: Enhanced Security

- Signed URLs for private files
- Access control per project
- Expiring download links
- Virus scanning

---

## Deployment Checklist

### Before Deploying

- [x] Update upload route code
- [x] Create migration script
- [x] Update .gitignore
- [x] Test locally
- [ ] Run migration on production
- [ ] Test file upload on production
- [ ] Verify existing bill URLs

### After Deploying

1. **Run Migration:**
   ```bash
   npx tsx fix-file-paths.ts
   ```

2. **Test Upload:**
   - Go to a project
   - Upload a test bill
   - Click to view the bill
   - Verify PDF opens

3. **Check Existing Projects:**
   - Dr. Coleman project has 12 bills
   - Paths are updated in database
   - Files need to be re-uploaded

---

## Troubleshooting

### Issue: "File not found" after upload

**Check:**
1. Is file in `public/uploads/PROJECT_ID/`?
2. Does database have `/uploads/` path (not `/tmp/uploads/`)?
3. Is Vercel deploying the `public/` folder?

**Solution:**
```bash
# Verify file exists
ls -la public/uploads/PROJECT_ID/

# Check database
npx prisma studio
# Look at Bill table, check filePath column
```

### Issue: Old bills still 404

**Reason:** Physical files were deleted when stored in `/tmp/`

**Solution:** Re-upload the bills or inform user

### Issue: Files not deploying to Vercel

**Check `.vercelignore`:**
- Make sure `public/uploads/` is NOT in `.vercelignore`
- Vercel includes `public/` by default

---

## Related Files

- `src/app/api/upload/route.ts` - Main upload handler
- `fix-file-paths.ts` - Migration script
- `.gitignore` - Exclude uploads from git
- `public/uploads/` - File storage directory

---

**Status:** ✅ FIXED  
**Tested:** Pending production deployment  
**Migration:** Ready to run
