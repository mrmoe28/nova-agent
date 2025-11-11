# Repository Guidelines

## Project Structure & Module Organization
- `src/app` contains Next.js App Router routes; feature folders (`wizard`, `projects`, `api`) keep UI and server logic together.
- Shared UI sits in `src/components` (shadcn/ui under `ui`); utilities and types live in `src/lib` and `src/types`.
- Data and assets: `prisma/` for schema + migrations, `public/` for static files. Tooling lives in `scripts/`, `server/ocr_service.py`, and root maintenance scripts.
- Playwright specs live in `tests/` with config in `playwright.config*.ts`; domain guides are under `docs/`.

## Build, Test, and Development Commands
- `npm run dev` launches the Next.js dev server with hot reload and Prisma client refresh.
- `npm run build && npm start` validates the production build locally.
- `npm run lint` enforces Next core-web-vitals rules; add `-- --fix` for autofixes.
- `npm test` runs the Playwright suite; `npm run test:ui` is interactive and `npm run test:report` replays the last run.
- Database helpers: `npx prisma migrate dev` applies schema changes, `npx prisma studio` inspects data, and `npm run ocr:start` spins up the OCR service.

## Coding Style & Naming Conventions
- TypeScript-first, functional React components, absolute imports via `@/...`, and shared logic extracted to `src/lib`.
- Keep 2-space indentation, trailing commas, and Tailwind utility-first styling composed with `clsx`/`tailwind-merge`.
- Components use PascalCase (`EnergyPlanCard.tsx`); hooks/helpers stay camelCase; Playwright specs end in `.spec.ts` with descriptive names.

## Testing Guidelines
- Extend Playwright coverage under `/tests`, mirroring route or flow names such as `bill-upload.spec.ts`.
- Use deterministic fixtures and Prisma seeds; avoid live services unless the change requires it.
- Run `npm test` before pushing and capture flaky behavior with `test.step` notes or log excerpts in the PR.

## Commit & Pull Request Guidelines
- Adopt Conventional Commit prefixes (`fix:`, `feat:`, `chore:`) with concise imperative summaries; note migrations or config updates in the body.
- Keep commits scoped and reviewable; squash noisy WIP history locally.
- PRs should outline context, list verification commands, and attach screenshots or PDFs for UI/report changes; link issues or docs updates when applicable.

## Configuration & Environment
- Copy `.env.example` to `.env.local` and set `DATABASE_URL`, `CRON_SECRET`, and optional scraping or AI keys before running the app.
- Do not commit `.env*`; coordinate shared secrets through Vercel or the chosen secret store.
- Document tweaks to sizing or scraping constants in the PR and refresh relevant `docs/` entries when behaviour changes.
