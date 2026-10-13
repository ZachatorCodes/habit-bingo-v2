# M4: Today & Check-ins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** People log their habits on a Today screen — today and the 3 days before — with satisfying
feedback, and every square on their card shows its live state (earn, protect, at risk, lost).

**Architecture:** The rules of spec §3.4 (week clipping) and §3.5 (square states) are pure functions
in `src/lib/game` with 100% branch coverage: clipped week requirements, the backfill window, a
square's evaluation from its check-ins, and the Today grouping and progress text. A `check-ins`
service owns the `check_in` table (one row per square and date, with a count) and all
authorization. Today is a no-JS-first page of plain form posts, enhanced with optimistic updates
and the Pop & burst animation.

**Tech Stack:** SvelteKit 3, Svelte 5 runes, Drizzle + Postgres (PGlite in tests), Vitest 4,
Playwright, `canvas-confetti`.

**Spec:** `docs/superpowers/specs/2026-10-09-habit-bingo-v2-design.md` (§3.1, §3.2, §3.4, §3.5,
§4.5, §4.7, §5.3, §6)

## Global Constraints

- Everything in the M0–M3.1 plans' Global Constraints still applies (branch + PR per task,
  Conventional Commits, `#lib/*.ts` imports, Playful tokens, states never colour-only, reduced
  motion respected, `requireUser(locals)` in every load and action, times read through
  `requestNow(cookies, TEST_CLOCK)`).
- **Check-ins are counts (spec §3.2):** one row per square and date, `count` 1–20; tapping adds
  one; a count of 0 removes the row. `times` mode sums counts; `days` mode counts dates with a
  check-in.
- **Backfill window (spec §3.1):** today plus the previous 3 days (user-local), and only dates
  inside the card's span (start date … month end). Nothing else can be added or removed.
- **Week clipping (spec §3.4):** weeks follow the card's `weekStartsOn` snapshot and are clipped to
  the span; `d` = days of the week inside the span. `atLeast/week` needs `round(N × d / 7)` (round
  half up), `atMost/week` allows `ceil(N × d / 7)`; in `days` mode both are capped at `d`; full
  weeks use `N`.
- **Square states (spec §3.5), verbatim:**
  - Earn (`atLeast/month`), `k` = progress over the span: `empty` (k = 0), `inProgress`
    (0 < k < N), `complete` (k ≥ N).
  - Protect squares start `held`. `atLeast/day`: `atRisk` when any backfill-window day other than
    today (within the span) is not met; `lost` when any span day older than the window is not met.
    `atLeast/week`: `atRisk` when the current week is short by `m > 0` and the days left in it
    (including today) ≤ `m`, or a past week is short but its last day is still in the window;
    `lost` when a week whose last day is older than the window is short. `atMost/day`: `atRisk`
    when today's count = N; `lost` when any span day's count exceeds N. `atMost/week`: `atRisk`
    when this week's progress = its limit; `lost` when any week exceeds its limit. `atMost/month`:
    `atRisk` when progress = the limit; `lost` when it exceeds it.
  - A date is **met** for a `day` habit when its count ≥ N.
- **Today (spec §4.5):** sections **Do today** (day habits not yet met today; week habits still
  short this week), **Anytime this month** (earn squares), **Log a slip** (`atMost` habits). Each
  row: emoji, name, progress text ("5/8 today", "2 of 3 this week") and an add button. A day
  switcher reaches the earlier backfill-window days. Empty states: "No card yet" → "Build one";
  "All done today 🎉".
- **Pop & burst (spec §4.7):** the row's square squishes on press, springs into its new state,
  confetti bits burst out; `navigator.vibrate` where supported. Reduced motion: fades, no confetti.
- **Optimistic check-ins (spec §6):** the count updates at once and rolls back with a toast if the
  server refuses (outside the window, network failure).

**Decisions this plan makes:**

- Corrections on Today use a visible **−** button on rows with a count for the selected day, not
  long-press (accessible, works without JS). The bottom-sheet stepper arrives with the card view
  (M5).
- Day habits already met today, and week habits already met this week, are listed under a collapsed
  **Done** group on Today, so they can still be corrected.
- The phone tab bar waits for Updates/Groups (M6/M8); M4 keeps the current header nav.
- Only the current month's card is logged in M4; the closing window (1st–3rd) for the old month is
  M7.

## Review Focus

1. **A date outside the window or the span** (a forged post, or a Today page left open across
   midnight) must be refused: "You can only log today and the 3 days before." Pinned in Task 3.
2. **Double taps and simultaneous +1 posts** must each count exactly once, never lose an update,
   and stop at 20. Pinned in Task 3.
3. **Someone else's square id** (or a square from another month's card) must be 404. Pinned in
   Task 3.
4. **Editing the card after logging:** kept squares keep their check-ins and are re-evaluated
   against a changed target at once; a dropped square's check-ins go with it. Pinned in Task 3.
5. **Week edges:** a week that straddles the month start or end (a 1-day stub week, a card started
   on a Sunday with Monday weeks) gets the clipped requirement and the right state. Pinned in
   Task 1 and Task 2.

---

### Task 1: Weeks and the backfill window (pure)

**Branch:** `feat/weeks-and-backfill`

**Files:**

- Create: `src/lib/game/weeks.ts`, `weeks.spec.ts`, `src/lib/game/backfill.ts`, `backfill.spec.ts`
- Modify: `src/lib/game/calendar.ts` (+ spec)

**Interfaces:**

- Produces:
  - `calendar.ts`: `addDays(date: string, days: number): string`, `weekday(date: string): number`
    (0 = Sunday … 6 = Saturday).
  - `weeks.ts`: `type Week = { start: string; end: string; days: number; required: number }`;
    `clippedWeeks(rule: HabitRule, startDate: string, weekStartsOn: 'monday' | 'sunday'): Week[]` —
    the weeks from `startDate` to the month's last day, each clipped to that span, with the
    requirement (`atLeast`) or limit (`atMost`) from Global Constraints.
    `weekOf(weeks: Week[], date: string): Week | null`.
  - `backfill.ts`: `BACKFILL_DAYS = 3`;
    `backfillDates(today: string, startDate: string): string[]` — today and the 3 days before,
    newest first, keeping only dates ≥ `startDate` and in today's month.
    `canLog(date: string, today: string, startDate: string): boolean`.

- [ ] **Step 1: Write failing tests**

```ts
it('addDays crosses months and years', ...) // addDays('2026-10-31', 1) = '2026-11-01'; addDays('2027-01-01', -1) = '2026-12-31'
it('weekday', ...) // weekday('2026-10-12') = 1 (Monday); weekday('2026-11-01') = 0
// October 2026 starts on a Thursday; Monday weeks: Oct 1–4 (4 days), 5–11, 12–18, 19–25, 26–31 (6 days)
it('clips Monday weeks to the month and prorates atLeast round-half-up', ...) // N=3 days: required [2, 3, 3, 3, 3] (3×4/7=1.71→2, 3×6/7=2.57→3)
it('caps days mode at the days in the week', ...) // atLeast/week/days N=7 started Oct 31 (1-day stub) → [{ start:'2026-10-31', end:'2026-10-31', days: 1, required: 1 }]
it('limits round up for atMost', ...) // atMost/week/times N=2: Oct 1–4 → ceil(8/7)=2; started Oct 31 → ceil(2/7)=1
it('Sunday weeks', ...) // weekStartsOn sunday, start Oct 1: first week Oct 1–3 (3 days)
it('a card started on a Sunday with Monday weeks', ...) // start Oct 18 → first week Oct 18–18 (1 day), then Oct 19–25
it('backfillDates is today and 3 days before, inside the span and month', ...) // ('2026-10-20','2026-10-01') = ['2026-10-20','2026-10-19','2026-10-18','2026-10-17']; ('2026-10-20','2026-10-19') = ['2026-10-20','2026-10-19']; ('2026-11-02','2026-10-01') = ['2026-11-02','2026-11-01']
it('canLog', ...) // inside → true; 4 days ago, before start, future, other month → false
```

- [ ] **Step 2: Run to verify failure.** **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run --coverage` → pass, 100% branches in `src/lib/game`.
- [ ] **Step 5: Commit, PR, CI green, merge.**

---

### Task 2: Square evaluation and the Today grouping (pure)

**Branch:** `feat/square-states`

**Files:**

- Create: `src/lib/game/evaluate.ts`, `evaluate.spec.ts`, `src/lib/game/today.ts`, `today.spec.ts`
- Modify: `src/lib/game/card-layout.ts` (remove `initialSquareState`, replaced by `evaluateSquare`)

**Interfaces:**

- Consumes: Task 1 (`clippedWeeks`, `weekOf`, `backfillDates`, `addDays`); `HabitRule`.
- Produces:
  - `type Counts = ReadonlyMap<string, number>` (date → count).
  - `type CardSpan = { startDate: string; weekStartsOn: 'monday' | 'sunday' }`.
  - `evaluateSquare(rule: HabitRule, span: CardSpan, counts: Counts, today: string): { state: SquareState; progress: number }`
    — the §3.5 tables (Global Constraints); `progress` is `min(k, N) / N` for earn squares and 0
    otherwise. Dates after `today` are ignored.
  - `type TodaySection = 'doToday' | 'done' | 'anytime' | 'slip'`
  - `todaySection(rule: HabitRule, span: CardSpan, counts: Counts, day: string): TodaySection` —
    `atMost` → `slip`; `atLeast/month` → `anytime`; `atLeast/day` → `done` when `day` is met,
    else `doToday`; `atLeast/week` → `done` when `day`'s week has met its requirement, else
    `doToday`.
  - `progressText(rule: HabitRule, span: CardSpan, counts: Counts, day: string, today: string): string`
    — `atLeast/day`: "{count}/{N} today" ("… on {Weekday}" for an earlier day);
    `atLeast/week`: "{k} of {required} this week"; `atLeast/month`: "{k} of {N} this month";
    `atMost/day`: "{count} of {N} today"; `atMost/week`: "{k} of {limit} this week";
    `atMost/month`: "{k} of {N} this month". `k` is progress by count mode.

- [ ] **Step 1: Write failing tests**

```ts
// evaluate.spec.ts — span starts 2026-10-01, Monday weeks, unless noted
it('earn: empty, inProgress with progress, complete', ...) // atLeast/month/days N=4: {} → empty; 2 dates → inProgress, 0.5; 4 dates → complete, 1
it('earn counts times or days by count mode', ...) // two check-ins on one date: times k=2, days k=1
it('atLeast/day: held, atRisk for a missed day in the window, lost once it leaves', ...) // N=1 today Oct 20: all met → held; Oct 18 missing → atRisk; Oct 15 missing → lost; today missing alone → held
it('atLeast/week: atRisk when days left ≤ shortfall; lost when a past week stayed short', ...) // N=3 days, earlier weeks met, today Sat Oct 24 (2 days left incl. today): 1 logged this week → atRisk (short 2 ≤ 2); 2 logged → held (short 1 < 2). Week Oct 5–11 short, today Oct 20 → lost; week Oct 12–18 short, today Oct 20 → atRisk (its last day is in the window)
it('atMost/day: atRisk at the limit today, lost over it any day', ...)
it('atMost/week and month: atRisk at the limit, lost over it', ...) // limit 0: any slip → lost (Review Focus 5 incl. clipped stub week limit)
it('a removed slip restores the square', ...) // counts without the offending date → held
it('ignores dates after today', ...)
// today.spec.ts
it('groups rows into doToday, done, anytime and slip', ...)
it('progress text', ...) // "5/8 today", "2 of 3 this week", "4 of 10 this month", "1 of 2 this week", "0 of 1 today", "3/8 on Sunday"
```

- [ ] **Step 2: Run to verify failure.** **Step 3: Implement**; update the two callers of
      `initialSquareState` to `evaluateSquare` with empty counts until Task 3 wires real ones.
- [ ] **Step 4: Run** `npx vitest run --coverage` → pass, 100% game branches.
- [ ] **Step 5: Commit, PR, CI green, merge.**

---

### Task 3: Check-in table, service, and live squares on the card

**Branch:** `feat/check-ins`

**Files:**

- Create: `src/lib/server/db/schema/check-ins.ts`, `drizzle/0008_check_ins.sql` (generated),
  `src/lib/server/check-ins.ts`, `check-ins.spec.ts`
- Modify: `src/lib/server/db/schema.ts`, `src/routes/(app)/card/+page.server.ts`

**Interfaces:**

- Consumes: Task 1 `canLog`; Task 2 `evaluateSquare`; M3 `getCard`, `currentMonth`, `Card`;
  `localDate`.
- Produces:
  - Table `check_in`: `id` text pk, `square_id` → card_square **cascade**, `date` text, `count`
    integer CHECK 1–20, `updated_at`; unique (`square_id`, `date`).
  - `MAX_COUNT = 20`
  - `getCheckIns(db: Db, cardId: string): Promise<Map<string, Map<string, number>>>` (square id →
    date → count).
  - `logCheckIn(db: Db, user: { id: string; timezone: string }, squareId: string, date: string, delta: 1 | -1, now: Date): Promise<{ ok: true; count: number } | { ok: false; field: 'date'; message: string } | null>`
    — `null` when the square isn't a habit square on the person's current-month card (route → 404);
    `canLog(date, today, card.startDate)` else field `date`, "You can only log today and the 3 days
    before."; +1 is a single upsert `count = least(count + 1, 20)`; −1 decrements and deletes at 0.
  - `/card` load evaluates every habit square with `evaluateSquare(…, getCheckIns(…), today)` and
    passes `progress` to the board.

- [ ] **Step 1: Write failing tests**

```ts
it('adds one per tap and removes at zero', ...) // +1 +1 → 2; −1 −1 → 0 and no row; −1 at 0 → 0
it('stops at 20', ...)
it('counts every simultaneous tap', ...) // Review Focus 2: Promise.all of 5 × +1 → 5
it('refuses dates outside the window or the span', ...) // Review Focus 1: 4 days ago, before startDate, tomorrow
it('another person\'s square, the center square or last month\'s card is not found', ...) // Review Focus 3 → null
it('uses the person\'s own today', ...) // Kiritimati at 2026-10-31T11:30Z is on Nov 1: an October square → null (no current card)
it('editing the card keeps kept squares\' check-ins and drops the rest', ...) // Review Focus 4 (updateCard), and a lowered target turns the square complete
```

- [ ] **Step 2: Run to verify failure.** **Step 3: Implement**; `npx drizzle-kit generate --name check_ins`.
- [ ] **Step 4: Run** `npx vitest run` and `npx playwright test e2e/card.e2e.ts` → pass.
- [ ] **Step 5: Commit, PR, CI green (preview smoke runs the migration), merge.**

---

### Task 4: The Today screen

**Branch:** `feat/today`

**Files:**

- Create: `src/lib/components/TodayRow.svelte`, `TodayRow.svelte.spec.ts`,
  `src/lib/components/DaySwitcher.svelte`, `DaySwitcher.svelte.spec.ts`, `e2e/today.e2e.ts`
- Modify: `src/routes/(app)/today/+page.server.ts`, `+page.svelte`, `e2e/sign-in.e2e.ts` and any
  E2E that asserts the old Today copy

**Interfaces:**

- Consumes: Task 1 `backfillDates`; Task 2 `todaySection`, `progressText`, `evaluateSquare`;
  Task 3 `getCheckIns`, `logCheckIn`.
- Produces:
  - Today load: `?day=YYYY-MM-DD` (default today; anything outside `backfillDates` → today);
    returns `{ monthName, card: null }` or `{ day, days, sections: Record<TodaySection, Row[]> }`
    where `Row = { squareId, emoji, name, state, progress, text, count }` (`count` = that day's).
  - Actions `log` and `unlog` (fields `squareId`, `date`; carry `?day=`): `requireUser`;
    `logCheckIn` → `null` 404, refusal → `fail(400, { message })`.
  - `TodayRow.svelte` props `{ row: Row; day: string; keep: string }`: emoji square
    (`BingoSquare`), name, progress text, a **+** button ("Log {name}") and, when `count > 0`, a
    **−** button ("Undo one {name}"); both plain form posts.
  - `DaySwitcher.svelte` props `{ days: string[]; selected: string; today: string }`: links
    labelled "Today", "Yesterday", then weekday names; the selected one `aria-current="date"`.
  - Page: headings "Do today", "Anytime this month", "Log a slip", and a `<details>` "Done (n)";
    "All done today 🎉" when Do today is empty; no card → "No card yet." + "Build one".

- [ ] **Step 1: Write failing tests**

```ts
// components
it('TodayRow names its buttons and shows the progress text', ...)
it('TodayRow hides − when nothing is logged that day', ...)
it('DaySwitcher labels today, yesterday and weekdays and marks the selected day', ...)
// e2e/today.e2e.ts (setClock to a fixed October day; card built through the UI)
test('a new card fills the Today sections', ...)
test('logging moves a day habit to Done and back with undo', ...)
test('earlier days are reachable and logging there counts', ...)
test('the 4th day back is not offered and a forged post is refused', ...) // Review Focus 1 (route)
test('Today works without JavaScript', ...)
test('all done today', ...)
test('no card yet', ...)
```

- [ ] **Step 2: Run to verify failure.** **Step 3: Implement.** **Step 4: Run all tests.**
- [ ] **Step 5: Commit, PR, CI green, merge.**

---

### Task 5: Pop & burst and optimistic logging

**Branch:** `feat/pop-and-burst`

**Files:**

- Create: `src/lib/celebrate.ts` (+ spec), `src/lib/components/Toast.svelte` (+ spec)
- Modify: `package.json` (add `canvas-confetti` + its types), `TodayRow.svelte` (+ spec),
  `src/routes/(app)/today/+page.svelte`, `e2e/today.e2e.ts`

**Interfaces:**

- Produces:
  - `celebrate.ts`: `burst(origin: { x: number; y: number }, reducedMotion: boolean): void` —
    `canvas-confetti` from the button's position (small, ~24 particles), nothing when
    `reducedMotion`; `tap(): void` — `navigator.vibrate?.(10)`.
  - `TodayRow` enhances its forms: the count and progress update optimistically; the square
    squishes (scale 0.9) and springs back (Svelte `spring`), or fades under reduced motion; on a
    server refusal or network error the row rolls back and a toast shows the message (or "Couldn't
    save that. Try again.").
  - `Toast.svelte` props `{ message: string | null }`: a polite `role="status"` region that hides
    after 4 s.

- [ ] **Step 1: Write failing tests**

```ts
it('burst does nothing under reduced motion', ...) // confetti spy not called
it('tap vibrates where supported and is silent elsewhere', ...)
it('TodayRow updates the count before the server answers', ...)
it('TodayRow rolls back and announces a refusal', ...)
test('logging updates instantly and survives a reload', ...) // e2e
test('a refused log rolls back with a message', ...) // e2e: setClock forward past the day, then tap
test('reduced motion: no confetti canvas', ...) // e2e with reducedMotion: 'reduce'
```

- [ ] **Step 2: Run to verify failure.** **Step 3: Implement.** **Step 4: Run all tests.**
- [ ] **Step 5: Commit, PR, CI green, merge.**

---

### Task 6: Ship it

**Branch:** none (release only)

- [ ] Confirm production `/api/health` is `ok/ok` after Task 5 merges (migration `0008` ran).
- [ ] With the human partner on production (phone): log habits on Today, undo one, log yesterday,
      check the card's square states, and feel the Pop & burst.
- [ ] Move issues still open on milestone "M4: Today & check-ins" (#40, #50) to M5 unless fixed;
      close M4; approve and merge the release-please PR (`v0.5.0`).
