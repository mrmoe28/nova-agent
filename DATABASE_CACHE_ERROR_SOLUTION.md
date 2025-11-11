# Database Cache Error Solution

## Error Description

**Error Code:** `0A000`  
**Error Message:** `cached plan must not change result type`  
**Error Type:** PostgreSQL Query Plan Cache Conflict

## Symptoms

- Project creation fails with Prisma errors
- GET requests to `/api/projects` return 500 errors
- Error occurs after schema migrations or database structure changes
- Error message: `ConnectorError(ConnectorError { user_facing_error: None, kind: QueryError(PostgresError { code: "0A000", message: "cached plan must not change result type" })`

## Root Cause

PostgreSQL caches query execution plans to optimize performance. When the database schema changes (through migrations, schema updates, or column modifications), the cached plans may become invalid but are not automatically cleared. This causes a mismatch between the cached query plan and the actual database structure.

## Solution

### Quick Fix (Recommended)

Run the database cache clearing script:

```bash
npx tsx clear-db-cache.ts
```

This script:
1. Executes `DISCARD ALL` to clear all cached PostgreSQL prepared statements
2. Tests the connection by fetching projects
3. Confirms the cache has been cleared successfully

### Manual Fix

If the script is not available, run these commands:

```bash
# Connect to your PostgreSQL database
psql $DATABASE_URL

# Clear the cached plans
DISCARD ALL;

# Exit
\q
```

### Preventive Measures

1. **After Running Migrations:** Always clear the cache after running `npx prisma migrate dev` or `npx prisma migrate deploy`

2. **Restart Development Server:** After cache clearing, restart your Next.js dev server to ensure Prisma Client reconnects:
   ```bash
   # Kill the dev server (Ctrl+C) and restart
   npm run dev
   ```

3. **Production Deployments:** Include cache clearing in your deployment pipeline:
   ```bash
   npx prisma migrate deploy
   npx tsx clear-db-cache.ts
   npm run build
   npm start
   ```

## When This Error Occurs

- After database migrations
- After schema changes in `prisma/schema.prisma`
- After modifying table structures
- After adding/removing columns or relations
- After database restores or imports

## Related Files

- `/clear-db-cache.ts` - Cache clearing utility script
- `/prisma/schema.prisma` - Database schema definition
- `/src/lib/prisma.ts` - Prisma client instance
- `/src/app/api/projects/route.ts` - Project API endpoints (commonly affected)

## Verification

After running the cache clearing script, verify the fix:

1. **Test Project Creation:**
   ```bash
   curl -X POST http://localhost:3000/api/projects \
     -H "Content-Type: application/json" \
     -d '{"clientName":"Test","address":"123 Test St"}'
   ```

2. **Test Project Fetching:**
   ```bash
   curl http://localhost:3000/api/projects
   ```

Both should return successful responses without errors.

## Additional Notes

- This is a PostgreSQL-specific issue and does not occur with other databases (SQLite, MySQL)
- The `DISCARD ALL` command is safe and only clears session-level caches
- No data is lost when clearing the cache
- The cache will rebuild automatically as queries are executed

## Last Updated

October 20, 2025
