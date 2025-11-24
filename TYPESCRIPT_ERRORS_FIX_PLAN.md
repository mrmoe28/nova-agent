# TypeScript Errors - Complete Fix Plan

## Error Summary (from Vercel Build)

### Error #1: Buffer Type Incompatibility
**File**: `src/app/api/documents/[id]/download/route.ts:51:31`

**Error Message**:
```
Type error: Argument of type 'Buffer<ArrayBufferLike>' is not assignable to parameter of type 'BodyInit | null | undefined'.
Type 'Buffer<ArrayBufferLike>' is missing the following properties from type 'URLSearchParams': size, append, delete, get, and 2 more.
```

**Location**: Line 51
```typescript
return new NextResponse(fileBuffer, {
  ^
  status: 200,
  headers,
});
```

**Root Cause**: Next.js 15's `NextResponse` expects the buffer to be converted to a proper response type. The Node.js `Buffer` type is not directly compatible with the `BodyInit` type.

**Fix**: Convert the buffer to an `ArrayBuffer` or use `Response` instead of `NextResponse`.

---

## Fix Plan

### Step 1: Fix Buffer Type Issue in Download Route
**Priority**: HIGH - Blocking deployment

**Solution Options**:

#### Option A: Convert Buffer to ArrayBuffer (Recommended)
```typescript
const fileBuffer = await readFile(filePath);

return new NextResponse(fileBuffer.buffer, {
  status: 200,
  headers,
});
```

#### Option B: Use standard Response
```typescript
const fileBuffer = await readFile(filePath);

return new Response(fileBuffer, {
  status: 200,
  headers,
});
```

#### Option C: Convert to Uint8Array
```typescript
const fileBuffer = await readFile(filePath);
const uint8Array = new Uint8Array(fileBuffer);

return new NextResponse(uint8Array, {
  status: 200,
  headers,
});
```

**Recommended**: Option A (simplest, cleanest)

### Step 2: Scan for Similar Issues
Check for other routes that return file buffers:
- `src/app/api/bills/[id]/file/route.ts`
- `src/app/api/pdf/route.ts`
- Any other download/file serving routes

### Step 3: Verify Type Safety
Run local type check:
```bash
npm run type-check
# or
npx tsc --noEmit
```

### Step 4: Test Build Locally
```bash
npm run build
```

### Step 5: Push and Verify Vercel Deployment

---

## Implementation Order

1. ✅ Fix `documents/[id]/download/route.ts` (Buffer conversion)
2. ⚠️ Check `bills/[id]/file/route.ts` for similar issues
3. ⚠️ Check `pdf/route.ts` for similar issues
4. ✅ Run local type check
5. ✅ Run local build
6. ✅ Commit and push
7. ✅ Monitor Vercel deployment

---

## Status Tracking

- [x] Error #1: Buffer type in download route - **FIXED**
- [x] Scan similar routes - **FOUND 1 MORE**
- [x] Error #2: Buffer type in PDF route - **FIXED**
- [x] Error #3: PlanDocument PATCH route invalid fields - **FIXED**
- [x] Local type check passed - **NO ERRORS**
- [x] Committed and pushed - **DONE**
- [ ] Vercel deployment monitoring
- [ ] Deployment successful

---

## Fixes Applied

### Fix #1: documents/[id]/download/route.ts
```typescript
// Before (causing type error):
return new NextResponse(fileBuffer, { ... });

// After (Next.js 15 compatible):
return new NextResponse(new Uint8Array(fileBuffer), { ... });
```

### Fix #2: pdf/route.ts
```typescript
// Before (using unsafe type cast):
return new NextResponse(pdfBuffer as unknown as BodyInit, { ... });

// After (Next.js 15 compatible):
return new NextResponse(new Uint8Array(pdfBuffer), { ... });
```

**Why Uint8Array?**
- Next.js 15 expects `BodyInit` type for `NextResponse`
- `Uint8Array` is the cleanest way to convert Node.js `Buffer` to `BodyInit`
- Already proven working in `bills/[id]/file/route.ts`
- Simpler and more readable than `buffer.slice()` approach

### Fix #3: documents/[id]/route.ts (PATCH method)
```typescript
// Before (trying to update non-existent fields):
const { status, notes } = body;
await prisma.planDocument.update({
  where: { id },
  data: {
    status: status || undefined,    // ❌ status doesn't exist in schema
    notes: notes !== undefined ? notes : undefined,  // ❌ notes doesn't exist in schema
  },
});

// After (only updating fields that exist):
const { type, category } = body;
const updateData: any = {};
if (type !== undefined) updateData.type = type;
if (category !== undefined) updateData.category = category;
await prisma.planDocument.update({
  where: { id },
  data: updateData,
});
```

**PlanDocument Schema Fields:**
- ✅ `type` - Document type (permit_application, drawing, etc.)
- ✅ `category` - Category (permit, utility, installation, inspection)
- ✅ `fileName`, `filePath`, `uploadedBy`, `uploadedAt`, `version`
- ❌ `status`, `notes` - Don't exist in schema

### Verified Clean:
- ✅ `bills/[id]/file/route.ts` - Already using `Uint8Array` (correct)

---

**Created**: November 24, 2025  
**Status**: Fixes complete, ready to deploy

