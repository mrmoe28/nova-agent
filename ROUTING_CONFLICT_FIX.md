# Next.js Dynamic Route Conflict Fix

## Problem

Server was stuck in a loading loop and failing to start with the error:

```
Error: You cannot use different slug names for the same dynamic path ('id' !== 'itemId').
```

## Root Cause

Next.js App Router does not allow multiple dynamic route segments with different parameter names at the same level. The app had:

- `src/app/api/bom/[id]/update-equipment/`
- `src/app/api/bom/[itemId]/route.ts`

Both `[id]` and `[itemId]` are dynamic segments under `/api/bom/`, but they use different parameter names, which Next.js prohibits.

## Solution

1. Consolidated the routes by moving `update-equipment` under `[itemId]`:
   ```bash
   mv src/app/api/bom/[id]/update-equipment src/app/api/bom/[itemId]/
   rmdir src/app/api/bom/[id]
   ```

2. Updated the route file to use consistent parameter naming:
   - Changed `{ params }: { params: Promise<{ id: string }> }` 
   - To `{ params }: { params: Promise<{ itemId: string }> }`
   - Updated parameter extraction from `const { id: bomItemId }` to `const { itemId: bomItemId }`

## Related Issues

This error was initially masked by:
1. **Database cache error**: PostgreSQL "cached plan must not change result type" - fixed by setting up proper DATABASE_URL
2. **Bus error: 10**: Caused by corrupted node_modules - fixed by `rm -rf node_modules .next && npm cache clean --force && npm install`

## Prevention

- Always use consistent parameter names for dynamic routes at the same level
- Use `find src/app -type d -name "\[*\]" | sort` to check for conflicting routes
- Test route structure with `npx next dev` to catch errors early

## Files Modified

- Moved: `src/app/api/bom/[id]/update-equipment/` → `src/app/api/bom/[itemId]/update-equipment/`
- Updated: `src/app/api/bom/[itemId]/update-equipment/route.ts`
- Removed: `src/app/api/bom/[id]/` (empty directory)

## Date Fixed

October 22, 2025

