# M3.1: Next-Month Square Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Both card sizes get a center square that stays complete until the last 7 days of the
month, then asks you to build next month's card (and stops counting) until you do; next month's
card can be built and edited from that square.

**Architecture:** The center-square and next-month rules are pure functions in `src/lib/game`
(100% branch coverage). The M3 code is reshaped rather than extended: `freePosition`/`isFree`
become `centerPosition`/`isCenter`, 3×3 becomes 8 habits + center, drafts become one per user per
month, and `startCard` takes a target month. The builder builds next month's card through a
`for=next` query; `/card/next` is the center square's link. E2E gets a test-only clock so the last
7 days and the month change can be exercised.

**Tech Stack:** SvelteKit 3, Svelte 5 runes, Drizzle + Postgres (PGlite in tests), Vitest 4,
Playwright.

**Spec:** `docs/superpowers/specs/2026-10-09-habit-bingo-v2-design.md` (§3.3, §3.5 center square,
§3.7, §4.3, §5.3) — amended on 2026-10-12 for M3.1.

## Global Constraints

- Everything in the M3 plan's Global Constraints still applies, except the sizes, which become:
  **3×3 = 8 habits + center square at index 4; 5×5 = 24 habits + center square at index 12.**
  Multipliers ×1, ×2; middle reward thresholds 5 and 15 squares (the center counts when it counts).
- **Center square (spec §3.5):** no habit, 0 points of its own.
  - Before the last 7 days of the card's month → `complete` (✓), counts.
  - Last 7 days of the month (and the 1st–3rd after), next month's card not built →
    `buildNext` (✏️ "Build {Next month}'s card"), does **not** count.
  - Same period, next month's card built → `complete` (✓ "{Next month} ready"), counts.
  - Tapping it opens the builder for next month's card, or that card in the editor once built.
- **Last 7 days** are user-local: the window opens on day `D − 6` (Oct 25, Nov 24, Feb 22 2026).
- **Next month's card (spec §3.3):** buildable only in that window; starts on the 1st (no
  proration); snapshots habits when built; editable until the end of the 2nd of its month (user-local);
  shown on Today and Card only once its month begins.
- Today and `/card` only ever show the current month's card.
- States always pair colour with an icon or text.

**Decisions this plan makes:**

- A test-only clock: when the server runs with `TEST_CLOCK=1` (set only by `scripts/e2e-server.ts`),
  a `hb_test_now` cookie (ISO instant) overrides "now". Without the env var the cookie is ignored.
  Spec §7.1 already calls for a fake clock in E2E.
- The builder's target is `?for=next` (absent = this month); every builder action carries it, like
  M2's `keep` query. `/card/next` is the center square's link and decides between "build" and "edit".
- `SquareState` gains `buildNext`; the habit-less center uses `complete`/`buildNext`. `free` stays in
  `BingoSquare` only for the landing page's sample card.

## Review Focus

1. **Building next month's card outside the window** (a forged `?for=next` post or URL before day
   `D − 6`) must be refused by the service and redirected by the route. Pinned in Task 3 and Task 4.
2. **Editing this month's card while half-building next month's** must not collide: two drafts,
   two months. Pinned in Task 3.
3. **Next month's card must not appear on Today or `/card` before its month starts** (user-local),
   and must appear on the 1st. Pinned in Task 4 (E2E with the test clock).
4. **The test clock must be inert in production:** without `TEST_CLOCK=1` the cookie changes
   nothing. Pinned in Task 2.
5. **Timezones at the window edge:** a person in `Pacific/Kiritimati` at 2026-10-24T11:00Z (Oct 25
   local) can build November's card; one in `Pacific/Pago_Pago` at the same instant (Oct 24 local)
   cannot. Pinned in Task 3.

---

### Task 1: 3×3 becomes 8 habits + center square

**Branch:** `feat/center-square`

**Files:**

- Modify: `src/lib/game/card-layout.ts` (+ spec), `src/lib/game/square-state.ts`,
  `src/lib/server/db/schema/cards.ts`, `drizzle/0006_center_square.sql` (generated, then edited to a
  column rename), `src/lib/server/cards.ts` (+ spec), `src/lib/server/card-drafts.ts` (+ spec),
  `src/routes/(app)/card/**`, `src/lib/components/CardBoard.svelte` (+ spec),
  `src/lib/components/SizePicker.svelte` (+ spec), `e2e/fixtures.ts`, `e2e/card*.e2e.ts`

**Interfaces:**

- Produces:
  - `CARD_SIZES: Record<CardSize, { habits; squares; multiplier; sixtyThreshold; centerPosition: number }>`
    = `3: 8, 9, 1, 5, 4` · `5: 24, 25, 2, 15, 12`. `shuffleLayout` / `isValidLayout` put `null`
    at `centerPosition` for both sizes.
  - `SquareState` adds `'buildNext'`. `initialSquareState` takes habit squares only
    (`{ direction; period }`) — the center's state comes from Task 2.
  - Column `card_square.is_free` renamed `is_center` (migration renames; no data loss); Drizzle
    field `isCenter`; `CardSquare` union discriminates on `isCenter`.
  - Until Task 4, the center renders as `complete` with label "Free" wherever it rendered `free`.
- Copy: SizePicker "8 habits · ×1" / "24 habits · ×2"; the builder asks for exactly 8 on 3×3.

- [ ] **Step 1: Write failing tests**

```ts
it('sizes match the spec', ...) // CARD_SIZES above, exactly
it('puts the center (null) at index 4 on 3×3 and 12 on 5×5', ...)
it('starts a 3×3 card with 8 habit squares and a center at 4', ...) // cards.spec
it('the migration keeps existing squares', ...) // schema: is_center exists, is_free gone
test('a new member builds and starts a 3×3 card', ...) // e2e: newMemberWithHabits(8), "8 of 8 picked", 9 squares
```

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement**; `npx drizzle-kit generate --name center_square`, then make the SQL a
      `RENAME COLUMN` (and recreate the CHECK naming `is_center`) instead of drop/add.
- [ ] **Step 4: Run** `npx vitest run --coverage` (100% game branches) and the full
      `npx playwright test` → pass.
- [ ] **Step 5: Commit, PR, CI green, merge.**

---

### Task 2: Next-month rules and the test clock

**Branch:** `feat/next-month-rules`

**Files:**

- Create: `src/lib/game/next-month.ts`, `next-month.spec.ts`
- Modify: `src/lib/server/clock.ts` (+ spec), `scripts/e2e-server.ts`, `src/env.ts` (declare
  `TEST_CLOCK`), `e2e/fixtures.ts`

**Interfaces:**

- Produces:
  - `NEXT_MONTH_WINDOW_DAYS = 7`
  - `nextMonthOpens(month: string): string` — day `D − 6` of `month`.
  - `canBuildNextMonth(today: string): boolean` — `today >= nextMonthOpens(monthOf(today))`.
  - `centerState(cardMonth: string, today: string, nextCardBuilt: boolean): 'complete' | 'buildNext'`
    — `complete` while `today < nextMonthOpens(cardMonth)`; afterwards `buildNext` unless built.
  - `clock.ts`: `requestNow(cookies: Cookies, testClock: boolean): Date` — `new Date()` unless
    `testClock` and the `hb_test_now` cookie parses as a date. Every service call that took
    `new Date()` in `(app)/card/**`, `(app)/today` and the builder uses it.
  - `e2e/fixtures.ts`: `setClock(page: Page, iso: string): Promise<void>` (sets the cookie).

- [ ] **Step 1: Write failing tests**

```ts
it.each([['2026-10', '2026-10-25'], ['2026-11', '2026-11-24'], ['2026-02', '2026-02-22'], ['2028-02', '2028-02-23']])('nextMonthOpens %s = %s', ...)
it('canBuildNextMonth opens on day D − 6', ...) // '2026-10-24' false, '2026-10-25' true, '2026-10-31' true, '2026-11-01' false
it('centerState', ...) // ('2026-10','2026-10-24',false)='complete'; ('2026-10','2026-10-25',false)='buildNext'; (…,true)='complete'; ('2026-10','2026-11-02',false)='buildNext'
it('a card started in its last 7 days starts in buildNext', ...) // ('2026-10','2026-10-27',false)
it('requestNow ignores the cookie unless the test clock is on', ...) // Review Focus 4
```

- [ ] **Step 2: Run to verify failure.** **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run --coverage` → pass, 100% game branches.
- [ ] **Step 5: Commit, PR, CI green, merge.**

---

### Task 3: Drafts per month and starting next month's card

**Branch:** `feat/next-month-cards`

**Files:**

- Modify: `src/lib/server/db/schema/cards.ts`, `drizzle/0007_draft_per_month.sql` (generated),
  `src/lib/server/card-drafts.ts` (+ spec), `src/lib/server/cards.ts` (+ spec)

**Interfaces:**

- Consumes: Task 2 `canBuildNextMonth`; M3 `localDate`, `startOfLocalDay`, `nextMonth`.
- Produces:
  - `card_draft` primary key (`user_id`, `month`).
  - `getDraft(db, userId, month)` returns that month's draft and deletes drafts for months before
    the person's current month; `saveDraft` upserts on (`user_id`, `month`);
    `discardDraft(db, userId, month)`.
  - `CardPlan` gains `month: string`. `startCard` accepts the current month (as in M3) or the next
    month when `canBuildNextMonth(localDate(now, tz))`; anything else → field `month`, "Next month's
    card isn't open yet." For next month: `startDate = '{month}-01'` (so proration keeps N),
    `editableUntil = startOfLocalDay('{month}-03', tz)` (end of the 2nd).
  - `updateCard` is unchanged except that next month's card's window is its stored `editableUntil`.

- [ ] **Step 1: Write failing tests**

```ts
it('keeps one draft per month', ...) // Review Focus 2: drafts for 2026-10 and 2026-11 coexist; discarding one leaves the other
it('forgets drafts for months before the current one', ...)
it('starts next month\'s card in the last 7 days', ...) // now 2026-10-26T12:00Z UTC: month '2026-11', startDate '2026-11-01', targets unprorated, editableUntil 2026-11-03T00:00Z
it('refuses next month before the window', ...) // Review Focus 1: 2026-10-24 → field 'month'
it('opens the window by the person\'s own date', ...) // Review Focus 5: 2026-10-24T11:00Z Kiritimati ok, Pago_Pago refused
it('next month\'s card is editable until the end of the 2nd', ...)
```

- [ ] **Step 2: Run to verify failure.** **Step 3: Implement**; `npx drizzle-kit generate --name draft_per_month`.
- [ ] **Step 4: Run** `npx vitest run` → pass.
- [ ] **Step 5: Commit, PR, CI green, merge.**

---

### Task 4: The center square on the card and building next month from it

**Branch:** `feat/next-month-square`

**Files:**

- Create: `src/routes/(app)/card/next/+page.server.ts` (redirect only)
- Modify: `src/routes/(app)/card/build/**`, `src/routes/(app)/card/+page.server.ts`, `+page.svelte`,
  `src/lib/components/CardBoard.svelte` (+ spec), `src/lib/components/BingoSquare.svelte` (+ spec),
  `e2e/card.e2e.ts` (or new `e2e/next-month.e2e.ts`)

**Interfaces:**

- Consumes: Task 2 `centerState`, `canBuildNextMonth`, `requestNow`; Task 3 drafts per month,
  `startCard` with `month`, `getCard`, `draftFromCard`, `isEditable`.
- Produces:
  - `/card` load adds `center: { state: 'complete' | 'buildNext'; label: string; href: string | null }`:
    before the window `complete`, label "Free", no link; window and not built → `buildNext`,
    "Build {Next}'s card", `/card/next`; built → `complete`, "{Next} ready", `/card/next`.
  - `CardBoard` squares accept optional `href`; a square with `href` renders as a link around
    `BingoSquare` (whole square tappable, accessible name = the square's label and state).
    `BingoSquare` renders `buildNext` with ✏️ and a non-green style (state text "build next month's
    card").
  - `/card/next`: outside the window → redirect `/card`; next card built and editable → save
    `draftFromCard(nextCard)` and redirect `/card/build/habits?for=next`; otherwise →
    `/card/build?for=next`.
  - Builder with `?for=next`: target month = next month (redirect `/card` when
    `!canBuildNextMonth`); heading "Your {Next} card · starts {Next} 1"; the Targets step shows no
    "days left" line and no "Prorated from" text; Start redirects to `/card?planned=1` with
    "{Next} card saved. It starts {Next} 1." Every builder form action keeps `for=next`.
  - Today and `/card` keep showing only the current month's card.

- [ ] **Step 1: Write failing tests**

```ts
// CardBoard / BingoSquare specs
it('renders a linked center square with its label and state', ...) // "Build November's card: build next month's card"
// e2e (setClock)
test('the center square is complete before the last 7 days', ...) // 2026-10-20: center "Free", ✓, no link
test('in the last 7 days the center asks for next month\'s card', ...) // 2026-10-26: "Build November's card" link
test('building next month from the center square', ...) // builder heading "Your November card · starts November 1"; Start → "/card?planned=1", center "November ready"; /card still October
test('the center square opens next month\'s card for editing', ...) // tap "November ready" → builder habits step with for=next; Save changes
test('next month\'s card shows up on the 1st', ...) // Review Focus 3: setClock 2026-10-31 → /card October; 2026-11-01 → /card November, Today "Your November card is ready."
test('next month is closed before the window', ...) // Review Focus 1: 2026-10-20 /card/next and /card/build?for=next → /card
```

- [ ] **Step 2: Run to verify failure.** **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run` and the full `npx playwright test` → pass.
- [ ] **Step 5: Commit, PR, CI green, merge.**

---

### Task 5: Ship M3 + M3.1

**Branch:** none (release only)

- [ ] Confirm production `/api/health` is `ok/ok` after Task 4 merges (migrations `0006`, `0007` ran).
- [ ] With the human partner on production (phone): build and start a 3×3 (8 habits) and check the
      center square, edit within the window, and check Today and the nav. The last-7-days behaviour
      is covered by E2E (production has no test clock); check it live from Oct 25.
- [ ] Close milestones "M3: Card builder" and "M3.1: Next-month square" (create the M3.1 milestone
      when Task 1's PR opens); approve and merge the release-please PR (`v0.4.0`).
