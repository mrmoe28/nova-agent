## Database Reset & Clean Rescrape

This guide explains how to **wipe all scraped data** (distributors, equipment, price snapshots, crawl jobs, and scrape history) and start fresh.

> **Warning:** These commands are destructive. They will delete **all** distributors and equipment records in the current database.

### 1. Ensure local database is configured

- `.env.local` must include a valid `DATABASE_URL`, for example:

```bash
DATABASE_URL="file:./dev.db"
```

Next.js loads `.env.local` automatically, but standalone Prisma scripts (run with `tsx`) do not, so the cleanup/check scripts explicitly load `.env.local` via `dotenv`.

### 2. Run the full cleanup script

From the project root (`nova-agent-main` where `package.json` lives):

```bash
cd nova-agent-main
npx tsx cleanup-all-data.ts
```

This will:

- Delete all `PriceSnapshot` rows
- Delete all `Equipment` rows
- Delete all `ScrapeHistory` rows
- Delete all `CrawlJob` rows
- Delete all `Distributor` rows

You should see:

```text
✓ Deleted all price snapshots
✓ Deleted all equipment
✓ Deleted all scrape history
✓ Deleted all crawl jobs
✓ Deleted all distributors
✅ Database cleaned successfully
```

### 3. Verify the database is empty

Run:

```bash
cd nova-agent-main
npx tsx check-all-data.ts
```

Expected output:

- No distributors listed
- `Total Equipment Records: 0`
- Empty crawl jobs and scrape history sections

### 4. Clean rescrape flow (recommended)

1. Start the dev server:

```bash
cd nova-agent-main
npm run dev
```

2. Open the app (e.g. `http://localhost:3000` or whichever port Next picks).
3. Go to the `Distributors` page.
4. Add a distributor **or** use the discovery/scraping flows:
   - Use the **Add Distributor** modal with “Auto-Fill from Website” and a base URL (e.g. `https://renewableoutdoors.com`).
   - Ensure “Scrape and save products to database” is checked if you want equipment created.
5. For existing distributors, use the **Rescrape** button on `/distributors/[id]` to repopulate equipment with fresh prices and images.

This sequence guarantees you are always scraping into a clean, known-good database.


