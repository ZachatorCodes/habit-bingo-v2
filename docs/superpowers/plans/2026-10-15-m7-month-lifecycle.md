# M7 Month Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finished months are finalized into `month_result`, and each gets a recap page, a Today banner and a place in History.

**Architecture:** Pure rules (is a month final, the highlight, the category breakdown) live in `src/lib/game/recap.ts`. `src/lib/server/month-results.ts` finalizes lazily (insert … on conflict do nothing) from the Today and History loads, scoring with the existing `cardView`. Three routes read it: `/me/history`, `/me/history/[month]`, and a banner plus Dismiss action on Today.

**Tech Stack:** SvelteKit 3 / Svelte 5 runes, Drizzle on Postgres (PGlite in tests), Vitest 4, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-09-habit-bingo-v2-design.md`, §3.5 (center), §3.8 (lifecycle), §4.10–§4.11 (History, recap), §5 (`month_result`).

**Base branch:** `fix/month-end-backfill` (cross-month backfill: `backfillMonths`, the 1st–3rd on Today). Start this branch from it, or from `main` once it has merged.

## Global Constraints

- TDD: every test is run and seen failing before its code.
- `src/lib/game/**` keeps 100% branch coverage.
- Imports use `#lib/*.ts`; hrefs use `resolve()` inline (scoped `eslint-disable svelte/no-navigation-without-resolve -- reason` where a query is needed).
- Every form works without JavaScript; enhanced forms keep scroll (`invalidateAll`, as Today does).
- States never rely on colour alone; the read-only board reuses `CardBoard` / `BingoSquare` unchanged.
- Copy is exact as below: "October recap", "Rewards earned", "🎉 Your October recap is ready", "Dismiss", "No finished months yet. Your first recap arrives on the 4th of next month."
- "Today" is always the person's local date: `localDate(requestNow(cookies, TEST_CLOCK), user.timezone ?? 'UTC')`.

## Review Focus

1. A far-ahead time zone: on Nov 3 UTC it is already Nov 4 in Pacific/Kiritimati, so October is final there and not in UTC. → Task 3 test.
2. Two tabs finalizing at once leave exactly one row and no error. → Task 3 test.
3. The center: next card built on Nov 2 counts; built on Nov 5 (after finalizing) doesn't change the saved result. → Task 3 test.
4. A forged or foreign URL (`/me/history/2026-13`, `/me/history/abc`, a month with no result, another person's month) answers 404. → Task 4 test.
5. Dismiss with a forged month (not the person's) changes nothing and doesn't error. → Task 6 test.

---

### Task 1: Recap rules

**Files:**

- Create: `src/lib/game/recap.ts`, `src/lib/game/recap.spec.ts`

**Interfaces:**

- Consumes: `backfillMonths(today)` (`backfill.ts`), `monthOf` (`calendar.ts`), `CATEGORIES`, `CategoryId` (`categories.ts`), `counts(state)` (`score.ts`), `SquareState`.
- Produces:
  - `isFinal(month: string, today: string): boolean`
  - `mostLogged(squares: { id: string; emoji: string; name: string }[], checkIns: ReadonlyMap<string, ReadonlyMap<string, number>>): { emoji: string; name: string; total: number } | null`
  - `categoryBreakdown(squares: { category: CategoryId; state: SquareState }[]): { id: CategoryId; emoji: string; label: string; counting: number; total: number }[]`

- [ ] **Step 1: Write the failing tests** in `recap.spec.ts`:
  - `isFinal`: `('2026-10','2026-11-03')` false; `('2026-10','2026-11-04')` true; `('2026-10','2026-10-31')` false; `('2026-09','2026-11-01')` true; `('2026-12','2027-01-04')` true.
  - `mostLogged`: sums every date's count per square; the highest total wins (`{ emoji: '🚴', name: 'Go biking', total: 14 }`); a tie goes to the square earlier in the array; squares with no check-ins and an empty map give `null`.
  - `categoryBreakdown`: in `CATEGORIES` order, only categories present; `counting` uses `counts()` (complete/held/atRisk count, inProgress/lost/empty don't), e.g. fitness `[complete, lost, held, inProgress]` → `{ id: 'fitness', emoji: '💪', label: 'Fitness', counting: 2, total: 4 }`.

- [ ] **Step 2: Run** `npx vitest run --project server src/lib/game/recap.spec.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement** the three functions. `isFinal` is `month < monthOf(today) && !backfillMonths(today).includes(month)`.

- [ ] **Step 4: Run** `npx vitest run --coverage --project server src/lib/game` — Expected: PASS, no coverage threshold error.

- [ ] **Step 5: Commit** `feat(recap): month finality, highlight and category rules`

### Task 2: `month_result` table

**Files:**

- Modify: `src/lib/server/db/schema/cards.ts` (append), migration `drizzle/0009_*.sql` + `drizzle/meta`

**Interfaces:**

- Produces: `monthResult` table: `userId` (text, FK `user.id` cascade), `month` (text), `points` (integer), `lines` (integer), `tiers` (text[], `Tier` values), `squaresCounting` (integer), `size` (integer), `seenAt` (timestamptz, null), `createdAt` (timestamptz default now); primary key (`userId`, `month`) — one result per person per month (the spec's unique pair).

- [ ] **Step 1:** Add the table; run `npm run db:generate` (a new table needs no rename prompt). Expected: `drizzle/0009_*.sql` with `CREATE TABLE "month_result"`.
- [ ] **Step 2:** Run `npx vitest run --project server src/lib/server/db` — Expected: PASS (test DB migrates).
- [ ] **Step 3: Commit** `feat(db): month_result table`

### Task 3: Finalizing

**Files:**

- Create: `src/lib/server/month-results.ts`, `src/lib/server/month-results.spec.ts`

**Interfaces:**

- Consumes: `isFinal` (Task 1), `monthResult` (Task 2), `cardView(db, userId, card, today)`, `getCard`, `Card`.
- Produces:
  - `finalizeMonths(db: Db, userId: string, today: string): Promise<void>` — for each of the person's cards with `month < monthOf(today)`, `isFinal`, and no result: score with `cardView(db, userId, card, today)` and insert `{ points, lines: score.lines.length, tiers, squaresCounting: score.counting, size }` with `onConflictDoNothing()`.
  - `type MonthResult` (the row, `tiers: Tier[]`)
  - `listResults(db, userId): Promise<MonthResult[]>` newest month first
  - `getResult(db, userId, month): Promise<MonthResult | null>`
  - `newestUnseen(db, userId): Promise<MonthResult | null>` — the newest result, only if its `seenAt` is null
  - `markSeen(db, userId, month, now: Date): Promise<void>` — scoped to the person; no-op for a month they have no result for

- [ ] **Step 1: Write the failing tests** (test helpers as in `check-ins.spec.ts`: `makeUser`, `makeHabits`, `startCard`, `logCheckIn`):
  - a card started Oct 1, with logs, finalized at today `2026-11-04` saves the same points / lines / tiers / counting as `cardView` at that day; at `2026-11-03` saves nothing.
  - an unmet day habit and a week habit short in its last week are `lost` at `2026-11-04` (not `atRisk`), so they don't count.
  - center: next card started on Nov 2 → the center counts (`squaresCounting` includes it); a second user whose next card is started on Nov 5, after finalizing on Nov 4, keeps the result saved on Nov 4 (re-running `finalizeMonths` on Nov 5 changes nothing).
  - `Promise.all` of two `finalizeMonths` → exactly one row, no throw.
  - no card in a month → no row; the current month is never finalized.
  - Pacific/Kiritimati: `localDate(new Date('2026-11-03T11:30:00Z'), tz)` is Nov 4 → finalized; the same instant for UTC is Nov 3 → not.
  - `newestUnseen` returns the newest unseen and null after `markSeen`; `markSeen` for another person's month leaves their row unseen.

- [ ] **Step 2: Run** `npx vitest run --project server src/lib/server/month-results.spec.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** `month-results.ts`.
- [ ] **Step 4: Run** the spec — Expected: PASS.
- [ ] **Step 5: Commit** `feat(recap): finalize finished months into month_result`

### Task 4: Recap page

**Files:**

- Create: `src/routes/(app)/me/history/[month]/+page.server.ts`, `+page.svelte`
- Test: covered by Task 1 and Task 3 unit tests and the Task 7 E2E (including Review Focus 4)

**Interfaces:**

- Consumes: `finalizeMonths`, `getResult`, `markSeen` (Task 3); `mostLogged`, `categoryBreakdown` (Task 1); `cardView`, `getCard`, `getCheckIns`, `CARD_SIZES`, `monthName`, `nextMonth`.
- Produces: page data `{ monthName, board: ViewSquare[] (no `id`/`link`, so no links), size, result, percent, rewards: { label, reward }[], highlight, categories, buildCard: boolean, buildMonthName }`.

- [ ] **Step 1:** Load: `month` must match `/^\d{4}-(0[1-9]|1[0-2])$/` else `error(404)`; `finalizeMonths` first; `getResult` null → 404. Board from `cardView(db, user.id, card, today)` with `id` and `link` stripped. `percent = Math.round(squaresCounting / size² × 100)`. Rewards earned from `result.tiers` in order, labels as `BingoCelebration`: "First bingo", "`{sixtyThreshold}` squares", "Blackout". `buildCard` = no card for the current month. Then `markSeen(db, user.id, month, now)`.
- [ ] **Step 2:** Page: `<h1>{Month} recap</h1>`; `CardBoard` (no `onopen`); "{points} points · {lines} lines · {percent}% counting" (tabular figures); "Rewards earned" list (hidden when none); the highlight line ("🚴 Go biking: 14 check-ins", "1 check-in" singular, hidden when null); categories ("💪 Fitness 2 of 4"); `Button` "Build {buildMonthName}'s card" → `/card/build` when `buildCard`; a link back to History. `Seo` title "{Month} recap".
- [ ] **Step 3:** `npm run check` — Expected: 0 errors.
- [ ] **Step 4: Commit** `feat(recap): the month recap page`

### Task 5: History

**Files:**

- Create: `src/routes/(app)/me/history/+page.server.ts`, `+page.svelte`
- Modify: `src/routes/(app)/me/+page.svelte` (a "History" link card after "Habit library", same markup)

**Interfaces:**

- Consumes: `finalizeMonths`, `listResults` (Task 3).

- [ ] **Step 1:** Load: `finalizeMonths`, then `listResults`. Page: `<h1>History</h1>`; one link per result to `/me/history/{month}`: "October 2026 · 380 points · Bingo, 5 squares" (the tier part left out when none; "1 point" singular); empty state copy from Global Constraints.
- [ ] **Step 2:** `npm run check` — Expected: 0 errors.
- [ ] **Step 3: Commit** `feat(recap): history of finished months`

### Task 6: Today banner

**Files:**

- Modify: `src/routes/(app)/today/+page.server.ts`, `+page.svelte`
- Test: `src/lib/server/month-results.spec.ts` (Review Focus 5 is covered by `markSeen`'s scoping test)

**Interfaces:**

- Consumes: `finalizeMonths`, `newestUnseen`, `markSeen` (Task 3).
- Produces: page data `recap: { month: string; monthName: string } | null`; action `dismissRecap` (form field `month`).

- [ ] **Step 1:** Load runs `finalizeMonths` then `newestUnseen` (before the no-card early return, so the banner shows without a current card). Action `dismissRecap`: `markSeen(db, user.id, field('month'), now)`, then redirect like `log` (keeping `?day=`).
- [ ] **Step 2:** Banner above the day switcher: a link "🎉 Your {Month} recap is ready" to `/me/history/{month}` and a `<form method="POST" action="?/dismissRecap" use:enhance>` with a hidden `month` and a "Dismiss" button. Enhanced submit uses `invalidateAll` like the log forms.
- [ ] **Step 3:** `npm run check` — Expected: 0 errors.
- [ ] **Step 4: Commit** `feat(today): recap banner`

### Task 7: End to end

**Files:**

- Create: `e2e/recap.e2e.ts`

- [ ] **Step 1: Write** `a finished month gets a banner, a recap and a History entry`: member with 8 habits, `setClock` Oct 15, start a card (reuse the `startCard` flow from `today.e2e.ts` — move it to `fixtures.ts` and import it in both), log Drink water once; `setClock('2026-11-04T12:00:00Z')`; `/today` shows "🎉 Your October recap is ready"; click it → `/me/history/2026-10` with heading "October recap", "Rewards earned" absent or present per the log, highlight "Drink water: 1 check-in"; back on `/today` the banner is gone; `/me/history` lists "October 2026". Second test: on `2026-11-03` there is no banner and `/me/history` shows the empty state. Third: `page.request.get` of `/me/history/2026-13`, `/me/history/abc` and `/me/history/2026-09` (no result) each answer 404. Fourth: Dismiss hides the banner without opening the recap (no-JS context too, via `newMemberWithoutJs`-style context as in `today.e2e.ts` `withoutJs`).
- [ ] **Step 2: Run** `npx playwright test e2e/recap.e2e.ts e2e/today.e2e.ts` — Expected: all pass on phone and desktop.
- [ ] **Step 3:** Full gate: `npm run check`, `npm run lint`, `npx vitest run --coverage`, `npx playwright test` — Expected: all green.
- [ ] **Step 4: Commit** `test(recap): month end to end`
