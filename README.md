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

## Environment variables

Set these in Vercel (Settings, Environment Variables) and, for local work, in `.env`
(see `.env.example`).

| Variable                | Environments               | Secret | What it is for                                                                                 |
| ----------------------- | -------------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | Production, Preview, local | Yes    | Pooled Postgres connection used by the app. Vercel's Neon integration sets it per environment. |
| `DATABASE_URL_UNPOOLED` | Production, Preview, local | Yes    | Direct Postgres connection used for migrations. Set by the Neon integration.                   |
| `BETTER_AUTH_SECRET`    | Production, Preview, local | Yes    | Signs sessions and tokens. Use a different value per environment; never in Development.        |
| `BETTER_AUTH_URL`       | Production, local          | No     | The app's public base URL. Required for Google sign-in, including local dev with Google.       |
| `GOOGLE_CLIENT_ID`      | Production, local          | No     | Google OAuth client ID for "Continue with Google".                                             |
| `GOOGLE_CLIENT_SECRET`  | Production, local          | Yes    | Google OAuth client secret.                                                                    |
| `BOOTSTRAP_INVITE_CODE` | Production                 | Yes    | One-time invite code that creates the first admin. Delete it afterwards (see below).           |

Google sign-in only works on production and `localhost`, because Google needs exact redirect URIs
(`/api/auth/callback/google` on each). Preview deployments use username and password only.

"Local" means your `.env` file. Do not add `BETTER_AUTH_SECRET` to Vercel's Development environment.

`IP_LIMIT_MULTIPLIER` (not in the table) multiplies the per-IP sign-in, sign-up and reset limits.
Only the E2E server sets it, because every E2E test comes from one IP. Never set it on Vercel.

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
  database; check it by hand after a deploy.

## Bootstrapping the first admin

Sign-up is invite-only, so the first account needs a bootstrap code.

1. Set `BOOTSTRAP_INVITE_CODE` to a long random string (as a Secret) and redeploy.
2. Visit `/join/<BOOTSTRAP_INVITE_CODE>` and create your account. You become the admin.
3. Delete `BOOTSTRAP_INVITE_CODE` from the environment. Once an admin exists it does nothing, so
   removing it just keeps things tidy.

From then on, create invites from the admin area.
