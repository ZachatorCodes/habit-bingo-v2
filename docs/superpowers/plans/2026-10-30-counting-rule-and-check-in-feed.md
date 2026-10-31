# Counting rule + check-in feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protect squares count only once earned ("at most" at month end, "every day/week" after
the first met period), and every check-in shows in the group feed as one item per habit per day.

**Architecture:** `evaluateSquare` gains a `counting` flag next to `state`; every consumer that
used `counts(state)` for live scoring reads that flag instead. Check-in feed items reuse
`feed_event` (type `checkIn`, key `checkin:<squareId>:<date>`) and are upserted inside the
existing check-in transaction (`withHighlights`).

**Tech Stack:** SvelteKit 2 / Svelte 5, Drizzle + Postgres (PGlite in tests), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-30-counting-rule-design.md` and
`docs/superpowers/specs/2026-10-30-check-in-feed-design.md`

## Global Constraints

- Strict TDD: every behaviour has a failing test run and seen failing before the code.
- `src/lib/game` keeps 100% coverage (`npm run test:unit -- --coverage` gate).
- Never run `npm run dev`, `db:migrate`, `db:studio`; never read `.env*`. Tests use PGlite.
- Sheet copy, verbatim: "Counts at the end of the month if you stay under."
- Feed copy: "logged {name}" / "logged a private habit", " ×{count}" when count > 1,
  " for {Ddd}, {Mon} {d}" when `backfilled` (e.g. "for Thu, Oct 22").
- Migration `0013` adds `checkIn` to `feed_event_type_check`; the emoji drop becomes `0014`.

## Review Focus

1. A weekly "at least" square whose first clipped week requires 0 must not count from day one.
2. The month's last day itself: "at most" squares still don't count until the day after.
3. Two simultaneous logs of the same habit/day end with one feed item whose count matches the
   check-in row (the card row lock already serialises; the upsert must not insert twice).
4. Undo below 0 / refused writes (`ok: false`) must not touch the feed.
5. Points jump at month end: `squarePoints` for "at most" returns 0 during the month, 10 after.

---

### Task 1: Counting rule in the evaluator

**Files:**

- Modify: `src/lib/game/evaluate.ts` (`evaluateSquare`, `protectState`)
- Test: `src/lib/game/evaluate.spec.ts`

**Interfaces:**

- Produces: `evaluateSquare(rule, span, counts, today): { state: SquareState; progress: number; counting: boolean }`.
  `counting = counts(state) && !(rule.direction === 'atMost' && today <= lastDayOf(monthOf(span.startDate)))`
  (`counts` from `score.ts`; move it to `square-state.ts` if the import would be circular, and
  re-export from `score.ts`).

- [ ] **Step 1: Write the failing tests** in `evaluate.spec.ts` (card starting `2026-11-01`, Monday weeks):
  - `"at most" squares don't count during the month and count after it`: for daily, weekly and
    monthly atMost with no check-ins, on `2026-11-15` → `state: 'held', counting: false`; on
    `2026-11-30` → `counting: false`; on `2026-12-01` → `counting: true`.
  - `"every day" is empty until a day is met, then counts overnight`: daily atLeast target 1;
    `2026-11-01` no check-ins → `{ state: 'empty', counting: false }`; with `{'2026-11-01': 1}` on
    `2026-11-01` → `held, counting: true`; same counts on `2026-11-02` → `held, counting: true`.
  - `"every week" is empty until a week is met, the current week included`: weekly atLeast
    2 days/week; nothing logged on `2026-11-04` → `empty`; two days logged that week → counts.
  - `a 0-requirement first week does not count as met` (Review Focus 1): card starting on a
    Sunday with Monday weeks where the clipped first week's `required` is 0 → `empty` on that day.
  - `a settled miss before the first met day is lost`: daily atLeast, nothing logged, today
    `2026-11-06` → `lost`.
  - Existing win-back tests unchanged and still passing.

- [ ] **Step 2: Run** `npx vitest run src/lib/game/evaluate.spec.ts` — Expected: the new tests FAIL (`counting` undefined, `held` instead of `empty`).

- [ ] **Step 3: Implement.** In `protectState`, for `atLeast` day/week: after the existing `lost`
      checks, return `'empty'` when no period is met (day: some date in `[startDate, end]` with
      `count >= target`; week: some started week with `required > 0 && progress >= required`).
      Add `counting` in `evaluateSquare` as in Interfaces (earn squares: `counts(state)`).

- [ ] **Step 4: Run** `npx vitest run src/lib/game` — Expected: PASS. Fix any other `src/lib/game` spec that asserted day-one `held` for atLeast day/week squares; ledger each as a Ruling.

- [ ] **Step 5: Commit** `feat(rules): protect squares count once earned`.

### Task 2: Scoring, header, nudges and sheet read `counting`

**Files:**

- Modify: `src/lib/game/score.ts` (`scoreCard`, `squaresToLine`, `squarePoints`),
  `src/lib/game/nudges.ts`, `src/lib/server/card-view.ts` (center square),
  `src/lib/components/CardHeader.svelte`, `src/routes/(app)/card/+page.svelte`,
  `src/routes/(app)/today/+page.server.ts` (nudge input), `src/lib/components/HabitSheet.svelte`
- Test: `src/lib/game/score.spec.ts`, `src/lib/game/nudges.spec.ts`, `src/lib/components/HabitSheet.svelte.spec.ts`

**Interfaces:**

- Consumes: Task 1 `counting`.
- Produces:
  - `scoreCard(size, squares: { points: number; counting: boolean }[]): CardScore`
  - `squaresToLine(size, squares: { state: SquareState; counting: boolean }[]): number | null`
  - `ViewSquare` carries `counting: boolean` (center: `counts(state)`).
  - nudge squares carry `counting: boolean`.
  - `recap.ts` stays on `counts(state)` (it runs after month end, where they agree).

- [ ] **Step 1: Failing tests:**
  - `score.spec.ts`: `scoreCard` with all squares `counting: false` except free → `points` from base only, `tiers: []`, `lines: []`; `squaresToLine` ignores `held` squares with `counting: false` (needs them) and still skips lines with `lost`.
  - `score.spec.ts`: `squarePoints` atMost, no check-ins → `0` on `2026-11-15` and `2026-11-30`, `10` on `2026-12-01`; lost → `0` (Review Focus 5).
  - `nudges.spec.ts`: a line of held atMost squares mid-month does not produce "1 square from a bingo".
  - `HabitSheet.svelte.spec.ts`: an atMost square with `counting: false` and state `held` shows "Counts at the end of the month if you stay under."; with `counting: true` it doesn't.
  - `e2e/card.e2e.ts`: `a new card starts with 0 pts and no bingo` (build a 3×3 from the starter habits as the existing `buildToBoard` helper does, start it, expect the header to show `0` pts and no `Bingo!`).
- [ ] **Step 2: Run** `npx vitest run src/lib/game src/lib/components/HabitSheet.svelte.spec.ts` and `npx playwright test e2e/card.e2e.ts --project=phone -g "0 pts"` — Expected: new tests FAIL (held "at most" squares still score and count).
- [ ] **Step 3: Implement** the signatures above; thread `counting` through `card-view.ts`, the card page's `CardHeader` props, today's nudge input and the sheet's square prop.
- [ ] **Step 4: Run** `npm run check` and `npx vitest run src/lib src/routes` — Expected: 0 type errors; PASS (auth PGlite timeout flake excepted: rerun those files alone).
- [ ] **Step 5: Full E2E:** run `npx playwright test`; fix specs that assumed day-one counting (e.g. the today.e2e bingo dialog) by logging the needed days; ledger each fixture change as a Ruling.
- [ ] **Step 6: Commit** `feat(score): only earned squares count toward lines, tiers and points`.

### Task 3: Check-in feed items (server)

**Files:**

- Create: `drizzle/0013_check_in_feed.sql` (via `npm run db:generate -- --name check_in_feed`, offline)
- Modify: `src/lib/server/db/schema/feed.ts` (type union + check), `src/lib/server/feed.ts`,
  `src/lib/server/check-ins.ts` (`withHighlights`), `src/lib/server/cards.ts:~364` (swap delete)
- Test: `src/lib/server/feed.spec.ts`, `src/lib/server/check-ins.spec.ts`, `src/lib/server/cards.spec.ts`

**Interfaces:**

- Produces: `syncCheckIn(tx: Db, card: { id: string; userId: string }, square: { id: string; name: string | null; icon: string | null; isPrivate: boolean | null }, date: string, count: number, today: string, now: Date): Promise<void>`.
  Payload `{ name, icon, date, count, backfilled } | { private: true, date, count, backfilled }`,
  `backfilled = date !== today`. Count 0 → delete key `checkin:<squareId>:<date>`. Otherwise
  insert, `onConflictDoUpdate` on `(card_id, key)` setting `payload = excluded.payload` and
  `created_at = case when (excluded.payload->>'count')::int > (feed_event.payload->>'count')::int then excluded.created_at else feed_event.created_at end`.
- `withHighlights` gains a `date` argument and calls `syncCheckIn` with `result.count` only when `result.ok`.

- [ ] **Step 1: Failing tests:**
  - `check-ins.spec.ts`: `a log posts a checkIn item with count 1`; `a second log updates it to 2 and moves created_at forward`; `setCheckIn lowering the count keeps created_at`; `undo to 0 removes the item and its reactions`; `a backfilled day stores backfilled: true`; `a private habit is stored without a name`; `a refused write leaves the feed alone` (Review Focus 4); `two simultaneous logs leave one item with count 2` (Review Focus 3, `Promise.all`).
  - `cards.spec.ts`: `a habit swap removes its check-in items`.
- [ ] **Step 2: Run** `npx vitest run src/lib/server/check-ins.spec.ts src/lib/server/cards.spec.ts` — Expected: FAIL (no items / CHECK violation).
- [ ] **Step 3: Implement:** schema type `checkIn` + check, generate `0013`; `syncCheckIn`; hook in `withHighlights`; swap delete adds `or(inArray(key, square:…), like(key, 'checkin:<id>:%'))` per dropped square.
- [ ] **Step 4: Run** the two specs plus `src/lib/server/feed.spec.ts` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(feed): post every check-in as one item per habit per day`.

### Task 4: Render check-in items

**Files:**

- Modify: `src/lib/components/FeedItem.svelte`
- Test: `src/lib/components/FeedItem.svelte.spec.ts`, `e2e/feed.e2e.ts`

**Interfaces:**

- Consumes: Task 3 payload shape.

- [ ] **Step 1: Failing tests** (`FeedItem.svelte.spec.ts`): `checkIn` count 1 → "logged Drink water"; count 8 → "logged Drink water ×8"; private → "logged a private habit"; `backfilled` with date `2026-10-22` → ends "for Thu, Oct 22".
- [ ] **Step 2: Run** `npx vitest run src/lib/components/FeedItem.svelte.spec.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** the sentence branch; date via `Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })` on `${date}T00:00:00Z`.
- [ ] **Step 4: E2E failing test** in `e2e/feed.e2e.ts`: `a friend sees a check-in, reacts, sees ×2, and it goes on undo`. Run `npx playwright test e2e/feed.e2e.ts` — Expected: FAIL before Step 3 is complete, PASS after. Then the full `npx playwright test`; fix feed specs that counted items and now see extra check-in items (Ruling each).
- [ ] **Step 5: Run** `npm run check`, `npx eslint .`, `npx playwright test` — Expected: 0 errors, clean, all pass.
- [ ] **Step 6: Commit** `feat(feed): show check-ins in the group feed`.
