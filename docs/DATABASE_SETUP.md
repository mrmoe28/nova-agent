# Database Setup for NovaAgent

## Production Database (Vercel + Neon)

NovaAgent uses PostgreSQL in production. Follow these steps to set up the database:

### Option 1: Neon Integration (Recommended)

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/ekoapps/novaagent
   - Navigate to: Storage → Create Database

2. **Add Neon Postgres**
   - Click "Create" → Select "Neon Serverless Postgres"
   - Choose region: US East (iad1) for lowest latency
   - Click "Create & Continue"

3. **Automatic Configuration**
   - Vercel will automatically:
     - Create the Neon database
     - Add `DATABASE_URL` to environment variables
     - Connect to your project

4. **Run Migrations**
   ```bash
   # Pull the DATABASE_URL from Vercel
   vercel env pull .env.local

   # Run Prisma migrations
   npx prisma migrate deploy

   # Or create a new migration
   npx prisma migrate dev --name init
   ```

5. **Deploy**
   ```bash
   git push
   # Vercel will auto-deploy
   ```

### Option 2: Manual Neon Setup

1. **Create Neon Account**
   - Visit: https://neon.tech
   - Sign up and create a new project

2. **Get Connection String**
   - Copy the PostgreSQL connection string
   - Format: `postgresql://user:password@host/database`

3. **Add to Vercel**
   ```bash
   vercel env add DATABASE_URL production
   # Paste your connection string
   ```

4. **Update Local Environment**
   ```bash
   # .env.local
   DATABASE_URL="your_neon_connection_string"
   ```

5. **Run Migrations**
   ```bash
   npx prisma migrate deploy
   ```

### Option 3: Vercel Postgres

1. **Go to Vercel Dashboard**
   - Storage → Create Database → Vercel Postgres

2. **Configure Database**
   - Name: novaagent-db
   - Region: Washington, D.C. (iad1)

3. **Follow steps 3-5 from Option 1**

## Local Development

For local development, you can continue using SQLite:

```bash
# .env.local
DATABASE_URL="file:./dev.db"
```

Then run:
```bash
npx prisma migrate dev
npx prisma generate
```

## Database Schema

The application uses 6 main tables:
- **Project**: Client and project metadata
- **Bill**: Power bill uploads
- **Analysis**: Usage analysis results
- **System**: Solar/battery system design
- **BOMItem**: Equipment line items
- **Plan**: Installation plan with NEC checks

## Migrations

After any schema changes:

```bash
# Create migration
npx prisma migrate dev --name your_migration_name

# Deploy to production
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

## Database Management

```bash
# Open Prisma Studio (GUI)
npx prisma studio

# Reset database (local only!)
npx prisma migrate reset

# View database schema
npx prisma db pull
```

## Troubleshooting

### Connection Issues
- Verify `DATABASE_URL` is set in Vercel dashboard
- Check database is running (Neon dashboard)
- Ensure database region matches app region

### Migration Errors
- Ensure all pending migrations are applied
- Check Prisma schema syntax
- Verify database credentials

### Performance
- Neon auto-scales and has connection pooling
- Use Prisma connection pooling for serverless: `?pgbouncer=true`

## Next Steps

After database setup:
1. Run initial migration
2. Test API endpoints
3. Verify data persistence
4. Monitor database in Neon dashboard
