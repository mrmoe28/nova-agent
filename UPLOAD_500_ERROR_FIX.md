# Upload 500 Error - RESOLVED ✅

**Date:** October 22, 2025
**Status:** RESOLVED ✅
**Issue:** Bill upload endpoint returning 500 errors in production

---

## 🚨 Error Summary

**Symptom:**
- Upload endpoint `/api/upload` returning 500 Internal Server Error
- Users unable to upload power bills on Bill Upload & Intake page
- Browser console showing: "Failed to load resource: the server responded with a status of 500"

**Root Cause:**
Vercel serverless functions have **read-only file system** except for `/tmp` directory. The upload code was trying to write files to `public/uploads/` which is not writable on Vercel.

---

## 🔍 Diagnosis

### What We Found:
1. ✅ **Local Testing:** Upload worked perfectly on local dev server
2. ❌ **Production Testing:** Upload failed with 500 error on Vercel
3. 🔍 **Root Cause:** File system permissions difference between local and Vercel

### Code Analysis:
```typescript
// ❌ BEFORE (Failed on Vercel)
const publicDir = join(process.cwd(), "public", "uploads", projectId);
await writeFile(filePath, buffer); // FAILS: public/ is read-only on Vercel
```

### Vercel File System Restrictions:
- ✅ `/tmp` - Writable but ephemeral (cleared after function execution)
- ❌ `public/` - Read-only on serverless functions
- ❌ `node_modules/` - Read-only
- ❌ `src/` - Read-only

---

## 🛠️ Fix Applied

### Solution:
Changed file upload path from `public/uploads/` to `/tmp/uploads/`

```typescript
// ✅ AFTER (Works on Vercel)
const tmpDir = join("/tmp", "uploads", projectId);
await mkdir(tmpDir, { recursive: true });
await writeFile(filePath, buffer); // SUCCESS: /tmp is writable
```

### Why This Works:
1. `/tmp` is the only writable directory in Vercel serverless functions
2. Files are processed immediately during the upload request
3. OCR happens while file exists in `/tmp`
4. File is saved to database with extracted data
5. After function completes, `/tmp` is cleared (expected behavior)

---

## ✅ Verification

### Local Testing:
```bash
✅ curl -X POST http://localhost:3000/api/upload \
     -F "projectId=test" \
     -F "file=@test.pdf"
# Response: {"success":true, "bill": {...}}
```

### Production Testing:
```bash
✅ curl -X POST https://novaagent-kappa.vercel.app/api/upload \
     -F "projectId=cmh0vsqpi0000l504wzhhgkm7" \
     -F "file=@test.pdf"
# Response: {"success":true, "bill": {...}}
```

### User Testing:
- ✅ Bill Upload & Intake page working
- ✅ Files upload successfully
- ✅ OCR processing completes
- ✅ Bills saved to database

---

## 📊 Impact

### Before Fix:
- ❌ Upload endpoint returning 500 errors
- ❌ Users unable to upload bills
- ❌ Bill Upload & Intake page unusable
- ❌ Project workflow blocked at first step

### After Fix:
- ✅ Upload endpoint working perfectly
- ✅ Users can upload bills successfully
- ✅ OCR processing working
- ✅ Full project workflow functional

---

## 📝 Important Notes

### File Storage on Vercel:

1. **Ephemeral Storage:**
   - Files in `/tmp` are deleted after serverless function completes
   - This is **expected and correct behavior**
   - OCR processing happens during the upload request

2. **Database Storage:**
   - File metadata stored in `Bill` table
   - OCR extracted text stored in `ocrText` field
   - Parsed data stored in `extractedData` field
   - Original file path stored (though file no longer exists)

3. **For Persistent File Storage:**
   - Use Vercel Blob Storage
   - Use AWS S3
   - Use any cloud storage service
   - Current implementation works for immediate OCR processing

---

## 🔐 Prevention

### For Future File Uploads:

1. **Always Use /tmp on Vercel:**
   ```typescript
   // ✅ CORRECT
   const tmpPath = join("/tmp", "uploads", filename);

   // ❌ WRONG
   const publicPath = join(process.cwd(), "public", filename);
   ```

2. **Test on Vercel:**
   - Local success doesn't guarantee Vercel success
   - Always test file operations in production
   - Be aware of serverless limitations

3. **Document Limitations:**
   - Add comments about /tmp being ephemeral
   - Clarify when files are available
   - Document expected behavior

---

## 📚 Related Documentation

- [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
- [Vercel File System](https://vercel.com/docs/functions/serverless-functions/runtimes/node-js#file-system)
- [Vercel Blob Storage](https://vercel.com/docs/storage/vercel-blob) - For persistent file storage
- `DATABASE_MIGRATION_500_ERROR_FIX.md` - Previous 500 error fix

---

## 🎓 Lessons Learned

1. **Local ≠ Production:**
   - File system behavior differs between local and Vercel
   - Always test file operations in production environment

2. **Serverless Constraints:**
   - Understand serverless limitations (read-only file system)
   - Use `/tmp` for temporary file operations
   - Consider cloud storage for persistent files

3. **Immediate Processing:**
   - Process files immediately during upload
   - Don't rely on files persisting after function execution
   - Store processed data in database

4. **Error Messages:**
   - Generic "Failed to upload file" masks the real issue
   - Add more detailed logging for file operations
   - Log actual error messages for debugging

---

## 🚀 Files Modified

1. ✅ `src/app/api/upload/route.ts` - Changed file path to `/tmp`
2. ✅ Added documentation about ephemeral storage
3. 📝 Created `UPLOAD_500_ERROR_FIX.md` (this file)

---

**Resolution Time:** ~20 minutes
**Fixed By:** Claude Code (Debug Protocol)
**Commit:** `932dedc`
**Status:** RESOLVED ✅

---

*Last Updated: October 22, 2025*
