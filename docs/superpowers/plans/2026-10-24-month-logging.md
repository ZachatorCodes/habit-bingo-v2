# Log Any Day This Month Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Strict TDD:** every step that changes behaviour starts with a test that you run and watch fail. Load superpowers:test-driven-development before you start.

**Goal:** Let people log any day of the current month (plus last month's remaining days on the 1st–3rd) from a month calendar in the habit sheet, and show habit names on every card square.

**Architecture:**

- **Pure rules:** two functions in `src/lib/game/backfill.ts`, `loggableDates` and a reworked `canLog`, plus a new "settled before" date the evaluator uses. These replace the 3-day window everywhere it means "can I still log this".
- **Calendar layout:** a pure `monthGrid` in `src/lib/game/month-grid.ts` lays out the weeks.
- **Calendar component:** `MonthCalendar.svelte` renders the grid and replaces the history list in `HabitSheet`.
- **Card names:** a `line-clamp-2` name on compact squares.

**Tech Stack:** SvelteKit 2, Svelte 5, Tailwind v4, Vitest (100% coverage gate on `src/lib/game`), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-24-month-logging-design.md` (the authority).

## Global Constraints

- **Loggable date:** `date >= card.startDate && date <= today` and the card's month is open. The current month is always open; the previous month is open only on the 1st–3rd. `BACKFILL_DAYS = 3` keeps only its "grace after month end" meaning.
- **Settling:** days become final only when their month closes, on the 4th.
  - "At least" protect squares with a missed past day are `atRisk` while the month is open, then `lost` after it closes.
  - "At most" over the limit is `lost`, but becomes un-lost when the slip is removed.
- **Unchanged:** month close, recaps, leaderboards and points (beyond these state rules); the Today day chips, which stay limited to today plus up to 3 earlier loggable days.
- **Calendar:**
  - Weeks start on the user's `weekStartsOn`.
  - Day cells use `role="grid"` and are named "{Weekday} {Month} {d}, {n} logged" / "not logged" / "can't log".
  - Arrow keys move between days, and Home/End go to the week's edges.
  - Cells are ≥ 44px, and text is ≥ 12px.
  - On the habit page, the selected day is `?day=YYYY-MM-DD` (it works without JavaScript); in the panel, selection is client-side.
  - The selected-day controls read "{Weekday}, {Mon} {d}: {n} logged".
- **Card names:** on compact squares (5×5 below 768px), use the `sm` ring plus the name at 12px with `line-clamp-2`. 3×3 squares and wide screens are unchanged.
- **Garden UI rules apply.** The phone UI changes only where this spec says so.
- **Before committing:** `npm run check`, plus `npx prettier --check` and `npx eslint` on the touched files.

## Review Focus

1. **Month boundaries:** for a card started on the 20th, logging the 19th is refused. On Nov 2, Oct 31 is loggable; on Nov 4 it isn't. Test: Task 1 `canLog` cases, plus Task 3 e2e "on the 2nd last month is loggable, on the 4th it is not".
2. **Weekly "at least" squares across the close:** a week missed on Oct 8 must read `atRisk` on Oct 24 and `lost` on Nov 4 — not `held`, and not `lost` early. Test: Task 1 evaluator case.
3. **Week start:** a month starting on a Sunday with `weekStartsOn: 'monday'` gets 6 leading blanks; with `'sunday'` it gets 0. Test: Task 2 `monthGrid` cases.
4. **A crafted `?day=`:** a future, malformed or closed-month date in the URL shows today selected, not an error. Test: Task 3 e2e "a bad day parameter falls back to today".
5. **Long names on 5×5 at 360px:** a 40-character unspaced name clamps without widening the board. Test: Task 4 e2e at 360px with `expectNoHorizontalScroll`.

---

### Task 1: Rules — loggable days and settling

**Files:**

- Modify: `src/lib/game/backfill.ts`, `src/lib/game/evaluate.ts`, `src/lib/game/nudges.ts` (only if it relied on the 3-day "missed" window; keep its behaviour aimed at the Today chips), `src/lib/server/check-ins.ts`
- Test: `src/lib/game/backfill.spec.ts`, `src/lib/game/evaluate.spec.ts`, `src/lib/server/check-ins.spec.ts`

**Interfaces:**

- Produces:
  - `loggableDates(today: string, startDate: string): string[]` returns every loggable date of that card, newest first.
  - `canLog(date: string, today: string, startDate: string): boolean` becomes `loggableDates(...).includes(date)`.
  - `settledBefore(today: string, cardMonth: string): string` returns the first day that can still change. For an open month that is the month's first day (nothing is settled); for a closed month it is the day after the month's end.
  - `backfillDates` is unchanged (the Today chips) but is filtered by `canLog`.

- [ ] **Step 1: Write the failing tests.**
  - `backfill.spec.ts`:
    - `loggableDates('2026-10-24', '2026-10-01')` has 24 dates.
    - With `startDate '2026-10-20'`, it gives `['2026-10-24', …, '2026-10-20']`.
    - `canLog('2026-10-31', '2026-11-02', '2026-10-01')` is true, but on `'2026-11-04'` it's false.
    - `canLog('2026-10-25', '2026-10-24', …)` (the future) is false.
    - `settledBefore('2026-10-24', '2026-10')` is `'2026-10-01'`, and `settledBefore('2026-11-04', '2026-10')` is `'2026-11-01'`.
  - `evaluate.spec.ts`:
    - "an at-least daily square missed 10 days ago is atRisk while the month is open": with a check-in on every day except Oct 14 and today Oct 24, the state is `atRisk`.
    - The same counts evaluated on Nov 4 give `lost`.
    - The weekly case from Review Focus 2.
    - "an at-most square recovers when its slip is removed": the over-limit counts give `lost`; with the slip removed, `held`.
  - `check-ins.spec.ts`: `logCheckIn` on a date 12 days ago succeeds, and on tomorrow it is refused with the existing error.
- [ ] **Step 2: Run** `npx vitest run src/lib/game/backfill.spec.ts src/lib/game/evaluate.spec.ts src/lib/server/check-ins.spec.ts`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.**
  - **`evaluate.ts`:** `protectState` uses `settledBefore(today, monthOf(span.startDate))` in place of `addDays(today, -BACKFILL_DAYS)`.
  - **`check-ins.ts`:** `checkLoggable` uses the new `canLog`. Keep its month lookup on `backfillMonths`, which is unchanged.
  - **Existing tests:** update any that assumed 3-day settling to the new rule. Each such update counts as a ruling — list them in your report.
- [ ] **Step 4: Run** `npx vitest run --coverage src/lib/game src/lib/server/check-ins.spec.ts`. Expected: PASS, with `src/lib/game` at 100%.
- [ ] **Step 5: Commit** `feat(rules): log any day this month; days settle at month close`.

### Task 2: Month grid and calendar component

**Files:**

- Create: `src/lib/game/month-grid.ts` and `.spec.ts`, `src/lib/components/MonthCalendar.svelte` and `.svelte.spec.ts`

**Interfaces:**

- Produces:
  - `monthGrid(month: string, weekStartsOn: 'monday' | 'sunday'): (string | null)[][]` returns weeks of 7 cells, with `null` for blanks.
  - `MonthCalendar.svelte` props:

    ```ts
    {
      month: string;
      weekStartsOn: 'monday' | 'sunday';
      today: string;
      selected: string;
      days: Record<string, { count: number; loggable: boolean }>;
      direction: 'atLeast' | 'atMost';
      href?: (date: string) => string;
      onselect?: (date: string) => void;
    }
    ```

    With `href` set, cells render as links (the no-JavaScript path); otherwise as buttons calling `onselect`.

- [ ] **Step 1: Write the failing tests.**
  - `month-grid.spec.ts`:
    - October 2026 (it starts on a Thursday) with monday weeks: the first row is `[null, null, null, '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']`.
    - With sunday weeks: the first row starts with 4 nulls.
    - Every row has length 7.
    - The last row ends with nulls after `'2026-10-31'`.
    - Review Focus 3: November 2026 starts on a Sunday, so monday weeks give 6 leading nulls and sunday weeks give 0.
  - `MonthCalendar.svelte.spec.ts`:
    - The grid has role `grid`.
    - The cell for Oct 22 with count 1 is named "Wednesday October 22, 1 logged".
    - A non-loggable day is named "…, can't log" and is disabled.
    - ArrowRight from the 22nd focuses the 23rd, and ArrowDown focuses the 29th.
    - Clicking a loggable day calls `onselect('2026-10-22')`.
    - With `href`, the cells are links to `href(date)`.
    - An "at most" logged day carries `data-slip`.
- [ ] **Step 2: Run** `npx vitest run src/lib/game/month-grid.spec.ts src/lib/components/MonthCalendar.svelte.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** both. Cell visuals:
  - **Logged:** a forest dot, or terracotta for "at most", with the count when > 1.
  - **Today:** an outlined ring.
  - **Selected:** forest fill with white text.
  - **Not loggable:** muted text.
  - **Sizing:** cells at least 44px. A 7-column grid fits a 358px sheet (7 × 44 + 6 × 4 = 332).
- [ ] **Step 4: Run** the same tests, plus `npx vitest run --coverage src/lib/game`. Expected: PASS, with coverage at 100%.
- [ ] **Step 5: Commit** `feat(calendar): month grid and calendar component`.

### Task 3: Calendar in the habit sheet; open from Today

**Files:**

- Modify: `src/lib/components/HabitSheet.svelte` (replace the history list), `src/routes/(app)/card/squares/[id]/+page.server.ts` (+ `.svelte`), `src/routes/(app)/today/+page.svelte` (row name links to the sheet), `src/lib/components/TodayRow.svelte`
- Test: `e2e/habit-sheet.e2e.ts`, `e2e/today.e2e.ts`, `e2e/next-month.e2e.ts` (month-boundary cases)

**Interfaces:**

- Consumes: from Task 1, `loggableDates` and `canLog`; from Task 2, `MonthCalendar`.
- Produces:
  - The square page load returns `calendar: { month; weekStartsOn; today; selected; days }`.
  - `selected` is `?day=` when `canLog(day, today, start)` holds; otherwise it is today (Review Focus 4).
  - The existing log and set actions keep their `date` field.

- [ ] **Step 1: Write the failing e2e tests.**
  - `habit-sheet.e2e.ts`:
    - **"log a day 10 days ago from the calendar":** open a square, pick that date's cell, press "+", and the cell reads "1 logged". The board square's state or progress updates (check its `aria-label`).
    - **"future days are disabled".**
    - **"a bad day parameter falls back to today":** for each of `?day=2099-01-01`, `?day=nope` and `?day=<last month on the 10th>`, the selected-day heading shows today, and the status is 200.
    - **"calendar logging works without JavaScript":** a `newMemberWithoutJs` context follows the day link and submits "+".
  - `today.e2e.ts`: **"a Today row opens the habit sheet":** clicking the habit name opens the sheet (a dialog with JavaScript, or the page), showing the calendar.
  - `next-month.e2e.ts`: **"on the 2nd last month is loggable, on the 4th it is not"**, using `setClock`.
  - Also add a check that deleting an old "at most" slip brings back a lost square: the square is lost after a slip 8 days ago; deleting it in the calendar makes it Protected again.
- [ ] **Step 2: Run** `npx playwright test e2e/habit-sheet.e2e.ts e2e/today.e2e.ts e2e/next-month.e2e.ts`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.**
  - **Load:** `days` covers every date of the card's month, with its count and `loggable` from `canLog`.
  - **HabitSheet:**
    - It renders `MonthCalendar` in place of History.
    - Under the calendar, it shows the selected day's controls with the exact copy.
    - On the page, `href = (d) => ?day=d`; in the panel, `onselect` keeps the selection in local state, and the existing `onnavigate` refresh keeps working after a log.
  - **Today:** the habit name in each row becomes a link to `/card/squares/[id]`. It opens in the panel the same way board squares do on Today at ≥1024px, and is a normal link below that. The "+" is unchanged.
- [ ] **Step 4: Run** `npx playwright test e2e/habit-sheet.e2e.ts e2e/today.e2e.ts e2e/next-month.e2e.ts e2e/card.e2e.ts e2e/wide.e2e.ts`. Expected: all pass.
- [ ] **Step 5: Commit** `feat(sheet): month calendar to log any day`.

### Task 4: Names on 5×5 squares

**Files:**

- Modify: `src/lib/components/BingoSquare.svelte`, `src/lib/components/CardBoard.svelte` (if it passes `showLabel={false}` for compact)
- Test: `src/lib/components/BingoSquare.svelte.spec.ts`, `e2e/card.e2e.ts`

- [ ] **Step 1: Write the failing tests.**
  - **BingoSquare spec:** compact squares render the name text.
  - **`card.e2e.ts`, "5×5 names show on a phone":** at 360×740, on a 5×5 card where one habit has a 40-character unspaced name:
    - every square's name text is visible;
    - that name's element `scrollHeight` is at most 2 lines;
    - `expectNoHorizontalScroll` passes (Review Focus 5).
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement.** Compact squares always show the label at `text-xs` (12px) with `line-clamp-2` and `break-all`, using the `sm` ring.
- [ ] **Step 4: Run** `npx playwright test e2e/card.e2e.ts e2e/wide.e2e.ts` and the component specs. Expected: PASS.
- [ ] **Step 5: Commit** `feat(card): habit names on 5×5 squares`.

### Task 5: Verify and ship

- [ ] **Step 1: Run** `npm run check`, `npx eslint src e2e`, `npx vitest run --coverage` and `npx playwright test`. Expected: all green, and the `src/lib/game` gate is met. Rerun alone any PGlite "Hook timed out" flake.
- [ ] **Step 2: Do** a final whole-branch review, then one fix pass. Each fix gets a failing test first.
- [ ] **Step 3: Push** `feat/month-logging` and open the PR "feat: log any day this month from a calendar; names on every card". The owner merges.
