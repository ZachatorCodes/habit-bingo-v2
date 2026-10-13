# M5: Card View & Scoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The card becomes the place to see and play the game: named squares with soft state tints
and border styles, a header with lines, reward tiers and points, a habit sheet for logging any
recent day, and a BINGO celebration when a line completes.

**Architecture:** Lines, tiers and points (spec §3.6–§3.7) are pure functions in `src/lib/game`
(100% branch coverage) computed from the square evaluations M4 already produces. Each square links
to `/card/squares/[id]`, a real page that works without JavaScript; with JavaScript, SvelteKit
shallow routing (`preloadData` + `pushState`) shows the same content as the habit sheet over the
card. Logging in the sheet goes through the M4 check-in service, plus a `setCheckIn` for the days
toggle.

**Tech Stack:** SvelteKit 3 (shallow routing), Svelte 5 runes, Drizzle (PGlite in tests),
Vitest 4, Playwright, `canvas-confetti`.

**Spec:** `docs/superpowers/specs/2026-10-09-habit-bingo-v2-design.md` (§3.5–§3.7, §4 visual
direction, §4.6, §4.7, §6) — incl. the card redesign amendment of 2026-10-13.

## Global Constraints

- Everything in the M0–M4 plans' Global Constraints still applies, except that states are now
  shown by **colour plus border style** (no corner icons), per the amended §4.
- **Counting (spec §3.5):** a square counts when it is `complete`, `held` or `atRisk`; the center
  counts when `complete`.
- **Lines and tiers (spec §3.6):** every row, column and both diagonals (3×3: 8, 5×5: 12); a line is
  complete when all its squares count. Tiers: `bingo` (≥ 1 complete line), `sixtyPercent` (counting
  squares ≥ 5 on 3×3, ≥ 15 on 5×5, center included), `blackout` (all squares count). Tiers are
  live and can drop.
- **Points (spec §3.7):** base 10 per square. Earn `10 × min(k, N) / N`; `atLeast/day`
  `10 × Σ min(count_d, N) / (N × span days)` over span dates; `atLeast/week`
  `10 × Σ min(k_w, N_w) / Σ N_w` over clipped weeks (10 when `Σ N_w = 0`); `atMost` 10 while
  `held`/`atRisk`, 0 when `lost`; center 0. Bonuses +25 per complete line, +100 for blackout.
  Multiplier 3×3 ×1, 5×5 ×2. Round to the nearest integer at the very end. `atLeast` day/week
  squares keep earned points after `lost`. Examples: 3×3 blackout = 380; 5×5 blackout = 1,280.
- **Square look (amended §4):** emoji and name on every square, every size; 5×5 on a phone: smaller
  emoji, name in small bold text, up to 2 lines, "…" beyond. Soft tints with ink text. Borders:
  complete **thick solid**, held **normal solid**, atRisk **dashed**, lost **faded + name struck
  through**, buildNext **dotted**; inProgress shows its progress bar. No corner icons; the
  accessible name says the state in words.
- **Tint values (layout.css):** `--color-earn: #b8ebc6` (edge `#6bd48a`, shadow `#4cb86c`),
  `--color-protect: #c7d9ff` (edge `#7fa8ff`, shadow `#5e8bf0`), `--color-risk: #ffe7a6` (edge
  `#f2b630`, shadow `#d99a12`); `--color-lost` unchanged.
- **Habit sheet (amended §4.6):** bottom sheet on phones (< 640px), centered dialog wider; header
  (emoji, name, category, rule, state in words, progress); day picker over the backfill window
  (Today, Yesterday, weekdays; today selected); **times**: − count + stepper (0–20); **days**:
  "Done that day" toggle; history of this week (week habits) or this month (day/month habits) with
  counts; closes with ✕, Escape or outside tap; focus returns to the square. Logging never happens
  from a grid tap.
- **Celebration (spec §4.7):** when a log completes a new line: the line's squares ripple gold in
  sequence → "BINGO!" banner → full-screen confetti → a reward reveal when a tier unlocks.
  Reduced motion: fades, no confetti.

**Decisions this plan makes:**

- The sheet is a real route (`/card/squares/[id]?day=`) shown with shallow routing, so it works
  without JavaScript, has a URL, and the back button closes it.
- The days toggle uses a new `setCheckIn(…, count)` (turning a day off sets 0, even if Today logged
  it twice); the stepper reuses `logCheckIn` ±1.
- A celebration fires only when the number of complete lines (or a tier) goes **up** as a result
  of a log made in this tab — on the card, in the sheet, or on Today. Nothing is stored; reloading
  never replays it.

## Review Focus

1. **The center square in lines and tiers:** a `buildNext` center doesn't count, so a line through it
   is incomplete until next month's card is built; a `complete` center counts. Pinned in Task 1.
2. **Live drops:** when a square is lost, lines, tiers and points drop at once — and nothing
   celebrates a drop. Pinned in Task 1 and Task 5.
3. **Turning a day off that Today logged twice** (days mode, count 2) sets it to 0, not 1. Pinned in
   Task 4.
4. **Someone else's square** at `/card/squares/[id]`, the center's id, or a square from another
   month → 404. Pinned in Task 4.
5. **Long names on a 5×5 phone card** (40 characters, 390px wide): no horizontal scroll, names cut
   with "…" after 2 lines. Pinned in Task 2.

---

### Task 1: Lines, tiers and points (pure)

**Branch:** `feat/scoring`

**Files:**

- Create: `src/lib/game/score.ts`, `score.spec.ts`

**Interfaces:**

- Consumes: M4 `evaluateSquare`, `clippedWeeks`, `progressBetween`, `CardSpan`, `Counts`;
  `CARD_SIZES`, `CardSize`; `lastDayOf`, `monthOf`.
- Produces:
  - `counts(state: SquareState): boolean` — `complete`, `held`, `atRisk`.
  - `lineIndexes(size: CardSize): number[][]` — rows, columns, then the two diagonals.
  - `completeLines(counting: boolean[], size: CardSize): number[][]` (each line's indexes).
  - `type Tier = 'bingo' | 'sixtyPercent' | 'blackout'`;
    `reachedTiers(counting: boolean[], size: CardSize): Tier[]`.
  - `squarePoints(rule: HabitRule, span: CardSpan, counts: Counts, today: string, state: SquareState): number` (unrounded).
  - `type CardScore = { counting: number; percent: number; lines: number[][]; tiers: Tier[]; points: number }`;
    `scoreCard(size: CardSize, squares: { points: number; state: SquareState }[]): CardScore` —
    `points` rounded once at the end; `percent` = round(100 × counting / squares).

- [ ] **Step 1: Write failing tests**

```ts
it('3×3 has 8 lines and 5×5 has 12', ...)
it('a line is complete only when all its squares count', ...)
it('a buildNext center breaks its lines; a complete center completes them', ...) // Review Focus 1
it('tiers: bingo, 5 / 15 squares, blackout', ...)
it('tiers drop when a square is lost', ...) // Review Focus 2
it('earn points are proportional', ...) // N=4, k=2 → 5
it('atLeast/day points over the whole span', ...) // N=1, 10 of 31 days met → 10×10/31
it('atLeast/week points over clipped weeks, and 10 when nothing is required', ...)
it('atLeast squares keep their points when lost; atMost lose all', ...)
it('blackout totals match the spec examples', ...) // 3×3: 8 squares × 10 + 8 × 25 + 100 = 380; 5×5: 1,280
it('rounds once at the end', ...)
```

- [ ] **Step 2: Run to verify failure.** **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run --coverage src/lib/game` → pass, 100% branches.
- [ ] **Step 5: Commit, PR, CI green, merge.**

---

### Task 2: The new square look

**Branch:** `feat/square-look`

**Files:**

- Modify: `src/lib/components/BingoSquare.svelte` (+ spec), `CardBoard.svelte` (+ spec),
  `SampleCard.svelte`, `src/routes/layout.css`, `e2e/card.e2e.ts`

**Interfaces:**

- Produces:
  - `BingoSquare` props `{ emoji; label; state; progress?; compact?: boolean }`: always shows the
    name (`showLabel` removed); `compact` (5×5 on a phone) shrinks the emoji and uses `text-[10px]`
    names with `line-clamp-2`; `data-state` and border classes per Global Constraints; no corner
    markers; `role="img"` and `aria-label="{label}: {state in words}"` unchanged.
  - `CardBoard` passes `compact` for 5×5 below the `sm` breakpoint (CSS only: names always render).
  - Tints updated in `layout.css` to the Global Constraints values.

- [ ] **Step 1: Write failing tests**

```ts
it('every state has its border style and no corner icon', ...) // data-state + class contains border-[3px]/border-dashed/border-dotted/opacity; no ✓🛡⚠✗ text
it('always shows the name, struck through when lost', ...)
it('compact squares clamp the name to two lines', ...)
test('a 5×5 card with long names fits a phone', ...) // e2e: 390px, 24 habits named 40 chars → no horizontal scroll (Review Focus 5)
```

- [ ] **Step 2: Run to verify failure.** **Step 3: Implement.** **Step 4: Run all tests.**
- [ ] **Step 5: Commit, PR, CI green, merge.**

---

### Task 3: The card header

**Branch:** `feat/card-header`

**Files:**

- Create: `src/lib/components/CardHeader.svelte` (+ spec)
- Modify: `src/routes/(app)/card/+page.server.ts`, `+page.svelte`, `e2e/card.e2e.ts`

**Interfaces:**

- Consumes: Task 1 `squarePoints`, `scoreCard`, `counts`; M4 `evaluateSquare`, `getCheckIns`;
  M3.1 `centerState`.
- Produces:
  - `/card` load adds `score: CardScore` (center: points 0, its `centerState`).
  - `CardHeader` props `{ monthName; score: CardScore; size: CardSize; rewards: Rewards }`: h1
    "{Month} card", "{percent}% counting", "{n} bingo(s)", "{points} points", and three tier chips
    — "Bingo", "{5|15} squares", "Blackout" — each with its reward text; a reached tier shows
    "✓ Reached" in text and the earn tint.

- [ ] **Step 1: Write failing tests**

```ts
it('shows percent, bingos and points', ...) // "44% counting", "1 bingo", "2 bingos", "120 points"
it('marks reached tiers in text, not colour alone', ...)
test('the header reflects check-ins', ...) // e2e with setClock: log on Today → card header points go up
```

- [ ] **Step 2: Run to verify failure.** **Step 3: Implement.** **Step 4: Run all tests.**
- [ ] **Step 5: Commit, PR, CI green, merge.**

---

### Task 4: The habit sheet

**Branch:** `feat/habit-sheet`

**Files:**

- Create: `src/routes/(app)/card/squares/[id]/+page.server.ts`, `+page.svelte`,
  `src/lib/components/HabitSheet.svelte` (+ spec), `src/lib/components/Sheet.svelte` (+ spec),
  `e2e/habit-sheet.e2e.ts`
- Modify: `src/lib/server/check-ins.ts` (+ spec), `CardBoard.svelte`,
  `src/routes/(app)/card/+page.svelte`

**Interfaces:**

- Consumes: M4 `logCheckIn`, `getCheckIns`, `backfillDates`, `evaluateSquare`, `progressText`,
  `clippedWeeks`; `describeRule`; `CATEGORIES`.
- Produces:
  - `setCheckIn(db, user, squareId, date, count: number, now): Promise<{ ok: true; count: number } | { ok: false; field: 'date'; message: string } | null>`
    — same ownership and window rules as `logCheckIn`; `count` clamped 0–20; 0 deletes.
  - `/card/squares/[id]` load (`?day=`): the square (404 for anyone else's, the center, or another
    month's), its evaluation, `stateText` ("Protected", "At risk: 1 more by Sunday", "Lost",
    "Complete", "In progress", "Not started"), progress text, `days` (backfill window), `day`,
    the day's count, and `history: { date: string; count: number }[]` (this week for week habits,
    this month to today for day/month habits). Actions `log`, `unlog`, `set` (field `count`),
    redirecting back to the sheet's own URL.
  - `HabitSheet.svelte` props = that page data: header, `DaySwitcher`-style day chips linking
    `?day=`, the stepper ("Remove one" / count / "Add one") for `times` or a "Done that day" toggle
    button (`aria-pressed`) for `days`, and the history list ("Mon 19 — 2"). Enhanced like
    `TodayRow` (optimistic, rollback toast, Pop & burst on increase).
  - `Sheet.svelte` props `{ title: string; onclose: () => void; children }`: native `<dialog>`
    opened with `showModal()`; bottom-anchored full-width under 640px, centered card above; ✕
    button "Close"; Escape and backdrop click close; focus returns to the opener.
  - `CardBoard` squares become links to `/card/squares/{id}`; the card page intercepts clicks
    (`preloadData` + `pushState(href, { sheet: data })`) and renders `HabitSheet` inside `Sheet`
    from `page.state.sheet`; closing calls `history.back()`. Without JS the link opens the page.

- [ ] **Step 1: Write failing tests**

```ts
it('setCheckIn sets, clamps and deletes at zero', ...)
it('turning a day off that was logged twice sets it to zero', ...) // Review Focus 3
it('Sheet traps focus, closes on Escape and returns focus', ...)
it('HabitSheet shows a stepper for times habits and a toggle for days habits', ...)
test('tapping a square opens its sheet and the back button closes it', ...)
test('logging another day from the sheet', ...) // Yesterday chip → Add one → history shows it
test('the days toggle marks and clears a day', ...)
test('the sheet works without JavaScript', ...)
test("someone else's square, the center, or last month's square is 404", ...) // Review Focus 4
```

- [ ] **Step 2: Run to verify failure.** **Step 3: Implement.** **Step 4: Run all tests.**
- [ ] **Step 5: Commit, PR, CI green, merge.**

---

### Task 5: BINGO!

**Branch:** `feat/bingo-celebration`

**Files:**

- Create: `src/lib/components/BingoCelebration.svelte` (+ spec), `src/lib/celebrate-lines.ts`
  (+ spec)
- Modify: `src/lib/celebrate.ts` (full-screen confetti), card page, Today page, `HabitSheet`,
  `e2e/habit-sheet.e2e.ts`

**Interfaces:**

- Consumes: Task 1 `CardScore`, `Tier`; Task 3/4 pages.
- Produces:
  - `newlyCompleted(before: CardScore, after: CardScore): { lines: number[][]; tiers: Tier[] }` —
    lines in `after` not in `before`, tiers reached in `after` but not `before`; drops give nothing.
  - `celebrate.ts`: `fullScreenConfetti(reducedMotion: boolean): Promise<void>`.
  - `BingoCelebration` props `{ lines: number[][]; tiers: Tier[]; rewards: Rewards; sixtyThreshold: number; ondone: () => void }`:
    marks each newly complete square for a gold ripple (staggered 80 ms), then a "BINGO!" banner
    (`role="status"`), full-screen confetti, and — when `tiers` isn't empty — a reward reveal
    ("🎉 You earned: {reward}") with a "Nice!" button; reduced motion fades, no confetti.
  - Card, sheet and Today keep the last `CardScore` they rendered and, after each successful log,
    compare it with the new one via `newlyCompleted`.

- [ ] **Step 1: Write failing tests**

```ts
it('newlyCompleted finds new lines and tiers and ignores drops', ...) // Review Focus 2
it('BingoCelebration announces BINGO and reveals the reward for a new tier', ...)
it('reduced motion: no confetti', ...)
test('completing a line from the sheet celebrates once', ...) // e2e: a card one log from a line
test('a reload does not replay it', ...)
```

- [ ] **Step 2: Run to verify failure.** **Step 3: Implement.** **Step 4: Run all tests.**
- [ ] **Step 5: Commit, PR, CI green, merge.**

---

### Task 6: Ship it

**Branch:** none (release only)

- [ ] Confirm production `/api/health` is `ok/ok` after Task 5 merges.
- [ ] With the human partner on production (phone): the new squares, the header, the sheet (log
      another day, the stepper and the toggle), and — when a line completes — the celebration.
- [ ] Move issues still open on milestone "M5: Card view & scoring" (#40, #50) to M6 unless fixed;
      close M5; approve and merge the release-please PR (`v0.6.0`).
