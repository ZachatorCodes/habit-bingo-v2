# M3: Card Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each person builds this month's bingo card from their habit library — size, habits,
prorated targets, rewards, a shuffled board — starts it, and can still change it for 48 hours.

**Architecture:** The card rules from spec §3.3–§3.4 (sizes, FREE square, proration, shuffling,
month arithmetic) are pure functions in `src/lib/game` with 100% branch coverage. A `cards` service
owns the `card` and `card_square` tables, snapshots habits at start and enforces the edit window;
a `card-drafts` service keeps the builder's progress in a `card_draft` row so every step is a plain
form post that works without JavaScript. The builder lives at `/card/build/[step]`; a minimal
`/card` page shows the started board (M5 replaces it with the full card view).

**Tech Stack:** SvelteKit 3 form actions, Svelte 5 runes, Drizzle + Postgres (PGlite in tests),
Zod 4, Vitest 4, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-09-habit-bingo-v2-design.md` (§3.1, §3.3, §3.4, §4.2,
§4.3, §5.3, §6)

## Global Constraints

- Everything in the M0–M2 plans' Global Constraints still applies: one branch + PR per task,
  Conventional Commits, Prettier, `#lib/*.ts` imports with explicit `.ts`, Playful tokens, ink text
  on state colors, states never color-only, reduced motion respected, `requireUser(locals)` in every
  server load and form action under `(app)`, form actions carry the page's query when they post.
- **One card per user per calendar month (`YYYY-MM`)**, unique (`userId`, `month`). A card can be
  created on any day of the month. The month and "today" are **user-local** (the profile timezone).
- **Sizes (spec §3.3):** 3×3 (9 habits) and 5×5 (24 habits + FREE center at index
  12). Multipliers ×1, ×2. Middle reward thresholds 3×3 → 5, 5×5 → 15 squares
  (FREE counts).
- **Snapshot (spec §3.3):** each square stores the habit's `emoji`, `name`, `category`,
  `direction`, `period`, `countMode`, `target` (after proration and overrides) and `isPrivate`.
  Later library edits never change a card.
- **Proration (spec §3.4):** `R = D − s + 1`, round half up. `atLeast/month`:
  `max(1, round(N × R / D))`. `atMost/month`: `round(N × R / D)`. `day` and `week` habits keep N
  (week clipping is computed per week in M4 from `startDate` and the `weekStartsOn` snapshot).
- **Edit window (spec §3.3):** habits, targets, rewards and layout can change for 48 hours after the
  card starts, but not beyond the month's last day (user-local). Then the card is locked.
- **Builder steps (spec §4.3):** Size ("you have X habits / need Y") → Habits (create new habits
  inline) → Targets ("N days left" explanation; override) → Rewards (three text fields) → Board
  (shuffled preview; re-shuffle) → Start (notes the 48-hour edit window).
- Archived habits never appear in the builder (spec §3.2).
- A user only ever sees or changes their own cards, drafts and habits; anything else is **404**
  (route) or a field error naming the problem (posted ids).

**Decisions this plan makes (spec is silent or leaves room):**

- Only the **current** month's card is built here; building next month's card early arrives with
  the closing window in M7.
- Builder progress lives in a new `card_draft` table (one row per user), not in the URL or the
  browser, so a person can leave and come back on any device. Task 2 adds it to spec §5.3.
- `editableUntil` is stored as an instant: `min(start + 48h, user-local midnight that begins next
month)`. Editability is `now < editableUntil`.
- Size is fixed once the card starts; edits cover habits, targets, rewards and layout (the spec's
  list). Editing keeps a square's id while its habit stays on the card, so M4 check-ins survive.
- Rewards are required, trimmed, 1–80 characters each.
- The draft stores a target only when the person overrode the prorated default, so defaults are
  recomputed from the real start date.

## Review Focus

1. **Someone else's or an archived habit id posted to the builder** (forged form, or a habit
   archived in another tab between steps) must never reach a card: the step or the start refuses
   with "Pick from your habits." Pinned in Task 3 (habits step) and Task 5 (start).
2. **Double start** (double tap, two tabs, a retried no-JS post) must create exactly one card; the
   second post lands on `/card`. Pinned in Task 2 (service) and Task 5 (E2E concurrent posts).
3. **Editing after the window** (48 hours passed, or the month ended first) must be refused by the
   service, not only hidden in the UI: "This card is locked." Pinned in Task 2 and Task 6.
4. **A draft left from last month** must not leak into this month: the builder starts fresh. Pinned
   in Task 3.
5. **Timezones near midnight:** a person in `Pacific/Kiritimati` (UTC+14) or `Pacific/Pago_Pago`
   (UTC−11) gets their own month, start date, proration and edit deadline, not the server's. Pinned
   in Task 2.

---

### Task 1: Card rules (pure game module)

**Branch:** `feat/card-rules`

**Files:**

- Create: `src/lib/game/calendar.ts`, `calendar.spec.ts`, `src/lib/game/proration.ts`,
  `proration.spec.ts`, `src/lib/game/card-layout.ts`, `card-layout.spec.ts`

**Interfaces:**

- Consumes: `HabitRule` from `habit-rules.ts`; `SquareState` from `square-state.ts`.
- Produces:
  - `calendar.ts` (dates are `YYYY-MM-DD`, months `YYYY-MM`, all UTC-free string math):
    `monthOf(date: string): string`, `daysInMonth(month: string): number`,
    `lastDayOf(month: string): string`, `nextMonth(month: string): string`,
    `daysLeftInMonth(date: string): number` (= `D − s + 1`),
    `monthName(month: string): string` (English, e.g. `"October"`).
  - `proration.ts`: `prorateTarget(rule: HabitRule, startDate: string): number`. Round half up in
    integers, never floats: `round(N × R / D) = floor((2·N·R + D) / (2·D))`.
  - `card-layout.ts`:
    - `type CardSize = 3 | 5`; `isCardSize(value: unknown): value is CardSize`
    - `CARD_SIZES: Record<CardSize, { habits: number; squares: number; multiplier: number; sixtyThreshold: number; freePosition: number | null }>`
      = `3: 9, 9, 1, 5, null` · `5: 24, 25, 2, 15, 12`.
    - `shuffleLayout<T>(items: readonly T[], size: CardSize, random: () => number): (T | null)[]`
      — Fisher–Yates over `items`, then `null` inserted at `freePosition`; throws `RangeError` when
      `items.length !== CARD_SIZES[size].habits`.
    - `isValidLayout<T>(layout: readonly (T | null)[], items: readonly T[], size: CardSize): boolean`
      — right length, `null` exactly at the free position (and nowhere else), and a permutation of
      `items`.
    - `initialSquareState(square: { isFree: true } | { isFree: false; direction: Direction; period: Period }): SquareState`
      — `free`; `atLeast/month` → `empty` (earn); everything else → `held` (protect). M4 replaces
      it with live evaluation.

- [ ] **Step 1: Write failing tests**

```ts
// calendar.spec.ts
it.each([['2026-10', 31], ['2026-09', 30], ['2028-02', 29], ['2026-02', 28], ['2100-02', 28], ['2000-02', 29]])('daysInMonth %s = %i', ...)
it('lastDayOf and nextMonth roll over the year', ...) // lastDayOf('2026-12') = '2026-12-31'; nextMonth('2026-12') = '2027-01'
it('daysLeftInMonth counts the start day', ...) // '2026-10-19' → 13; '2026-10-01' → 31; '2026-10-31' → 1
it('monthOf and monthName', ...) // monthOf('2026-10-19') = '2026-10'; monthName('2026-10') = 'October'
// proration.spec.ts
it.each([
  [{ direction: 'atLeast', period: 'month', countMode: 'days', target: 10 }, '2026-10-19', 4],   // 130/31 = 4.19
  [{ direction: 'atLeast', period: 'month', countMode: 'days', target: 1 }, '2026-10-31', 1],    // max(1, …)
  [{ direction: 'atLeast', period: 'month', countMode: 'times', target: 3 }, '2028-02-15', 2],  // leap: 45/29 = 1.55
  [{ direction: 'atMost', period: 'month', countMode: 'times', target: 3 }, '2026-10-19', 1],    // 39/31 = 1.26
  [{ direction: 'atMost', period: 'month', countMode: 'times', target: 1 }, '2026-09-16', 1],    // exactly 0.5 rounds up
  [{ direction: 'atMost', period: 'month', countMode: 'days', target: 0 }, '2026-10-19', 0],     // limit 0
  [{ direction: 'atLeast', period: 'month', countMode: 'days', target: 10 }, '2026-10-01', 10],  // full month
  [{ direction: 'atLeast', period: 'week', countMode: 'days', target: 3 }, '2026-10-19', 3],     // week keeps N
  [{ direction: 'atMost', period: 'day', countMode: 'times', target: 1 }, '2026-10-31', 1]       // day keeps N
])('prorates %o from %s to %i', ...)
// card-layout.spec.ts
it('sizes match the spec', ...) // the CARD_SIZES table above, exactly; isCardSize(4) === false
it('shuffles every item exactly once, deterministically for a given random', ...)
it('puts FREE at index 12 on 5×5 only', ...) // layout[12] === null; no other null; 3×3 has none
it('refuses the wrong number of items', ...) // RangeError for 8 items on 3×3
it('validates layouts', ...) // accepts a shuffle; rejects wrong length, missing/duplicate item, null off-center, 5×5 without null
it('initial states: earn empty, protect held, free free', ...)
```

- [ ] **Step 2: Run to verify failure:** `npx vitest run src/lib/game` → FAIL (modules missing).
- [ ] **Step 3: Implement** the three modules.
- [ ] **Step 4: Run** `npx vitest run --coverage` → pass; `coverage/src/lib/game/index.html` shows
      100% branches for the new files.
- [ ] **Step 5: Commit, PR, CI green, merge.**

---

### Task 2: Card tables and card service

**Branch:** `feat/cards-service`

**Files:**

- Create: `src/lib/server/db/schema/cards.ts`, `drizzle/0005_cards.sql` (generated),
  `src/lib/server/clock.ts`, `clock.spec.ts`, `src/lib/server/cards.ts`, `cards.spec.ts`
- Modify: `src/lib/server/db/schema.ts` (re-export), spec §5.3 (add the `card_draft` row: `userId`
  (unique), `month`, `data` (JSON), `updatedAt`)

**Interfaces:**

- Consumes: Task 1 (`CardSize`, `CARD_SIZES`, `isValidLayout`, `prorateTarget`, `monthOf`,
  `nextMonth`); M2 `normalizeRule`, `listHabits`, `Habit`, `CategoryId`.
- Produces:
  - Table `card`: `id` text pk, `user_id` → user **cascade**, `month` text, `size` integer (CHECK in
    3, 5), `start_date` text, `editable_until` timestamptz, `week_starts_on` text (CHECK),
    `reward_bingo`, `reward_sixty`, `reward_blackout` text, `created_at`, `updated_at`; unique
    (`user_id`, `month`).
  - Table `card_square`: `id` text pk, `card_id` → card **cascade**, `position` integer, `is_free`
    boolean, `habit_id` → habit **set null**, snapshot columns nullable for the FREE square
    (`emoji`, `name`, `category`, `direction`, `period`, `count_mode`, `target`, `is_private`),
    unique (`card_id`, `position`), CHECK that non-free squares have every snapshot column.
  - Table `card_draft`: `user_id` pk → user **cascade**, `month` text, `data` jsonb, `updated_at`.
  - `clock.ts`:
    - `localDate(now: Date, timezone: string): string` (`Intl.DateTimeFormat('en-CA', { timeZone })`)
    - `startOfLocalDay(date: string, timezone: string): Date` — guess `Date.UTC(date)`, subtract
      the zone's offset at the guess (read via `Intl.DateTimeFormat(..., { timeZoneName: 'longOffset' })`),
      then re-read the offset at the result and correct once (DST).
    - `formatEditDeadline(editableUntil: Date, timezone: string): string` — `"Edits close Wed at
9:41 PM"`; when `editableUntil` is a local midnight: `"Edits close at the end of Sat, Oct 31"`
      (the day before). Normalize ICU's narrow no-break space to a space.
  - `cards.ts`:
    - `type Rewards = { bingo: string; sixty: string; blackout: string }`
    - `type CardSquare = { id: string; position: number; isFree: true } | ({ id: string; position: number; isFree: false; habitId: string | null; emoji: string; name: string; category: CategoryId; isPrivate: boolean } & HabitRule)`
    - `type Card = { id: string; month: string; size: CardSize; startDate: string; editableUntil: Date; weekStartsOn: 'monday' | 'sunday'; rewards: Rewards; squares: CardSquare[] }` (squares by position)
    - `type CardPlan = { size: CardSize; habitIds: string[]; targets: Record<string, number>; rewards: Rewards; layout: (string | null)[] }`
      (`targets` holds overrides only; missing ⇒ `prorateTarget`)
    - `type CardError = { ok: false; field: 'exists' | 'locked' | 'habits' | 'targets' | 'layout' | keyof Rewards; message: string }`
    - `validateRewards(input: Rewards): { ok: true; value: Rewards } | CardError` — trimmed, 1–80,
      message "Write a reward (up to 80 characters)." on that reward's field.
    - `currentMonth(user: { timezone: string }, now: Date): string`
    - `getCard(db: Db, userId: string, month: string): Promise<Card | null>`
    - `startCard(db: Db, user: { id: string; timezone: string; weekStartsOn: 'monday' | 'sunday' }, plan: CardPlan, now: Date): Promise<{ ok: true; card: Card } | CardError>`
      — month and `startDate` from `localDate(now, timezone)`; `editableUntil = min(now + 48h,
startOfLocalDay(`${nextMonth(month)}-01`, timezone))`; validates: `habitIds` are exactly
      `CARD_SIZES[size].habits` distinct ids of the user's **active** habits (field `habits`, "Pick
      from your habits."), each override passes `normalizeRule` for its habit (field `targets`,
      "Pick a number from {min} to {max} for {name}."), `isValidLayout` (field `layout`, "Shuffle
      the board again."), rewards. Inserts card + squares in one transaction; a unique violation on
      (`user_id`, `month`) → field `exists`, "You already have a card for {Month}."
    - `isEditable(card: Pick<Card, 'editableUntil'>, now: Date): boolean`
    - `updateCard(db: Db, user: { id: string; timezone: string }, plan: Omit<CardPlan, 'size'>, now: Date): Promise<{ ok: true; card: Card } | CardError>`
      — this month's card; none → field `exists`, "There's no card for {Month} yet."; closed window →
      field `locked`, "This card is locked."; same validation (proration from the card's
      `startDate`, size from the card); squares whose `habitId` stays keep their row (position and
      target updated, snapshot untouched); dropped habits' squares are deleted; new habits get a
      fresh snapshot.

- [ ] **Step 1: Write failing tests**

```ts
// clock.spec.ts
it('localDate uses the person\'s timezone', ...) // 2026-10-31T11:30Z → Kiritimati '2026-11-01', Pago_Pago '2026-10-31' (Review Focus 5)
it('startOfLocalDay handles both sides of UTC and DST', ...) // '2026-11-01' in Kiritimati → 2026-10-31T10:00Z; New_York '2026-11-02' → 05:00Z (after DST ends)
it('formats the edit deadline', ...) // mid-month → /^Edits close \w{3} at \d{1,2}:\d{2} [AP]M$/; local midnight → 'Edits close at the end of Sat, Oct 31'
// cards.spec.ts (PGlite; users and habits via the M2 service)
it('starts a 3×3 card: snapshots habits, prorates month targets, keeps overrides', ...) // start 2026-10-19 UTC: 'Finish a book' 10/month → 4; override → stored
it('5×5 has a FREE square at position 12 and 24 habit squares', ...)
it('uses the person\'s month, start date and week start', ...) // Kiritimati at 2026-10-31T11:30Z → month '2026-11', startDate '2026-11-01'
it('editable for 48 hours, cut at the end of the month', ...) // start Oct 10 → +48h; start Oct 31 20:00 local → local midnight Nov 1
it('refuses a second card for the month', ...) // field 'exists'; one card row (Review Focus 2: Promise.all of two starts → exactly one ok)
it('refuses habits that are not mine, archived, duplicated or the wrong count', ...) // field 'habits' (Review Focus 1)
it('refuses an out-of-range override and a bad layout', ...)
it('refuses empty or 81-character rewards', ...)
it('later library edits never change the card', ...) // updateHabit after start → card square unchanged
it('updates within the window, keeping square ids for habits that stay', ...)
it('refuses updates after the window', ...) // now = editableUntil → field 'locked' (Review Focus 3)
it('never returns another user\'s card; deleting a user deletes their cards', ...)
```

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement**; `npx drizzle-kit generate --name cards`.
- [ ] **Step 4: Run** `npx vitest run` → pass.
- [ ] **Step 5: Commit, PR, CI green (preview smoke runs the migration), merge.**

---

### Task 3: Builder drafts, Size and Habits steps

**Branch:** `feat/card-builder-habits`

**Files:**

- Create: `src/lib/server/card-drafts.ts`, `card-drafts.spec.ts`,
  `src/routes/(app)/card/build/+page.server.ts` (redirect only),
  `src/routes/(app)/card/build/[step]/+page.server.ts`, `+page.svelte`,
  `src/lib/components/BuilderSteps.svelte`, `BuilderSteps.svelte.spec.ts`,
  `src/lib/components/SizePicker.svelte`, `SizePicker.svelte.spec.ts`,
  `src/lib/components/HabitPicker.svelte`, `HabitPicker.svelte.spec.ts`, `e2e/card-builder.e2e.ts`
- Modify: `e2e/fixtures.ts`

**Interfaces:**

- Consumes: Task 1 `CARD_SIZES`, `isCardSize`; Task 2 `currentMonth`, `getCard`; M2 `listHabits`,
  `createHabit`, `HabitForm`, `readHabitForm`, `describeRule`, `CATEGORIES`.
- Produces:
  - `card-drafts.ts`:
    - `type Step = 'size' | 'habits' | 'targets' | 'rewards' | 'board'`; `STEPS: readonly Step[]` in that order.
    - `type CardDraft = { month: string; cardId: string | null; size: CardSize | null; habitIds: string[]; targets: Record<string, number>; rewards: Rewards; layout: (string | null)[] | null; completed: Step[] }`
    - `emptyDraft(month: string): CardDraft`
    - `getDraft(db: Db, userId: string, month: string): Promise<CardDraft>` — the stored draft when
      its month matches and it parses (Zod); otherwise deletes the row and returns `emptyDraft`
      (Review Focus 4).
    - `saveDraft(db: Db, userId: string, draft: CardDraft): Promise<void>` (upsert)
    - `discardDraft(db: Db, userId: string): Promise<void>`
    - `stepsFor(draft: CardDraft): Step[]` — all five; without `size` when editing (`cardId` set).
    - `firstOpenStep(draft: CardDraft): Step` — the first step of `stepsFor` not in `completed`
      (`board` when all are).
    - `canOpen(draft: CardDraft, step: Step): boolean` — every earlier step is completed.
    - `withHabits(draft: CardDraft, habitIds: string[]): CardDraft` — sets `habitIds`, drops
      `targets` for removed habits, clears `layout` when the set changed.
  - `/card/build` load: redirect to `/card/build/{firstOpenStep}`.
  - `/card/build/[step]` load (`requireUser`): unknown step → 404; this month's card exists and the
    draft isn't editing it → redirect `/card`; `!canOpen` → redirect to `firstOpenStep`. Returns
    `{ step, steps, draft, monthName, habits (active), counts }`.
  - Actions: `size` (field `size`, "Pick a size."), `habits` (`habitIds` repeated field; exactly
    `CARD_SIZES[size].habits` distinct active habits of mine, else "Pick exactly {n} habits." /
    "Pick from your habits."), `createHabit` (M2 `readHabitForm` + `createHabit`; the new habit is
    added to the draft's selection; stays on the step), `discard` ("Start over" → `discardDraft`,
    redirect `/card/build`). A valid step saves the draft, marks the step completed and redirects
    (303) to the next step.
  - `BuilderSteps.svelte` props `{ steps: Step[]; current: Step; completed: Step[] }`: an ordered
    list labelled "Card builder steps" — Size, Habits, Targets, Rewards, Board — completed steps link
    back, the current one has `aria-current="step"` and "Step {i} of {n}" text.
  - `SizePicker.svelte` props `{ selected: CardSize | null; habitCount: number }`: three radio cards
    "3×3" and "5×5" with "{n} habits · ×{multiplier}" and "You have {X} habits / need {Y}", and
    "Add {Y − X} more in the next step." when short.
  - `HabitPicker.svelte` props `{ habits: Habit[]; selected: string[]; need: number }`: checkboxes
    grouped by category (emoji, name, `describeRule`), a polite live counter "{k} of {need} picked".
  - Habits step page also shows a "New habit" disclosure with `HabitForm` posting to
    `?/createHabit`.
  - `e2e/fixtures.ts`: `newMemberWithHabits(page: Page, count: number): Promise<{ username: string }>`
    — `newMember`, then taps "Add {name}" on the first `count` Quick start suggestions (≤ 10).

- [ ] **Step 1: Write failing tests**

```ts
// card-drafts.spec.ts
it('starts empty and saves progress', ...)
it('forgets a draft from another month', ...) // Review Focus 4: saved for '2026-09', read for '2026-10' → empty, row gone
it('forgets a draft that no longer parses', ...)
it('orders steps and finds the first open one', ...) // editing skips size
it('changing habits drops their overrides and the layout', ...)
// components
it('BuilderSteps marks the current step and links completed ones', ...)
it('SizePicker shows need versus have and how many to add', ...) // 9 habits: "You have 9 habits / need 16", "Add 7 more in the next step."
it('HabitPicker counts picks live', ...) // "3 of 9 picked"
// e2e/card-builder.e2e.ts
test('the builder starts at Size and moves to Habits', ...) // newMemberWithHabits(9); /card/build → /card/build/size
test('picking the wrong number of habits explains the count', ...) // 8 → "Pick exactly 9 habits."
test('a habit created inline is picked', ...)
test('another person\'s habit id is refused', ...) // Review Focus 1: page.request.post ?/habits with B's ids → 400 "Pick from your habits."
test('later steps redirect back until earlier ones are done', ...) // /card/build/targets → /card/build/habits
test('signed-out visitors are sent to sign in', ...)
```

- [ ] **Step 2: Run to verify failure.** **Step 3: Implement.** **Step 4: Run all tests.**
- [ ] **Step 5: Commit, PR, CI green, merge.**

---

### Task 4: Targets and Rewards steps

**Branch:** `feat/card-builder-targets`

**Files:**

- Create: `src/lib/components/TargetList.svelte`, `TargetList.svelte.spec.ts`
- Modify: `src/routes/(app)/card/build/[step]/+page.server.ts`, `+page.svelte`,
  `e2e/card-builder.e2e.ts`

**Interfaces:**

- Consumes: Task 1 `prorateTarget`, `daysLeftInMonth`, `CARD_SIZES`; Task 2 `validateRewards`,
  `localDate`; Task 3 drafts and step routing; M2 `targetRange`, `describeRule`.
- Produces:
  - Targets step load adds `{ startDate, daysLeft, rows }` where `startDate` is today (or the card's
    `startDate` when editing) and each row is `{ habit, prorated: number, value: number, range }`.
  - Action `targets`: one `target:{habitId}` field per picked habit; each must be within
    `targetRange` (error on that field: "Pick a number from {min} to {max}."); the draft keeps only
    values that differ from `prorated`.
  - Action `rewards`: fields `bingo`, `sixty`, `blackout` via `validateRewards`; errors keep the
    typed values.
  - `TargetList.svelte` props `{ rows; daysLeft: number; monthName: string; errors: Record<string, string> }`:
    heading text "{daysLeft} days left in {monthName}" (1 → "1 day left"); per row a number input
    labelled "{emoji} {name}" with an explanation: month habits "Prorated from {N}" when it changed,
    day habits "Every day from {start}", week habits "{N} a week (short weeks scale down)".
  - Rewards step: three `TextField`s — "First bingo", "{sixtyThreshold} squares", "Blackout" — with
    hint "What will you treat yourself to?".

- [ ] **Step 1: Write failing tests**

```ts
// TargetList.svelte.spec.ts
it('explains the days left and each row\'s proration', ...) // "13 days left in October"; "Prorated from 10"
it('says "1 day left" on the last day', ...)
it('links each error to its input', ...)
// e2e/card-builder.e2e.ts
test('targets show the days left and accept an override', ...) // /\d+ days? left in \w+/
test('an out-of-range target is explained on that row', ...) // 0 for an atLeast habit → "Pick a number from 1 to …"
test('rewards are required', ...) // empty "First bingo" → "Write a reward (up to 80 characters)."
```

- [ ] **Step 2: Run to verify failure.** **Step 3: Implement.** **Step 4: Run all tests.**
- [ ] **Step 5: Commit, PR, CI green, merge.**

---

### Task 5: Board preview, start, and the card page

**Branch:** `feat/card-start`

**Files:**

- Create: `src/lib/components/CardBoard.svelte`, `CardBoard.svelte.spec.ts`,
  `src/routes/(app)/card/+page.server.ts`, `+page.svelte`, `e2e/card.e2e.ts`
- Modify: `src/routes/(app)/card/build/[step]/+page.server.ts`, `+page.svelte`,
  `src/routes/(app)/today/+page.svelte` (+ new `+page.server.ts`),
  `src/routes/(app)/+layout.svelte` (nav), `src/routes/(app)/me/habits/+page.svelte` (welcome link),
  `src/routes/+page.svelte` (landing copy: "Pick habits for a 3×3 or 5×5 card and set your own
  rewards.")

**Interfaces:**

- Consumes: Task 1 `shuffleLayout`, `initialSquareState`, `CARD_SIZES`; Task 2 `startCard`,
  `getCard`, `isEditable`, `formatEditDeadline`; Task 3 drafts; M0 `BingoSquare`.
- Produces:
  - Board step load: when `draft.layout` is null or no longer valid for `habitIds`, sets it with
    `shuffleLayout(habitIds, size, Math.random)` and saves the draft.
  - Action `shuffle` → new layout, stay on the step. Action `start` → `startCard` with the draft
    plan; ok → `discardDraft`, redirect `/card?started=1`; `exists` → redirect `/card`; `habits` →
    redirect to the Habits step with the message; other errors → `fail(400)` on the Board step.
  - Board step copy: "You can change habits, targets, rewards and the board for 48 hours after you
    start." and a "Start card" button; plus "Shuffle again".
  - `CardBoard.svelte` props `{ size: CardSize; squares: { emoji: string; name: string; state: SquareState }[] }`:
    a `size`-column grid of `BingoSquare`, labelled "{Month} card" by its parent; names shown on
    3×3 at `sm` and up.
  - `/card` load: this month's card or `null`, whether a draft exists, `editable`, `deadline`
    (`formatEditDeadline`). Page: no card → "No card for {Month} yet." + "Build your card" (or
    "Continue building" with a draft) → `/card/build`; card → heading "{Month} card", status
    "Card started!" when `?started=1`, the board (states from `initialSquareState`), the three
    rewards with the middle one labelled "{sixtyThreshold} squares", and while editable the deadline
    text (Edit button arrives in Task 6).
  - Today: no card → "No card yet." + "Build one" → `/card/build`; card → "Your {Month} card is
    ready." + "See your card" (check-ins arrive in M4).
  - Nav: "Card" link between Today and Me (`aria-current` on `/card` and under it).
  - Habit library welcome: "Continue to Today →" becomes "Build your first card →" (`/card/build`).

- [ ] **Step 1: Write failing tests**

```ts
// CardBoard.svelte.spec.ts
it('renders size × size squares with FREE in the 5×5 center', ...)
it('names each square with its state in text', ...) // "Meditate: protected"
// e2e/card.e2e.ts
test('a new member builds and starts a 3×3 card', ...) // size → habits → targets → rewards → board → Start → /card?started=1, 9 squares, rewards shown, deadline text
test('shuffle changes the board but keeps the habits', ...)
test('Today and the nav lead to the card', ...)
test('starting twice makes one card', ...) // Review Focus 2: two page.request.post('?/start') in Promise.all → one card; the later lands on /card
test('a habit archived before starting sends you back to Habits', ...) // Review Focus 1
test('the whole builder works without JavaScript', ...)
test('the welcome panel links to the builder', ...)
```

- [ ] **Step 2: Run to verify failure.** **Step 3: Implement.** **Step 4: Run all tests.**
- [ ] **Step 5: Commit, PR, CI green, merge.**

---

### Task 6: The 48-hour edit window

**Branch:** `feat/card-edit`

**Files:**

- Modify: `src/lib/server/card-drafts.ts` (+ spec), `src/routes/(app)/card/+page.server.ts`,
  `+page.svelte`, `src/routes/(app)/card/build/[step]/+page.server.ts`, `+page.svelte`,
  `e2e/card.e2e.ts`

**Interfaces:**

- Consumes: Task 2 `updateCard`, `isEditable`; Task 3 drafts and steps; Task 5 board step.
- Produces:
  - `draftFromCard(card: Card): CardDraft` — `cardId` set, size, habitIds from squares, targets
    (every snapshot target that differs from `prorateTarget` at the card's `startDate`), rewards,
    layout from positions, `completed` = all of `stepsFor`.
  - `/card` action `edit`: `requireUser`; editable → `saveDraft(draftFromCard(card))`, redirect
    `/card/build/habits`; locked → `fail(400, { message: 'This card is locked.' })`. The page shows
    an "Edit card" button and the deadline only while editable.
  - Board step in edit mode: the button reads "Save changes" and posts `start`, which calls
    `updateCard`; ok → `discardDraft`, redirect `/card?saved=1` ("Changes saved."); `locked` →
    discard the draft, redirect `/card` with "This card is locked.". A "Cancel editing" button
    discards the draft and returns to `/card`.
  - The builder never offers the Size step while editing.

- [ ] **Step 1: Write failing tests**

```ts
// card-drafts.spec.ts
it('draftFromCard round-trips a card into a complete editing draft', ...) // overrides only where they differ
// e2e/card.e2e.ts
test('within 48 hours the card can be edited', ...) // change a reward, swap a habit, Save changes → "Changes saved.", board shows the new habit
test('cancel editing leaves the card unchanged', ...)
test('editing skips the Size step', ...) // /card/build/size while editing → redirect to Habits
// Locked cards (Review Focus 3) are pinned by Task 2's service test; the route maps 'locked' as above.
```

- [ ] **Step 2: Run to verify failure.** **Step 3: Implement.** **Step 4: Run all tests.**
- [ ] **Step 5: Commit, PR, CI green, merge.**

---

### Task 7: Ship it

**Branch:** none (release only)

- [ ] Confirm production `/api/health` is `ok/ok` after Task 6 merges (migration `0005` ran).
- [ ] With the human partner on production: build and start a card (phone), check the targets
      explanation, rewards and board, edit it within the window, and confirm Today and the nav.
- [ ] Move issues still open on milestone "M3: Card builder" (#40, #50) to M4; close M3; approve
      and merge the release-please PR (`v0.4.0`).
