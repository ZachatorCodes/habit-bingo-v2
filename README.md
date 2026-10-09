# Habit Bingo

A monthly habit game for small groups of friends. Build a bingo card from your own habits, check
them off every day, earn and protect squares, unlock the real-life rewards you set yourself, and
race your friends up the group leaderboard.

- Product and technical design: [`docs/superpowers/specs/`](docs/superpowers/specs/)
- Implementation plans (one per milestone): [`docs/superpowers/plans/`](docs/superpowers/plans/)
- Architecture decisions: [`docs/adr/`](docs/adr/)
- How we work: [CONTRIBUTING.md](CONTRIBUTING.md)

## Stack

SvelteKit 3 (Svelte 5) · TypeScript · Tailwind CSS v4 · Drizzle ORM · Postgres (Neon) ·
Vitest · Playwright · GitHub Actions · Vercel

## Getting started

Requires Node 24 (see `.nvmrc`).

```bash
npm ci
npx playwright install chromium
cp .env.example .env   # fill in values when you need a database
npm run dev
```

The app builds and runs without a database; `/api/health` reports `degraded` until `DATABASE_URL`
is set.

## Scripts

| Script                  | What it does                                 |
| ----------------------- | -------------------------------------------- |
| `npm run dev`           | Start the dev server                         |
| `npm run build`         | Production build                             |
| `npm run preview`       | Serve the production build                   |
| `npm run check`         | Type-check (svelte-check)                    |
| `npm run lint`          | Prettier check + ESLint                      |
| `npm run format`        | Format everything with Prettier              |
| `npm run test:unit`     | Vitest in watch mode                         |
| `npm run test:coverage` | Vitest once, with coverage                   |
| `npm run test:e2e`      | Playwright end-to-end tests                  |
| `npm test`              | All Vitest tests, then Playwright            |
| `npm run db:generate`   | Generate a migration from the Drizzle schema |
| `npm run db:migrate`    | Apply migrations to `DATABASE_URL`           |
| `npm run db:studio`     | Browse the database                          |

> **Windows note:** local builds use `@sveltejs/adapter-auto` because `@sveltejs/adapter-vercel`
> needs symlink permission. Vercel builds use the Vercel adapter automatically.

## Deployment

- **Production:** every merge to `main` deploys to Vercel.
- **Previews:** every pull request gets a Vercel preview URL, backed by its own Neon database branch
  (Vercel's Neon integration creates it and sets `DATABASE_URL`).
- **Migrations:** Vercel runs `npm run vercel-build` (`drizzle-kit migrate && vite build`), so each
  environment's database is migrated before the app is built.
- **Health check:** `GET /api/health` returns `{"status":"ok","db":"ok"}` when the app can reach its
  database. The **Deploy smoke test** workflow checks this, plus the security headers, after every
  deployment (previews are reached with the `VERCEL_AUTOMATION_BYPASS_SECRET` repo secret).
