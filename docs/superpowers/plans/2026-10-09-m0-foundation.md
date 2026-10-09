# M0: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A deployed, tested, CI-guarded SvelteKit skeleton for Habit Bingo v2: public landing,
privacy and terms pages in the Playful design system, a working database connection, security
headers, SEO files, PWA manifest, and the full GitHub workflow (PRs, required checks, releases).

**Architecture:** One SvelteKit 3 app scaffolded with the official `sv` CLI. Layers per spec §5.2;
in M0 only the data layer (`src/lib/server/db`) and UI (`src/routes`, `src/lib/components`) exist.
The `game` module starts in M2. Every page is server-rendered; public pages are CDN-cached via
`cache-control` so security headers come from one place (`hooks.server.ts`).

**Tech Stack:** SvelteKit 3 / Svelte 5 / Vite 8, TypeScript (strict), Tailwind CSS v4, Drizzle ORM
0.45 + Drizzle Kit 0.31, `@neondatabase/serverless` (Pool), PGlite, Vitest 4 (node + browser
projects via `vitest-browser-svelte`), Playwright, GitHub Actions, Vercel, Neon.

**Spec:** `docs/superpowers/specs/2026-10-09-habit-bingo-v2-design.md`

## Global Constraints

- Node **24** (`.nvmrc` = `24`; `package.json` `engines.node` = `>=24`). npm is the package manager.
- Scaffold with `sv@1.1.1` and keep the versions it pins (Vitest 4.x, Kit 3.x). Add-on packages must
  match majors: `@vitest/coverage-v8@^4`.
- SvelteKit 3 conventions observed in the probe scaffold: **no `svelte.config.js`** (Kit options go
  in `sveltekit({...})` inside `vite.config.ts`); env vars declared in `src/env.ts` via
  `defineEnvVars` and read from `$app/env/private`; `#lib/*` subpath imports.
- Svelte 5 runes only.
- **Every task is its own branch and PR** (GitHub Flow, spec §7.2): `git switch -c <branch>` from an
  up-to-date `main`, conventional commits, `gh pr create`, squash-merge only after CI is green and
  the human partner approves. Task 1 is the only PR merged without CI (CI doesn't exist yet).
- Line endings: LF in the repo (`.gitattributes`: `* text=auto eol=lf`).
- Playful design tokens (spec §4, mockups): cream `#FFF7EC`, ink `#2B2340`, line `#F1E4D3`,
  accent `#FF7A59`, accent-2 `#FFB443`, earn `#6BD48A`/edge `#4CB86C`/shadow `#3E9C5A`,
  protect `#7FA8FF`/`#5E8BF0`/`#4A74D6`, risk `#FFD25E`/`#F2B630`/`#D99A12`, lost `#EFE8DF`.
  **Text on state colors is ink, never white** (white on `#6BD48A` fails WCAG AA).
- States never rely on color alone: ✓ complete, 🛡 held, ⚠ atRisk, ✗ lost, progress bar for
  inProgress, "FREE" for free.
- Only essential storage. The cookie notice dismissal is kept in `localStorage`, so pages stay
  cookie-free and CDN-cacheable.
- Public pages send `cache-control: public, max-age=0, s-maxage=3600`.
- No secrets in the repo; `.env.example` documents every variable.

**Deliberate deviation from spec:** §5.5 says public pages are "prerendered". This plan
server-renders them with CDN caching instead, because prerendered files on Vercel bypass
`hooks.server.ts` and would not get the security headers and CSP header. SEO is unaffected
(full HTML is served either way). Update spec §5.5 in Task 6.

## Review Focus

1. **Windows local builds.** `@sveltejs/adapter-vercel` fails locally with `EPERM symlink`. The
   adapter is chosen by environment (Vercel on Vercel, `adapter-auto` elsewhere) so
   `npm run build` and Playwright's `build && preview` work on Windows. Pinned by Task 1 Step 4.
2. **Build without a database.** `DATABASE_URL` is absent in CI and on first clone; the build and
   every public page must still work and `/api/health` must answer 503, not crash. Pinned by the
   lazy `getDb()` test in Task 4 and the CI build step in Task 2 (no `DATABASE_URL` set).
3. **CSP breaking the page.** A strict CSP can silently block SvelteKit hydration, fonts or the
   analytics script. The landing page must hydrate with zero CSP violations. Pinned by the
   console-violation E2E test in Task 8.
4. **Phone width.** Public pages must not scroll horizontally at 360px. Pinned by the E2E test in
   Task 6.
5. **Reduced motion.** The animated sample card must not animate under
   `prefers-reduced-motion: reduce`. Pinned by the E2E test in Task 6.

---

### Task 1: Scaffold the SvelteKit app

**Branch:** `chore/scaffold`

**Files:**
- Create (via `sv create`): `package.json`, `vite.config.ts`, `tsconfig.json`, `eslint.config.js`,
  `prettier.config.js`, `playwright.config.ts`, `drizzle.config.ts`, `src/app.html`, `src/app.d.ts`,
  `src/env.ts`, `src/routes/+layout.svelte`, `src/routes/+page.svelte`, `src/routes/layout.css`,
  `static/robots.txt`, `.env.example`, `.npmrc`, `.prettierignore`
- Create: `.nvmrc`, `.gitattributes`
- Modify: `.gitignore` (merge generated entries with existing `.superpowers/`)
- Delete: `src/lib/vitest-examples/`, `src/routes/page.svelte.e2e.ts`, `src/lib/server/db/schema.ts`
  demo `task` table (Task 4 recreates the db folder), `static/robots.txt` (Task 7 serves it)

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `preview`, `check`, `lint`, `format`, `test:unit`
  (`vitest`), `test:e2e` (`playwright test`, **without** `playwright install`), `test`
  (`vitest --run && playwright test`), `db:generate`, `db:migrate`, `db:studio`.

- [ ] **Step 1: Generate the app into the repo root**

```bash
npx -y sv@1.1.1 create . --no-dir-check --template minimal --types ts --add prettier eslint "vitest=usages:unit,component" "playwright=demo:no" "tailwindcss=plugins:none" "sveltekit-adapter=adapter:vercel" "drizzle=database:postgresql+client:neon" --install npm
```

Expected: "You're all set!" Existing `docs/` and `.git` untouched (`git status` shows only new files
plus `.gitignore`).

- [ ] **Step 2: Apply repo conventions**

Set `"name": "habit-bingo"`, `"engines": { "node": ">=24" }`. Change `test:e2e` to
`playwright test` and `test` to `vitest --run && playwright test`. Remove `db:push` (we only use
migrations). Install `@sveltejs/adapter-auto` as a dev dependency. Write `.nvmrc` (`24`) and
`.gitattributes` (`* text=auto eol=lf`). Run `npx playwright install chromium`. Delete the example
files listed above.

- [ ] **Step 3: Choose the adapter by environment in `vite.config.ts`**

`adapter: process.env.VERCEL ? vercelAdapter({ runtime: 'nodejs24.x' }) : autoAdapter()`.
(Vercel sets `VERCEL=1` during its builds.)

- [ ] **Step 4: Verify the toolchain on Windows**

Run: `npm run check && npm run lint && npm run build`
Expected: svelte-check "0 ERRORS", lint clean, build ends with `✔ done` (adapter-auto warning about
no detected environment is expected). No `EPERM`.

- [ ] **Step 5: Commit, push, open and merge the PR**

```bash
git add -A && git commit -m "chore: scaffold SvelteKit app with sv CLI"
git push -u origin chore/scaffold
gh pr create --title "chore: scaffold SvelteKit app" --body "Scaffold via sv@1.1.1 ..."
```

Merge (squash) after human approval; `git switch main && git pull`.

---

### Task 2: CI pipeline

**Branch:** `ci/github-actions`

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `vite.config.ts` (coverage), `package.json` (`test:coverage` script)
- Create: `src/lib/smoke.spec.ts` (temporary; deleted in Task 4)

**Interfaces:**
- Produces: required status check names used by Task 3's branch protection, exactly:
  `Lint & typecheck`, `Unit & component tests`, `E2E tests`, `Build`.

- [ ] **Step 1: Write a smoke test so the test job has something to run**

```ts
// src/lib/smoke.spec.ts
import { expect, it } from 'vitest';
it('runs the server test project', () => {
	expect(1 + 1).toBe(2);
});
```

- [ ] **Step 2: Run it**

Run: `npx vitest --run --project server`
Expected: 1 passed.

- [ ] **Step 3: Add coverage config**

Install `@vitest/coverage-v8@^4`. In `vite.config.ts` `test.coverage`: provider `v8`, reporters
`text` + `html`, `include: ['src/**/*.{ts,svelte}']`, and a per-glob threshold
`'src/lib/game/**': { branches: 100, functions: 100, lines: 100, statements: 100 }` (spec §7.1; the
folder appears in M2). Set `test.passWithNoTests: true` in the `client` project only (it has no
tests until Task 5; remove the flag in Task 5). Script `test:coverage` = `vitest --run --coverage`.

- [ ] **Step 4: Write `.github/workflows/ci.yml`**

Triggers: `pull_request` and `push` to `main`. `concurrency` group per ref with
`cancel-in-progress: true`. All jobs: `actions/checkout`, `actions/setup-node` with
`node-version-file: .nvmrc` and `cache: npm`, `npm ci`. **No `DATABASE_URL` in any job.**

| Job `name:` | Steps after install |
|---|---|
| `Lint & typecheck` | `npm run lint`, `npm run check` |
| `Unit & component tests` | `npx playwright install --with-deps chromium`, `npm run test:coverage` |
| `E2E tests` | `npx playwright install --with-deps chromium`, `npx playwright test`; upload `playwright-report/` as an artifact on failure |
| `Build` | `npm run build` |

- [ ] **Step 5: Push and verify CI on the PR**

Push branch, `gh pr create`, then `gh pr checks --watch`.
Expected: all four checks pass. (`E2E tests` passes with "No tests found" only if Playwright's
`--pass-with-no-tests` is set; add that flag to the CI command until Task 6 adds the first E2E test,
and remove it in Task 6.)

- [ ] **Step 6: Merge after approval**

---

### Task 3: Repository governance

**Branch:** `chore/repo-governance`

**Files:**
- Create: `.github/pull_request_template.md`, `.github/ISSUE_TEMPLATE/user-story.yml`,
  `.github/ISSUE_TEMPLATE/bug.yml`, `.github/ISSUE_TEMPLATE/config.yml`, `.github/dependabot.yml`,
  `.github/workflows/codeql.yml`, `.github/workflows/release-please.yml`,
  `release-please-config.json`, `.release-please-manifest.json`, `CONTRIBUTING.md`,
  `docs/adr/0001-sveltekit.md`, `docs/adr/0002-drizzle-and-neon.md`,
  `docs/adr/0003-auth-google-and-password.md`, `docs/adr/0004-derived-scores.md`,
  `docs/adr/0005-groups-only-social.md`, `docs/adr/0006-ssr-over-prerender.md`
- Modify: `README.md` (replace generated README)

This task is configuration and documents; its "test" is the verification in Step 4.

- [ ] **Step 1: Templates and docs**

- PR template sections: Summary, Linked issue (`Closes #`), How it was tested, Screenshots / preview
  URL, Checklist (tests first, CI green, checked on phone, a11y checked, docs updated).
- `user-story.yml` fields: "As a… I want… so that…" (required), Acceptance criteria in
  Given/When/Then (required), Milestone dropdown M0–M10, Notes. Label `story`.
- `bug.yml`: steps, expected, actual, device/browser. Label `bug`. `config.yml`:
  `blank_issues_enabled: false`.
- `CONTRIBUTING.md`: GitHub Flow from spec §7.2, branch prefixes, Conventional Commits, TDD loop
  (§7.1), Definition of Done (§7.5), local setup commands.
- `README.md`: one-paragraph product description, stack, setup (`nvm use`, `npm ci`,
  `npx playwright install chromium`, copy `.env.example`), scripts table, link to spec and
  CONTRIBUTING.
- ADRs: Context / Decision / Consequences, ≤ 1 page each, drawn from spec §5 and this plan's
  deviation note (0006).

- [ ] **Step 2: Automation config**

- `dependabot.yml`: `npm` weekly (group minor+patch into one PR), `github-actions` weekly.
- `codeql.yml`: `github/codeql-action` init/analyze, language `javascript-typescript`, on PRs, pushes
  to `main`, and weekly schedule.
- release-please: `googleapis/release-please-action`, `release-type: node`, manifest starting at
  `0.0.0`.

- [ ] **Step 3: Commit, push, PR, merge after approval**

- [ ] **Step 4: Configure GitHub (after merge)**

```bash
gh label create story --color 1D76DB; gh label create bug --color D73A4A
gh api repos/ZachatorCodes/habit-bingo-v2/milestones -f title="M0: Foundation"   # repeat for M1..M10 using spec §2 titles
gh api -X PUT repos/ZachatorCodes/habit-bingo-v2/branches/main/protection --input protection.json
```

`protection.json` (scratch file, not committed): `required_status_checks.strict: true`,
`contexts: ["Lint & typecheck","Unit & component tests","E2E tests","Build"]`,
`required_pull_request_reviews: null` (solo developer; approval is the human partner merging),
`enforce_admins: false`, `required_linear_history: true`, `allow_force_pushes: false`,
`restrictions: null`. Repo settings: `gh repo edit --enable-squash-merge --enable-merge-commit=false --enable-rebase-merge=false --delete-branch-on-merge`.

Projects board: ask the human partner to run `gh auth refresh -s project`, then
`gh project create --owner ZachatorCodes --title "Habit Bingo v2"` and link the repo.

Verify: `gh api repos/ZachatorCodes/habit-bingo-v2/branches/main/protection --jq '.required_status_checks.contexts'`
prints the four check names; `git push origin main` from a scratch commit is rejected (then
`git reset --hard origin/main` to discard the scratch commit).

---

### Task 4: Database layer and health check

**Branch:** `feat/db-health`

**Files:**
- Create: `src/lib/server/db/schema.ts`, `src/lib/server/db/client.ts`,
  `src/lib/server/db/test-db.ts`, `src/lib/server/health.ts`, `src/lib/server/health.spec.ts`,
  `src/lib/server/db/client.spec.ts`, `src/routes/api/health/+server.ts`,
  `drizzle/0000_init.sql` (+ `drizzle/meta/*` generated)
- Modify: `src/env.ts`, `drizzle.config.ts`, `.env.example`, `package.json`
- Delete: `src/lib/server/db/index.ts` (generated eager client), `src/lib/smoke.spec.ts`

**Interfaces:**
- Produces:
  - `type Db = PgDatabase<PgQueryResultHKT, typeof schema>` (from `drizzle-orm/pg-core`), exported
    from `client.ts`. Every service in later milestones takes a `Db`.
  - `createDb(url: string): Db`: Neon `Pool` + `drizzle-orm/neon-serverless`.
  - `getDb(): Db | null`: lazily creates and caches a `Db` from `DATABASE_URL`; returns `null` when
    unset. Never throws at import.
  - `createTestDb(): Promise<Db>`: fresh in-memory PGlite, Drizzle `pglite` driver, runs
    migrations from `./drizzle`.
  - `checkHealth(db: Db | null): Promise<{ status: 'ok' | 'degraded'; db: 'ok' | 'down' | 'unconfigured' }>`
  - `GET /api/health` → 200 with `checkHealth` body when `status === 'ok'`, else 503;
    `cache-control: no-store`.

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/server/health.spec.ts
import { describe, expect, it } from 'vitest';
import { checkHealth } from './health';
import { createTestDb } from './db/test-db';

describe('checkHealth', () => {
	it('is ok when the database answers', async () => {
		expect(await checkHealth(await createTestDb())).toEqual({ status: 'ok', db: 'ok' });
	});
	it('is degraded when no database is configured', async () => {
		expect(await checkHealth(null)).toEqual({ status: 'degraded', db: 'unconfigured' });
	});
	it('is degraded when the query fails', async () => {
		const broken = { execute: () => Promise.reject(new Error('boom')) } as never;
		expect(await checkHealth(broken)).toEqual({ status: 'degraded', db: 'down' });
	});
});
```

```ts
// src/lib/server/db/client.spec.ts
it('getDb returns null instead of throwing when DATABASE_URL is unset', ...)
```

Mock `$app/env/private` with `vi.mock('$app/env/private', () => ({ DATABASE_URL: undefined }))`.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest --run --project server src/lib/server`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

- Install `@electric-sql/pglite` (dev). Keep `@neondatabase/serverless`, move it and `drizzle-orm`
  to `dependencies`.
- `schema.ts`: empty for now (`export {}` with a comment pointing to M1).
- `drizzle.config.ts`: `out: './drizzle'`; only require `DATABASE_URL` for commands that need it
  (`generate` doesn't).
- Create the first migration: `npx drizzle-kit generate --custom --name init`, containing
  `SELECT 1;` with a comment "tables arrive in M1".
- `checkHealth`: run ``db.execute(sql`select 1`)``; map results as tested.
- `src/env.ts`: mark `DATABASE_URL` optional.
- `.env.example`: `DATABASE_URL="postgres://user:password@host/db?sslmode=require"  # Neon pooled connection string`.
- `package.json`: `"db:migrate": "drizzle-kit migrate"`.

- [ ] **Step 4: Run tests**

Run: `npx vitest --run --project server`
Expected: all pass.

- [ ] **Step 5: Verify the build still works without a database**

Run: `npm run build` (no `DATABASE_URL` set)
Expected: `✔ done`.

- [ ] **Step 6: Commit, PR, CI green, merge after approval**

---

### Task 5: Design tokens and core components

**Branch:** `feat/design-system`

**Files:**
- Modify: `src/routes/layout.css`
- Create: `src/lib/game/square-state.ts`, `src/lib/components/Button.svelte`,
  `src/lib/components/Button.svelte.spec.ts`, `src/lib/components/BingoSquare.svelte`,
  `src/lib/components/BingoSquare.svelte.spec.ts`

**Interfaces:**
- Produces:
  - `type SquareState = 'empty' | 'inProgress' | 'complete' | 'held' | 'atRisk' | 'lost' | 'free'`
    in `src/lib/game/square-state.ts` (type only; the game module that computes it starts in M2).
  - `Button.svelte` props: `{ variant?: 'primary' | 'secondary'; href?: string; type?: 'button' | 'submit'; children: Snippet; ...rest }`.
    Renders `<a>` when `href` is set, otherwise `<button>` (default `type="button"`).
  - `BingoSquare.svelte` props: `{ emoji: string; label: string; state: SquareState; progress?: number /* 0..1 */; showLabel?: boolean }`.
    Accessible name `"{label}: {stateText}"` where stateText is `not started | in progress, {n}% | complete | protected | at risk | lost | free`.

- [ ] **Step 1: Write failing component tests**

```ts
// BingoSquare.svelte.spec.ts (vitest browser project)
it('names the habit and state for screen readers', async () => {
	render(BingoSquare, { emoji: '📚', label: 'Finish a book', state: 'complete' });
	await expect.element(page.getByRole('img', { name: 'Finish a book: complete' })).toBeInTheDocument();
});
it('shows an icon for every non-empty state, not only color', ...)
// ✓ complete, 🛡 held, ⚠ atRisk, ✗ lost, 'FREE' free
it('renders a progress bar at the given percent for inProgress', ...)
// progress 0.66 → element with role="progressbar" aria-valuenow="66"
```

```ts
// Button.svelte.spec.ts
it('renders a link when href is given', ...)   // getByRole('link', { name: 'Get started' })
it('renders a button with type="button" by default', ...)
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest --run --project client`
Expected: FAIL, components not found.

- [ ] **Step 3: Implement tokens and components**

- Install `@fontsource-variable/nunito`; import it in `layout.css`.
- `layout.css` `@theme`: color tokens from Global Constraints (`--color-cream`, `--color-ink`,
  `--color-line`, `--color-accent`, `--color-accent-2`, `--color-earn`, `--color-earn-edge`,
  `--color-earn-shadow`, and `protect-*`, `risk-*`, `--color-lost`), `--font-sans: 'Nunito Variable', system-ui, sans-serif`,
  `--radius-square: 1rem`. `body` background cream, text ink.
- Squares and buttons use the "tactile" style: 2px border in the edge color, `box-shadow: 0 3px 0`
  shadow color, and `:active` translates down 3px and removes the shadow.
- BingoSquare with `role="img"`; `showLabel` toggles the visible name (spec §4.6).
- Remove `passWithNoTests` from the `client` Vitest project (added in Task 2).

- [ ] **Step 4: Run tests**

Run: `npx vitest --run`
Expected: all pass.

- [ ] **Step 5: Commit, PR, CI green, merge after approval**

---

### Task 6: Public pages, layout, cookie notice, analytics

**Branch:** `feat/public-pages`

**Files:**
- Create: `src/lib/components/Seo.svelte`, `src/lib/components/SiteFooter.svelte`,
  `src/lib/components/CookieNotice.svelte`, `src/lib/components/CookieNotice.svelte.spec.ts`,
  `src/lib/components/SampleCard.svelte`, `src/routes/+page.svelte` (replace),
  `src/routes/+page.server.ts`, `src/routes/privacy/+page.svelte`,
  `src/routes/privacy/+page.server.ts`, `src/routes/terms/+page.svelte`,
  `src/routes/terms/+page.server.ts`, `src/lib/server/cache.ts`, `e2e/public-pages.e2e.ts`
- Modify: `src/routes/+layout.svelte`, `src/routes/+layout.ts`, `playwright.config.ts`,
  `.github/workflows/ci.yml` (drop `--pass-with-no-tests`),
  `docs/superpowers/specs/2026-10-09-habit-bingo-v2-design.md` §5.5 (SSR + CDN cache)

**Interfaces:**
- Consumes: `Button`, `BingoSquare`, `SquareState` (Task 5).
- Produces:
  - `Seo.svelte` props `{ title: string; description: string; path: string; noindex?: boolean }`:
    sets `<title>` (`"{title} · Habit Bingo"`), meta description, canonical, Open Graph and Twitter
    tags; `noindex` adds `<meta name="robots" content="noindex">` (used by app pages from M1).
  - `publicCache(setHeaders)` in `src/lib/server/cache.ts`: sets
    `cache-control: public, max-age=0, s-maxage=3600`. Called from each public `+page.server.ts`
    `load`.
  - `PUBLIC_PATHS = ['/', '/privacy', '/terms']` exported from `src/lib/public-paths.ts` (consumed by
    Task 7's sitemap).

- [ ] **Step 1: Write failing tests**

```ts
// CookieNotice.svelte.spec.ts
it('shows the notice when it has not been dismissed', ...)
// text: "We only use essential cookies to keep you signed in."
it('hides and remembers dismissal in localStorage', ...)
// click "Got it" → notice gone; localStorage.getItem('cookieNoticeDismissed') === '1'
it('stays hidden when already dismissed', ...)
```

```ts
// e2e/public-pages.e2e.ts (Playwright projects: 'phone' = devices['Pixel 7'], 'desktop' = devices['Desktop Chrome'])
test('landing has a heading, CTA and sample card', ...)
// h1 visible; link "Get started" → /signin; 9 squares with role img
for (const path of ['/', '/privacy', '/terms']) {
	test(`${path} does not scroll horizontally at 360px`, async ({ page }) => {
		await page.setViewportSize({ width: 360, height: 780 });
		await page.goto(path);
		const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
		expect(overflow).toBeLessThanOrEqual(0);
	});
	test(`${path} is CDN-cacheable`, ...) // response header cache-control === 'public, max-age=0, s-maxage=3600'
	test(`${path} has title, description and canonical`, ...)
}
test('sample card does not animate with reduced motion', async ({ browser }) => {
	const page = await browser.newPage({ reducedMotion: 'reduce' });
	await page.goto('/');
	// SampleCard sets data-animating="false" when prefers-reduced-motion matches
	await expect(page.getByTestId('sample-card')).toHaveAttribute('data-animating', 'false');
});
test('footer links to privacy and terms', ...)
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest --run --project client` and `npx playwright test`
Expected: FAIL.

- [ ] **Step 3: Implement**

- Landing copy: h1 "Turn your habits into a game of bingo."; subtitle "Build a monthly card,
  check off habits, and race your friends to a blackout."; primary CTA "Get started" → `/signin`
  (route arrives in M1; 404 until then is acceptable); three short "how it works" blocks (Build your
  card · Check in daily · Win rewards with friends).
- `SampleCard`: 3×3 of `BingoSquare`s using the spec's example habits; every 1.5s advances one
  square to its next state, finishing on a completed line. Uses `matchMedia('(prefers-reduced-motion: reduce)')`
  to disable the timer; exposes `data-testid="sample-card"` and `data-animating`.
- Privacy page: what is stored (account, habits, check-ins), essential cookies only (session),
  cookieless analytics, no selling of data, deletion via Me → Delete account, contact
  `zachatorcodes@gmail.com`. Terms page: invite-only beta, acceptable use, no warranty.
  Both state "Last updated" with the PR's merge date.
- Layout: footer on every page; `CookieNotice` rendered once in the root layout.
- `+layout.ts`: `injectAnalytics({ mode: dev ? 'development' : 'production' })` from
  `@vercel/analytics/sveltekit`, only in the browser and not in dev.
- Remove `--pass-with-no-tests` from CI.
- Update spec §5.5 first bullet to "server-rendered and CDN-cached (see ADR 0006)".

- [ ] **Step 4: Run all tests**

Run: `npx vitest --run && npx playwright test`
Expected: all pass on both Playwright projects.

- [ ] **Step 5: Commit, PR, CI green, merge after approval**

---

### Task 7: Sitemap and robots

**Branch:** `feat/seo-files`

**Files:**
- Create: `src/lib/server/seo.ts`, `src/lib/server/seo.spec.ts`,
  `src/routes/sitemap.xml/+server.ts`, `src/routes/robots.txt/+server.ts`

**Interfaces:**
- Consumes: `PUBLIC_PATHS` (Task 6).
- Produces: `sitemapXml(origin: string, paths: readonly string[]): string`,
  `robotsTxt(origin: string): string`.

- [ ] **Step 1: Write failing tests**

```ts
it('lists every public path as an absolute URL', () => {
	const xml = sitemapXml('https://example.com', ['/', '/privacy']);
	expect(xml).toContain('<loc>https://example.com/</loc>');
	expect(xml).toContain('<loc>https://example.com/privacy</loc>');
	expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
});
it('robots allows public pages, blocks /api/, and points to the sitemap', () => {
	expect(robotsTxt('https://example.com')).toBe(
		'User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: https://example.com/sitemap.xml\n'
	);
});
```

- [ ] **Step 2: Run to verify failure** (`npx vitest --run --project server src/lib/server/seo.spec.ts` → FAIL)

- [ ] **Step 3: Implement** the two functions and thin `GET` handlers using `url.origin`, content
  types `application/xml` and `text/plain`, and `publicCache`.

- [ ] **Step 4: Run tests** → PASS

- [ ] **Step 5: Commit, PR, CI green, merge after approval**

---

### Task 8: Security headers, CSP and error handling

**Branch:** `feat/security-headers`

**Files:**
- Create: `src/lib/server/security-headers.ts`, `src/lib/server/errors.ts`,
  `src/lib/server/errors.spec.ts`, `src/hooks.server.ts`, `src/routes/+error.svelte`,
  `e2e/security.e2e.ts`
- Modify: `vite.config.ts` (`csp`), `src/app.d.ts` (`App.Error`)

**Interfaces:**
- Produces:
  - `SECURITY_HEADERS: Readonly<Record<string, string>>`, exactly:
    `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`,
    `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
    `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `X-Frame-Options: DENY`,
    `Cross-Origin-Opener-Policy: same-origin`.
  - `App.Error = { message: string; errorId?: string }`.
  - `toAppError(error: unknown, path: string, log: (entry: object) => void, newId?: () => string): App.Error`:
    logs `{ level: 'error', errorId, path, message }` and returns
    `{ message: 'Something went wrong.', errorId }`.
  - `handle` sets `SECURITY_HEADERS` on every response; `handleError` delegates to `toAppError`
    with `console.error(JSON.stringify(...))` and `crypto.randomUUID`.

- [ ] **Step 1: Write failing tests**

```ts
// errors.spec.ts
it('logs the real error with an id and returns a generic message with the same id', () => {
	const log = vi.fn();
	const result = toAppError(new Error('db exploded'), '/today', log, () => 'id-1');
	expect(result).toEqual({ message: 'Something went wrong.', errorId: 'id-1' });
	expect(log).toHaveBeenCalledWith({ level: 'error', errorId: 'id-1', path: '/today', message: 'db exploded' });
});
it('never leaks the internal message to the user', ...)
```

```ts
// e2e/security.e2e.ts
test('every response carries the security headers', ...) // for '/', '/privacy', '/sitemap.xml'
test('HTML responses carry a CSP with frame-ancestors none', ...)
test('the landing page hydrates with no CSP violations', async ({ page }) => {
	const violations: string[] = [];
	page.on('console', (m) => { if (/Content Security Policy/i.test(m.text())) violations.push(m.text()); });
	await page.goto('/');
	await page.getByRole('button', { name: 'Got it' }).click(); // proves hydration
	expect(violations).toEqual([]);
});
test('unknown routes show the friendly 404 page', ...)
```

- [ ] **Step 2: Run to verify failure** → FAIL

- [ ] **Step 3: Implement**

`csp` in `sveltekit({...})`: `mode: 'auto'`, directives `default-src 'self'`,
`script-src 'self'`, `style-src 'self' 'unsafe-inline'` (Svelte transitions write inline styles),
`img-src 'self' data:`, `font-src 'self'`, `connect-src 'self'`, `frame-ancestors 'none'`,
`base-uri 'self'`, `form-action 'self'`, `object-src 'none'`. `+error.svelte`: friendly copy,
the `errorId` when present ("Reference: …"), link home.

- [ ] **Step 4: Run all tests** (`npx vitest --run && npx playwright test`) → PASS

- [ ] **Step 5: Commit, PR, CI green, merge after approval**

---

### Task 9: PWA manifest and icons

**Branch:** `feat/pwa-manifest`

**Files:**
- Create: `static/icon.svg`, `scripts/generate-icons.ts`, `static/icons/icon-192.png`,
  `static/icons/icon-512.png`, `static/icons/maskable-512.png`, `static/apple-touch-icon.png`,
  `static/manifest.webmanifest`, `e2e/pwa.e2e.ts`
- Modify: `src/app.html` (manifest link, `theme-color` `#FFF7EC`, apple-touch-icon),
  `src/routes/+layout.svelte` (favicon → `/icon.svg`), `package.json` (`icons` script)
- Delete: `src/lib/assets/favicon.svg`

- [ ] **Step 1: Write the failing E2E test**

```ts
test('serves a valid web app manifest', async ({ request }) => {
	const res = await request.get('/manifest.webmanifest');
	expect(res.ok()).toBe(true);
	const m = await res.json();
	expect(m).toMatchObject({ name: 'Habit Bingo', short_name: 'Bingo', display: 'standalone', start_url: '/', background_color: '#FFF7EC', theme_color: '#FFF7EC' });
	for (const icon of m.icons) expect((await request.get(icon.src)).ok()).toBe(true);
});
test('pages link the manifest and an apple-touch-icon', ...)
```

- [ ] **Step 2: Run to verify failure** → FAIL

- [ ] **Step 3: Implement**

Icon: a cream rounded square with a 3×3 grid of Playful-colored squares (green, blue, yellow) and a
check. `scripts/generate-icons.ts` uses `sharp` (dev dependency; approve its install script with
`npm install-scripts approve sharp` if npm blocks it) to render `static/icon.svg` to the four PNGs
(maskable version with 20% safe padding). Run it once and commit the PNGs. Manifest icons:
192 and 512 (`purpose: any`) and maskable 512 (`purpose: maskable`).

- [ ] **Step 4: Run tests** → PASS

- [ ] **Step 5: Commit, PR, CI green, merge after approval**

---

### Task 10: Deploy: Vercel and Neon

**Branch:** `chore/deploy`

Account setup is done by the human partner; the agent prepares config and verifies.

**Files:**
- Create: `vercel.json`
- Modify: `package.json` (`vercel-build`), `README.md` (Deploy section)

- [ ] **Step 1: Human partner sets up services** (agent gives these instructions verbatim)

1. Create a Neon project "habit-bingo" (region nearest you); copy the **pooled** connection string.
2. In Vercel, "Add New → Project", import `ZachatorCodes/habit-bingo-v2`, framework SvelteKit.
3. In Vercel → Integrations, add **Neon** and connect it to this project with
   "Create a database branch for each preview deployment" enabled. This sets `DATABASE_URL` for
   Production and per-preview branches.
4. Vercel → Settings → Git: production branch `main`.

- [ ] **Step 2: Run migrations on deploy**

`vercel.json`: `{ "buildCommand": "npm run vercel-build" }`;
`"vercel-build": "drizzle-kit migrate && vite build"`. Migrations run against the environment's own
database (preview branch or production).

- [ ] **Step 3: PR, verify the preview**

Open the PR; Vercel comments a preview URL.
Verify: `curl -s <preview-url>/api/health` → `{"status":"ok","db":"ok"}`;
`curl -sI <preview-url>/` shows the security headers and `cache-control`.

- [ ] **Step 4: Merge after approval; verify production**

`curl -s https://<production-domain>/api/health` → `{"status":"ok","db":"ok"}`. Lighthouse
(Chrome DevTools, mobile) on the landing page: Performance, Accessibility, Best Practices and SEO
each ≥ 90; record scores in the PR description.

- [ ] **Step 5: Close the milestone**

Merge the release-please PR to tag `v0.1.0`. Close GitHub milestone "M0: Foundation".
