# Garden Redesign PR 2: Core Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Today, the Card (board, header, habit sheet), the card builder and the BINGO!
celebration in the Garden style, on the PR 1 foundation.

**Architecture:** Screens keep their routes, loads, actions and form fields. Each one becomes a
`Hero` banner plus one or more `surface` sheets overlapping it. Squares render through
`ProgressRing`. Two small pure helpers are added to `src/lib/game` (greeting, card progress), and
the rest is markup and styling.

**Tech Stack:** SvelteKit 3 / Svelte 5 runes, Tailwind v4 tokens from PR 1, Vitest (server + browser),
Playwright.

**Spec:** `docs/superpowers/specs/2026-10-16-garden-redesign-design.md` (§2 design system, §3 Today,
Card, Card builder, BINGO!; §6 testing).

## Global Constraints

- Everything in PR 1's Global Constraints still holds (colors, Nunito weights, no text under 11px,
  no hard offset shadows, radii, local Phosphor icons `aria-hidden`, reduced motion, no-JS forms,
  44px targets, WCAG AA). Plan: `docs/superpowers/plans/2026-10-16-garden-pr1-foundation.md`.
- Use the PR 1 pieces, don't re-create them: `Icon`, `ProgressRing` (variants open, progress,
  earned, protected, risk, lost; sizes sm 32 / md 42 / lg 56), `Hero` (title as `<h1>`, summary,
  overlap by 18px), tokens `page surface ink muted line forest leaf leaf-2 terracotta earned-tile
protected-tile protected-ring risk-tile lost-ring`, `shadow-sheet`, radius tokens.
- Sheets: `bg-surface rounded-[24px] shadow-sheet`, overlapping the hero with `-mt-[18px]`.
- Routes, load data, form actions, field names and game behavior do not change. No new features.
- UI tasks load `taste-skill:design-taste-frontend` before writing markup; this spec wins on
  conflict.
- Remove the old-palette leftovers in every file this PR touches: hard `shadow-[0_3px_0_…]`,
  `border-ink` sticker outlines, emoji in copy (🎉 etc.). Old alias tokens (`cream`, `accent`,
  `earn*`, `protect*`, `risk*`, `lost`) are replaced by the Garden names in touched files.
- `.env` is the production DB: never `npm run dev`/`db:migrate`. Verify locally: `npm run check`,
  `npm run lint` (untracked `.impeccable/`, `DESIGN.md`, `PRODUCT.md`, `.claude/` warnings are
  pre-existing), `npx vitest --run --coverage` (`src/lib/game` 100%), `npx playwright test`.

## Review Focus

1. A 5×5 card on a 360px phone must fit without horizontal scroll, with names hidden and rings
   small. Test: Task 1 `a 5×5 compact board fits 360px` (e2e, extends the existing
   `card.e2e.ts` "a 5×5 card with long names fits a phone").
2. Logging stays usable without JavaScript after the restyle: the "+" posts and the page reloads
   with the new count. Test: Task 2 keeps `today.e2e.ts` "Today works without JavaScript" green.
3. A day with nothing left to do (all done or no "Do today" rows) must say so in the hero, not
   show "0 things". Test: Task 2 `summary when nothing is left`.
4. Screen readers still hear each square's name and state; the ring is decorative. Test: Task 1
   `announces name and state, ring hidden`.
5. The habit sheet still traps and restores focus and works as a page without JavaScript
   (`/card/squares/[id]`). Test: Task 3 keeps `habit-sheet.e2e.ts` green.

---

### Task 1: Ring squares on the board

**Files:**

- Modify: `src/lib/components/BingoSquare.svelte`, `CardBoard.svelte`, their `*.svelte.spec.ts`,
  `src/routes/layout.css` (ripple stays forest; remove now-unused square shadow rules if any)

**Interfaces:**

- Consumes: `ProgressRing`, tokens.
- Produces: `BingoSquare` keeps its props (`icon`, `label`, `state`, `progress`, `showLabel`,
  `compact`). State → look:
  - `empty` → tile `page`, ring `open`; `inProgress` → tile `page`, ring `progress` at
    `progress*100`; `complete` → tile `earned-tile`, ring `earned`; `held` → `protected-tile`,
    `protected`; `atRisk` → `risk-tile`, `risk`; `lost` → tile `page`, ring `lost`, name
    `line-through`;
  - `free` → tile `forest`, white "Free" text (800), no ring;
  - `buildNext` → tile `surface` with a 2px dashed `forest` border, `rocket` icon, label
    "Next month".
    Tile radius 18px; ring size `md` (compact: `sm`, name hidden on phones below `sm`). The square
    keeps `role="img"`, `data-state`, and `aria-label="{label}: {stateText}"` (unchanged text).
    An earned square does a soft scale pop (`scale 1 → 1.06 → 1`, 300ms) when it changes to
    `complete`, off under reduced motion.

- [ ] **Step 1: Failing tests** (`BingoSquare.svelte.spec.ts`):

```ts
it.each([
	['empty', 'open'],
	['inProgress', 'progress'],
	['complete', 'earned'],
	['held', 'protected'],
	['atRisk', 'risk'],
	['lost', 'lost']
])('%s renders the %s ring', (state, variant) => {
	const c = render(BingoSquare, { icon: 'drop', label: 'Water', state }).container;
	expect(c.querySelector('[data-variant]')!.getAttribute('data-variant')).toBe(variant);
});
it('announces name and state, ring hidden', () => {
	const { getByRole } = render(BingoSquare, { icon: 'drop', label: 'Water', state: 'held' });
	expect(getByRole('img', { name: 'Water: protected' })).toBeTruthy();
});
it('free shows "Free" and no ring', () => {
	/* text "Free", no [data-variant] */
});
it('lost strikes the name through', () => {
	/* label element has line-through class */
});
```

- [ ] **Step 2: Run** `npx vitest --run src/lib/components/BingoSquare.svelte.spec.ts` → FAIL.
- [ ] **Step 3: Implement** per Interfaces; `CardBoard` keeps its props and the line ripple (now
      forest) and gaps 6px phone / 8px from `sm`.
- [ ] **Step 4: Run** the BingoSquare and CardBoard specs → PASS; `npx playwright test
e2e/card.e2e.ts e2e/bingo.e2e.ts e2e/next-month.e2e.ts` → PASS (update only selectors that pinned
      removed classes).
- [ ] **Step 5: Commit** `feat(card): ring squares on the board`.

### Task 2: Today

**Files:**

- Create: `src/lib/game/greeting.ts`, `greeting.spec.ts`
- Modify: `src/routes/(app)/today/+page.svelte`, `+page.server.ts` (add `name`, `hour` only if not
  already available), `src/lib/components/TodayRow.svelte` (+ spec), `DaySwitcher.svelte`,
  `e2e/today.e2e.ts`, `e2e/recap.e2e.ts` (heading/text selectors only)

**Interfaces:**

- Produces:
  - `greeting(hour: number): 'Good morning' | 'Good afternoon' | 'Good evening'` — hours 5–11
    morning, 12–17 afternoon, else evening.
  - `todaySummary(left: number): string` — `0` → `'All done for today'`, `1` → `'1 thing to do
today'`, `n` → `'{n} things to do today'`. Both in `greeting.ts`.
- Page: `Hero` title `"{greeting(hour)}, {name}"` where `hour` is the user's local hour (server,
  from their timezone and request time) and `name` the display name; summary
  `todaySummary(sections.doToday.length)`; when there is no card, title as above and summary
  "No card yet". The "See your {month} card" link sits in the hero, right-aligned, as a light link.
- One sheet: recap banner and Heads up at the top as one soft tinted card (`earned-tile` for
  recap, `risk-tile` for Heads up, rounded 16px, an icon instead of emoji), then the sections
  "Do today", "This week", "Anytime this month" (and the existing done/slip groups) as 12px 800
  headings with 0.02em tracking and rows divided by 1px `line`.
- `TodayRow`: ring `md` with the habit icon (variant from the row state, as in Task 1), name
  (700, 14.5px), progress text (`muted`, 600, 12px), and the 44px round button: terracotta with a
  white `plus` icon; when the day's target is met, `earned-tile` with a forest `check` icon (the
  undo action, unchanged). Keeps the spring/tap and confetti behavior, the optimistic view, and
  every `aria-label`.
- `DaySwitcher`: pill chips on `surface`, the selected day `forest` with white text.

- [ ] **Step 1: Failing tests** (`greeting.spec.ts`):

```ts
it.each([
	[5, 'Good morning'],
	[11, 'Good morning'],
	[12, 'Good afternoon'],
	[17, 'Good afternoon'],
	[18, 'Good evening'],
	[0, 'Good evening'],
	[4, 'Good evening']
])('greeting(%i) is %s', (h, text) => expect(greeting(h)).toBe(text));
it('summary when nothing is left', () => expect(todaySummary(0)).toBe('All done for today'));
it('summary counts things', () => {
	expect(todaySummary(1)).toBe('1 thing to do today');
	expect(todaySummary(3)).toBe('3 things to do today');
});
```

- [ ] **Step 2: Run** `npx vitest --run src/lib/game/greeting.spec.ts` → FAIL.
- [ ] **Step 3: Implement** `greeting.ts`, then the page, `TodayRow` and `DaySwitcher` per
      Interfaces. Update `today.e2e.ts` line 31 to expect the greeting heading
      (`/^Good (morning|afternoon|evening), /`) and any copy that lost its emoji.
- [ ] **Step 4: Run** `npx vitest --run src/lib/game/greeting.spec.ts src/lib/components/TodayRow.svelte.spec.ts`
      → PASS; `npx playwright test e2e/today.e2e.ts e2e/recap.e2e.ts` → PASS (including "Today works
      without JavaScript").
- [ ] **Step 5: Commit** `feat(today): Garden Today screen`.

### Task 3: Card page and habit sheet

**Files:**

- Modify: `src/lib/game/score.ts` (+ spec), `src/routes/(app)/card/+page.svelte`,
  `+page.server.ts` (only to pass `daysLeft` if not present), `src/lib/components/CardHeader.svelte`,
  `HabitSheet.svelte`, `src/routes/(app)/card/squares/[id]/+page.svelte`, their specs,
  `e2e/card.e2e.ts`, `e2e/habit-sheet.e2e.ts` (selectors only)

**Interfaces:**

- Produces in `score.ts`:
  - `squaresToLine(size: CardSize, states: SquareState[]): number | null` — fewest squares not yet
    counting (complete, held, free count) among lines that contain no `lost` square; `null` when
    every line has a lost square; `0` when a line is already complete.
  - `nextTier(reached: Tier[]): Tier | null` — first of `bingo`, `sixtyPercent`, `blackout` not in
    `reached`.
- Card page: `Hero` title `"{Month} card"` (keeps the existing h1 text so e2e stays), summary
  `"{n} days left"` via `daysLeftInMonth(today)` (`"1 day left"` singular). Sheet: a header row
  with points (800, 26px, forest, tabular numerals, "pts" 11px muted), a line status
  (`squaresToLine` → `0`: "Bingo!", `1`: "1 square from a line", `n`: "{n} squares from a line",
  `null`: "No lines left this month"), and "Next reward: {reward}" from `nextTier` (hidden when
  null). Then the board (Task 1). The existing tier list moves under the board as quiet rows.
- `HabitSheet`: top block = ring `lg` with icon, name (800, 20px), category · rule (muted), the
  state text and progress text; the day log as rows (date left, count right) divided by `line`;
  the stepper/toggle with the terracotta "+" and a quiet minus. `Sheet` behavior unchanged.

- [ ] **Step 1: Failing tests** (`score.spec.ts`), boards are 3×3 index order with center 4 free:

```ts
it('squaresToLine counts the closest line', () => {
	const s = Array(9).fill('empty');
	s[4] = 'free';
	s[0] = 'complete';
	expect(squaresToLine(3, s)).toBe(1); // diagonal 0-4-8 needs 1
});
it('squaresToLine skips lines with a lost square', () => {
	const s = Array(9).fill('lost');
	s[4] = 'free';
	expect(squaresToLine(3, s)).toBeNull();
});
it('squaresToLine is 0 when a line is complete', () => {
	const s = Array(9).fill('empty');
	s[4] = 'free';
	s[3] = 'held';
	s[5] = 'complete';
	expect(squaresToLine(3, s)).toBe(0);
});
it('nextTier returns the first unreached tier', () => {
	expect(nextTier([])).toBe('bingo');
	expect(nextTier(['bingo'])).toBe('sixtyPercent');
	expect(nextTier(['bingo', 'sixtyPercent', 'blackout'])).toBeNull();
});
```

(Build on the existing `lineIndexes(size)` and `counts(state)` in `score.ts`; `CardSize` is
`3 | 5`.)

- [ ] **Step 2: Run** `npx vitest --run src/lib/game/score.spec.ts` → FAIL.
- [ ] **Step 3: Implement** the helpers, then the card page, `CardHeader`, `HabitSheet` and the
      squares page per Interfaces.
- [ ] **Step 4: Run** `npx vitest --run --coverage src/lib/game` → PASS at 100%; the HabitSheet and
      CardHeader specs → PASS; `npx playwright test e2e/card.e2e.ts e2e/habit-sheet.e2e.ts` → PASS.
- [ ] **Step 5: Commit** `feat(card): Garden card page and habit sheet`.

### Task 4: Card builder

**Files:**

- Modify: `src/routes/(app)/card/build/[step]/+page.svelte`, `src/routes/(app)/card/next/+page.svelte`
  (if it renders UI), `src/lib/components/BuilderSteps.svelte`, `SizePicker.svelte`,
  `HabitPicker.svelte`, `TargetList.svelte`, `StarterHabits.svelte` (builder use only), their specs,
  `e2e/card-builder.e2e.ts` (selectors only)

**Interfaces:**

- `Hero` title = the current step's existing heading text (e.g. "Build your October card"), summary
  "Your progress is saved as you go."; `BuilderSteps` renders inside the hero as a slim bar: five
  segments (`leaf-2` todo, white done, white with forest text current), step names below at 12px,
  current step `aria-current="step"`.
- `SizePicker`: two selectable tiles (radio inputs, 44px+), selected = `forest` 2px border +
  `earned-tile` fill + check icon; the 3×3 / 5×5 label 800 20px, details muted.
- `HabitPicker`: habits as selectable rows (checkbox inputs) with icon in a `sm` ring, name and
  rule; selected = forest border + check; the "N of M picked" counter stays.
- `TargetList` and the rewards step: rows on the sheet, inputs use the restyled `TextField`.
- Board step: the preview uses `CardBoard` (Task 1).
- Every form keeps its fields, names and no-JS behavior.

- [ ] **Step 1: Run** the builder component specs and `npx playwright test e2e/card-builder.e2e.ts`
      to record the baseline (all PASS).
- [ ] **Step 2: Implement** per Interfaces; update component specs that pinned removed classes to
      assert roles, names, `checked` state and `aria-current` instead.
- [ ] **Step 3: Run** the builder component specs → PASS; `npx playwright test e2e/card-builder.e2e.ts
e2e/onboarding.e2e.ts` → PASS.
- [ ] **Step 4: Commit** `feat(builder): Garden card builder`.

### Task 5: BINGO! celebration

**Files:**

- Modify: `src/lib/components/BingoCelebration.svelte` (+ spec), `src/lib/celebrate.ts` (confetti
  colors only)

**Interfaces:**

- The banner and the reward reveal become one centered `surface` sheet (24px radius,
  `shadow-sheet`, no ink border or offset shadow): a `trophy` icon in an `lg` earned ring, "BINGO!"
  (800, 36px, forest), the earned rewards as rows ("First bingo — {reward}"), and the forest "Nice!"
  button (unchanged behavior, focus and timing).
- Confetti colors: forest `#2F5D46`, leaf `#4E7E62`, earned tile `#E3ECDD`, terracotta `#D9693F`,
  protected ring `#5B8AA6`. No confetti under reduced motion (unchanged).

- [ ] **Step 1: Failing test** (`BingoCelebration.svelte.spec.ts`): `it('shows BINGO! and each
earned reward', …)` asserting the heading text "BINGO!" and a row per tier; and `it('uses the
Garden confetti palette', …)` asserting `CONFETTI_COLORS` (export it from `celebrate.ts`) equals
      the five values above.
- [ ] **Step 2: Run** the spec → FAIL.
- [ ] **Step 3: Implement** per Interfaces.
- [ ] **Step 4: Run** the spec → PASS; `npx playwright test e2e/bingo.e2e.ts e2e/today.e2e.ts` →
      PASS.
- [ ] **Step 5: Commit** `feat(bingo): Garden celebration`.

### Task 6: Full verification and PR

- [ ] **Step 1:** `npm run check` → 0 errors; `npm run lint` → only the known untracked-file
      warnings.
- [ ] **Step 2:** `npx vitest --run --coverage` → all pass, `src/lib/game` 100%.
- [ ] **Step 3:** `npx playwright test` → all pass (phone + desktop).
- [ ] **Step 4:** Visual pass on the local seeded server (`npm run build && npx tsx
scripts/e2e-server.ts`, sign in as `e2e_member`, build a 3×3 and look at a 5×5 via the builder):
      `/today`, `/card`, a habit sheet, each builder step, at 360px and 1280px. Check: no horizontal
      scroll, no hard shadows, hero overlap, 44px targets, text ≥ 11px. Stop the server by its PID
      only (never kill all node processes).
- [ ] **Step 5:** Push the branch and open the PR (owner merges): title
      `feat(design): Garden core screens (Today, card, builder, BINGO!)`.
