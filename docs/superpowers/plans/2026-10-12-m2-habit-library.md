# M2: Habit Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each person keeps a library of their own habits: create, edit, archive and restore them,
browse them by category, and start quickly from tap-to-add suggestions after onboarding.

**Architecture:** The habit rules from spec §3.2 (valid direction × period × count-mode combinations,
ranges, defaults, the plain-English description) live in the pure `src/lib/game` module, so the
browser form and the server share them and they get 100% branch coverage. A `habits` service owns
persistence and authorization (every query scoped to the signed-in user). The library lives under
Me (`/me/habits`), as spec §4.10 places it; the five-tab bar arrives in M4.

**Tech Stack:** SvelteKit 3 form actions, Svelte 5 runes, Drizzle + Postgres (PGlite in tests),
Zod 4, Vitest 4, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-09-habit-bingo-v2-design.md` (§3.2, §4.2, §4.10, §5.3, §8)

## Global Constraints

- Everything in the M0 and M1 plans' Global Constraints still applies: one branch + PR per task,
  Conventional Commits, Prettier, `#lib/*.ts` imports with explicit `.ts`, Playful tokens, ink text
  on state colors, states never color-only, reduced motion respected, `requireUser(locals)` in every
  server load and form action under `(app)`.
- **Habit fields (spec §3.2):** `emoji`, `name`, `category`, `direction` (`atLeast` | `atMost`),
  `target` (integer N), `period` (`day` | `week` | `month`), `countMode` (`times` | `days`),
  `isPrivate`, `archivedAt?`.
- **Valid combinations and ranges (spec §3.2), exactly:**
  `atLeast/day`: N 1–20 (no count-mode choice; stored as `times`).
  `atLeast/week`: `days` 1–7, `times` 1–50. `atLeast/month`: `days` 1–31, `times` 1–100.
  `atMost/day`: not offered. `atMost/week`: `days` 0–6, `times` 0–50.
  `atMost/month`: `days` 0–30, `times` 0–100.
- **Default count mode:** `atMost` → `times`; `atLeast` → `days`.
- **Categories (fixed, in this order):** 💪 Fitness, 🥗 Health, 🧠 Mind, 🏠 Home, 👥 Social,
  📚 Learning, 🎨 Creative, 💰 Money, ✨ Other. Ids: `fitness`, `health`, `mind`, `home`, `social`,
  `learning`, `creative`, `money`, `other`.
- **Name:** trimmed, 1–40 characters. **Emoji:** exactly one emoji grapheme (see Task 1).
- **Archive, never delete** (spec §3.2). Archived habits are hidden from the default library view and
  from the card builder (M3), and can be restored.
- **At most 100 active habits per user** (abuse cap; copy: "You can have up to 100 habits. Archive
  some to add more.").
- A user can only ever see or change their own habits; anything else is **404**.

## Review Focus

1. **Another person's habit id in the URL** (`/me/habits/<their id>`, or a forged form post) must
   404, never reveal or change it. Pinned in Task 2 (service) and Task 4 (E2E).
2. **Stale hidden fields.** Switching "Limit it" + "per day", or "per day" + a count mode, in the
   form — or posting any combination without JS — must never store an invalid combination; the
   server normalizes or rejects with a field error. Pinned in Task 1 and Task 4.
3. **Emoji edge cases:** ZWJ families (👩‍👩‍👧), flags (🇯🇵), skin tones (👍🏽), keycaps (1️⃣) are
   one emoji and must be accepted; two emoji, plain text, or empty must be rejected. Pinned in
   Task 1.
4. **"Never" limits.** `atMost` with N = 0 ("No weed this month") is valid and must read naturally
   ("None this month"), not "At most 0 times". Pinned in Task 1.
5. **Adding the same starter twice** (double tap, or tapping one already in the library) must not
   create a duplicate. Pinned in Task 5.

---

### Task 1: Habit rules and categories (pure game module)

**Branch:** `feat/habit-rules`

**Files:**

- Create: `src/lib/game/categories.ts`, `src/lib/game/categories.spec.ts`,
  `src/lib/game/habit-rules.ts`, `src/lib/game/habit-rules.spec.ts`

**Interfaces:**

- Produces:
  - `type CategoryId = 'fitness' | 'health' | 'mind' | 'home' | 'social' | 'learning' | 'creative' | 'money' | 'other'`
  - `CATEGORIES: readonly { id: CategoryId; emoji: string; label: string }[]` in the order above.
  - `isCategoryId(value: string): value is CategoryId`
  - `type Direction = 'atLeast' | 'atMost'`, `type Period = 'day' | 'week' | 'month'`,
    `type CountMode = 'times' | 'days'`
  - `type HabitRule = { direction: Direction; period: Period; countMode: CountMode; target: number }`
  - `targetRange(direction: Direction, period: Period, countMode: CountMode): { min: number; max: number } | null`
    (`null` = combination not offered)
  - `defaultCountMode(direction: Direction): CountMode`
  - `normalizeRule(input: { direction: string; period: string; countMode?: string; target: string | number }): { ok: true; rule: HabitRule } | { ok: false; field: 'direction' | 'period' | 'countMode' | 'target'; message: string }`
    — `day` period forces `countMode: 'times'`; missing/invalid count mode uses the default; `atMost`
    - `day` → field `period`, "Limits can be per week or per month."; target must be an integer in
      range → field `target`, "Pick a number from {min} to {max}.".
  - `describeRule(rule: HabitRule): string` — the sentence shown in previews and the library.
    Wording rules (the test table pins them): N = 1 → "Once a {period}" (both count modes; per day
    → "Every day"); N > 1 → "{N} times a {period}" or "{N} days a {period}"; `atMost` prefixes
    "At most " (and N = 1 → "At most once a {period}"); `atMost` with N = 0 → "None this {period}".
  - `isSingleEmoji(value: string): boolean` — exactly one grapheme (via `Intl.Segmenter`) that
    contains `\p{Extended_Pictographic}` or is a regional-indicator pair or a keycap sequence.

- [ ] **Step 1: Write failing tests** (aim: 100% branches; the coverage gate for `src/lib/game/**` is already configured)

```ts
// habit-rules.spec.ts
it.each([
	['atLeast', 'day', 'times', { min: 1, max: 20 }],
	['atLeast', 'week', 'days', { min: 1, max: 7 }],
	['atLeast', 'week', 'times', { min: 1, max: 50 }],
	['atLeast', 'month', 'days', { min: 1, max: 31 }],
	['atLeast', 'month', 'times', { min: 1, max: 100 }],
	['atMost', 'week', 'days', { min: 0, max: 6 }],
	['atMost', 'week', 'times', { min: 0, max: 50 }],
	['atMost', 'month', 'days', { min: 0, max: 30 }],
	['atMost', 'month', 'times', { min: 0, max: 100 }]
])('range for %s/%s/%s', ...)
it('limits are not offered per day', ...) // targetRange('atMost','day','times') === null
it('defaults: atMost → times, atLeast → days', ...)
it('per-day habits always count times, whatever was posted', ...) // normalizeRule({direction:'atLeast',period:'day',countMode:'days',target:8}).rule.countMode === 'times'
it('rejects a limit per day on the period field', ...)
it('rejects out-of-range and non-integer targets with the range in the message', ...) // '8' ok; '0' for atLeast → "Pick a number from 1 to 31."; '2.5', 'abc' rejected
it('rejects unknown directions and periods', ...)
it.each([
	[{ direction: 'atLeast', period: 'month', countMode: 'days', target: 1 }, 'Once a month'],
	[{ direction: 'atLeast', period: 'week', countMode: 'days', target: 1 }, 'Once a week'],
	[{ direction: 'atLeast', period: 'month', countMode: 'days', target: 12 }, '12 days a month'],
	[{ direction: 'atLeast', period: 'month', countMode: 'times', target: 3 }, '3 times a month'],
	[{ direction: 'atLeast', period: 'week', countMode: 'days', target: 2 }, '2 days a week'],
	[{ direction: 'atLeast', period: 'week', countMode: 'times', target: 1 }, 'Once a week'],
	[{ direction: 'atLeast', period: 'day', countMode: 'times', target: 1 }, 'Every day'],
	[{ direction: 'atLeast', period: 'day', countMode: 'times', target: 8 }, '8 times a day'],
	[{ direction: 'atMost', period: 'month', countMode: 'times', target: 10 }, 'At most 10 times a month'],
	[{ direction: 'atMost', period: 'month', countMode: 'days', target: 3 }, 'At most 3 days a month'],
	[{ direction: 'atMost', period: 'week', countMode: 'times', target: 1 }, 'At most once a week'],
	[{ direction: 'atMost', period: 'month', countMode: 'times', target: 0 }, 'None this month'],
	[{ direction: 'atMost', period: 'week', countMode: 'days', target: 0 }, 'None this week']
])('describes %o as %s', ...) // Review Focus 4
// isSingleEmoji
it.each(['📚', '🧘', '👩‍👩‍👧', '🇯🇵', '👍🏽', '1️⃣', '❤️'])('accepts %s', ...) // Review Focus 3
it.each(['', 'a', 'ab', '📚📚', '📚 ', ' ', '🇯'])('rejects %j', ...)
// categories.spec.ts
it('lists the nine categories in spec order with their emoji', ...)
it('recognizes category ids and rejects others', ...)
```

- [ ] **Step 2: Run to verify failure** → `npx vitest --run --project server src/lib/game` fails (modules missing).
- [ ] **Step 3: Implement.** No I/O, no framework imports. Trim before `isSingleEmoji`'s grapheme
      count is **not** allowed — `'📚 '` must be rejected (the server trims before calling it).
- [ ] **Step 4: Run** `npm run test:coverage` → `src/lib/game/**` at 100% branches; all tests pass.
- [ ] **Step 5: Commit, PR, CI green, merge.**

---

### Task 2: Habit table and service

**Branch:** `feat/habits-service`

**Files:**

- Create: `src/lib/server/db/schema/habits.ts`, `drizzle/0004_habits.sql` (generated),
  `src/lib/server/habits.ts`, `src/lib/server/habits.spec.ts`
- Modify: `src/lib/server/db/schema.ts` (re-export)

**Interfaces:**

- Consumes: Task 1 (`normalizeRule`, `isSingleEmoji`, `isCategoryId`, `CategoryId`, `HabitRule`).
- Produces:
  - Table `habit`: `id` text pk (`crypto.randomUUID()`), `user_id` → user **cascade**, `emoji` text,
    `name` text, `category` text, `direction` text, `period` text, `count_mode` text, `target`
    integer, `is_private` boolean default false, `archived_at` timestamptz nullable, `created_at`,
    `updated_at`. CHECK constraints for `direction`, `period`, `count_mode`, `category` value sets.
    Index on (`user_id`, `archived_at`).
  - `type Habit = { id: string; emoji: string; name: string; category: CategoryId; isPrivate: boolean; archivedAt: Date | null } & HabitRule`
  - `type HabitInput = { emoji: string; name: string; category: string; direction: string; period: string; countMode?: string; target: string | number; isPrivate: boolean }`
  - `type HabitResult = { ok: true; habit: Habit } | { ok: false; field: string; message: string }`
  - `validateHabitInput(input: HabitInput): { ok: true; value: Omit<Habit, 'id' | 'archivedAt'> } | { ok: false; field: string; message: string }`
    — name trimmed 1–40 → field `name` "Give it a name (up to 40 characters)."; emoji trimmed then
    `isSingleEmoji` → field `emoji` "Pick one emoji."; category → field `category` "Pick a
    category."; rule via `normalizeRule`.
  - `listHabits(db: Db, userId: string, options?: { archived?: boolean; category?: CategoryId }): Promise<Habit[]>`
    — active by default (`archived: true` returns only archived), ordered by category order then
    name (case-insensitive).
  - `getHabit(db: Db, userId: string, habitId: string): Promise<Habit | null>` (null for other users' habits)
  - `createHabit(db: Db, userId: string, input: HabitInput): Promise<HabitResult>` — refuses past 100
    active habits with field `form` and the cap copy from Global Constraints.
  - `updateHabit(db: Db, userId: string, habitId: string, input: HabitInput): Promise<HabitResult | null>` (null = not found / not yours)
  - `archiveHabit(db, userId, habitId, now: Date): Promise<boolean>` and
    `restoreHabit(db, userId, habitId): Promise<boolean | 'full'>` (`'full'` when restoring would
    exceed 100 active). Both idempotent; false = not found / not yours.

- [ ] **Step 1: Write failing tests** (PGlite via `createTestDb`; users inserted directly)

```ts
it('creates a habit with normalized rule and trimmed name and emoji', ...)
it('rejects each invalid field with its message', ...) // name '', 41 chars; emoji 'ab'; category 'sports'; atMost/day → period
it('lists only my active habits, ordered by category then name', ...)
it('filters by category and lists archived separately', ...)
it('never returns, updates, archives or restores another user\'s habit', ...) // Review Focus 1: getHabit null; update/archive/restore → null/false; their row unchanged
it('archiving is idempotent and keeps the row', ...)
it('restoring brings it back to the active list', ...)
it('stops at 100 active habits but counts archived ones as free', ...)
it('deleting a user deletes their habits', ...)
```

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement**; `npx drizzle-kit generate --name habits`.
- [ ] **Step 4: Run** `npx vitest --run` → pass.
- [ ] **Step 5: Commit, PR, CI green (preview smoke runs the migration), merge.**

---

### Task 3: Habit library page

**Branch:** `feat/habit-library`

**Files:**

- Create: `src/routes/(app)/me/habits/+page.server.ts`, `+page.svelte`,
  `src/lib/components/HabitRow.svelte`, `HabitRow.svelte.spec.ts`,
  `src/lib/components/CategoryFilter.svelte`, `CategoryFilter.svelte.spec.ts`, `e2e/habits.e2e.ts`
- Modify: `src/routes/(app)/me/+page.svelte` (a "Habit library" link card at the top),
  `e2e/fixtures.ts` (add `newMember`, below)

**Interfaces:**

- Consumes: Task 2 service, Task 1 `CATEGORIES`, `describeRule`.
- Produces:
  - `/me/habits` load: `requireUser`; reads `?category=<id>` (ignored if invalid) and `?archived=1`;
    returns `{ habits, category, archived, counts: Record<CategoryId, number> }`.
  - Actions `archive` and `restore` (field `id`), each `requireUser`; unknown/foreign id → 404;
    restore when full → `fail(400)` with the cap copy.
  - `HabitRow.svelte` props `{ habit: Habit; archived?: boolean }`: emoji, name, `describeRule`,
    a 🔒 "Private" chip when `isPrivate`, an "Edit" link to `/me/habits/{id}` and an
    Archive/Restore button (form posting to `?/archive` / `?/restore`).
  - `CategoryFilter.svelte` props `{ selected: CategoryId | null; counts: Record<CategoryId, number>; archived: boolean }`:
    a list of links (`?category=…`, keeping `archived`) — "All" plus each category with its emoji
    and count; the selected one has `aria-current="true"`. Plain links, so it works without JS.
  - Page: heading "Habit library", "New habit" button → `/me/habits/new`, habits grouped under
    category headings (emoji + label), a toggle link "Show archived (N)" / "Show active", and empty
    states: no habits at all → "No habits yet." plus the starter suggestions panel slot (filled in
    Task 5; for now just the "New habit" button); filter with no matches → "No habits in {category}
    yet."
  - E2E helper in `e2e/fixtures.ts`: `newMember(page): Promise<{ username: string }>` signs up a
    fresh user via `/join/E2E-OPEN` and completes onboarding (reuse existing flows; no DB access).

- [ ] **Step 1: Write failing tests**

```ts
// HabitRow.svelte.spec.ts
it('shows the emoji, name and rule sentence', ...) // "Bike" + "3 times a month"
it('marks private habits with a lock and text, not color alone', ...)
it('offers Restore instead of Archive for archived habits', ...)
// CategoryFilter.svelte.spec.ts
it('links every category with its count and marks the selected one', ...)
it('keeps the archived view when switching category', ...) // href contains archived=1
// e2e/habits.e2e.ts — fresh user per test via newMember. The create form arrives in Task 4, so
// this task's E2E covers the empty library, navigation and guards; grouped lists, filters and
// archive/restore with real habits are covered by component tests here and E2E in Task 4.
test('the library starts empty with a way to add a habit', ...)
test('Me links to the habit library', ...)
test('signed-out visitors are sent to sign in', ...) // /me/habits → /signin?next=%2Fme%2Fhabits
test('archive and restore posts for an unknown id are 404', ...) // Review Focus 1 (route level)
```

- [ ] **Step 2: Run to verify failure.** **Step 3: Implement.** **Step 4: Run all tests.**
- [ ] **Step 5: Commit, PR, CI green, merge.**

---

### Task 4: Create and edit habits

**Branch:** `feat/habit-form`

**Files:**

- Create: `src/lib/components/HabitForm.svelte`, `HabitForm.svelte.spec.ts`,
  `src/routes/(app)/me/habits/new/+page.server.ts`, `+page.svelte`,
  `src/routes/(app)/me/habits/[id]/+page.server.ts`, `+page.svelte`
- Modify: `e2e/habits.e2e.ts`

**Interfaces:**

- Consumes: Task 1 (`targetRange`, `defaultCountMode`, `normalizeRule`, `describeRule`,
  `CATEGORIES`), Task 2 (`createHabit`, `updateHabit`, `getHabit`).
- Produces:
  - `HabitForm.svelte` props `{ values: HabitInput; errors?: Record<string, string>; submitLabel: string }`.
    Fields, in order:
    1. **Emoji** — `TextField`-style input (`name="emoji"`, `inputmode` text, max 16) plus a row of
       quick picks for the selected category (6 per category, defined in the component).
    2. **Name** — `TextField`, label "Name", hint "e.g. Go biking".
    3. **Category** — radio group of the nine categories (emoji + label).
    4. **Kind** — radio group: "Do it" (`atLeast`) / "Limit it" (`atMost`), hint for Limit it:
       "Count slips, like eating out."
    5. **How often** — number input `target` + select `period` ("a day" / "a week" / "a month";
       "a day" hidden and disabled for Limit it) + select `countMode` ("times" / "different days";
       hidden for "a day"). Changing Kind resets count mode to `defaultCountMode` unless the user
       picked one.
    6. **Private** — checkbox "Private: friends see 🔒 instead of the name".
    - A live preview card using `BingoSquare` (`state="empty"`, `showLabel`) and the
      `describeRule` sentence, updated as fields change (shown only when the current values
      normalize).
    - Without JS every field is present; the server is the authority.
  - `/me/habits/new`: `requireUser`; default values `{ emoji: '', name: '', category: 'other', direction: 'atLeast', period: 'week', countMode: 'days', target: 3, isPrivate: false }`;
    action `default` → `createHabit` → on success `redirect(303, '/me/habits?category=' + category)`
    with a `?created=1` flag the library shows as "Habit added." (role status); errors → `fail(400)`
    with values and field errors, focus first invalid field.
  - `/me/habits/[id]`: load via `getHabit` (404 when null); action `save` → `updateHabit`
    (null → 404) → redirect like create with "Habit saved."; action `archive` → `archiveHabit` →
    `/me/habits`. Note on the page: "Changes apply to cards you build from now on." (cards snapshot
    habits — spec §3.3).

- [ ] **Step 1: Write failing tests**

```ts
// HabitForm.svelte.spec.ts
it('hides "a day" when Limit it is chosen', ...)
it('hides the count mode for per-day habits', ...)
it('switching to Limit it defaults the count mode to times', ...)
it('previews the rule sentence and square as you type', ...) // name "Bike", 3, a month, times → "3 times a month"
it('links field errors to inputs', ...) // aria-invalid + aria-describedby on name and target
// e2e/habits.e2e.ts
test('create a habit and see it in its category', ...)
test('edit a habit and see the change', ...)
test('archive from the edit page, then restore from the archived view', ...)
test('a limit per day posted without JS is rejected on the period field', async ({ browser }) => {
	// Review Focus 2: javaScriptEnabled: false; select hidden option by direct form post
})
test("someone else's habit is a 404", ...) // Review Focus 1: user A creates; user B visits /me/habits/<id> → 404; B posts ?/save → 404
test('the form works without JavaScript', ...) // create a habit with JS disabled
```

- [ ] **Step 2: Run to verify failure.** **Step 3: Implement.** **Step 4: Run all tests.**
- [ ] **Step 5: Commit, PR, CI green, merge.**

---

### Task 5: Starter suggestions and onboarding hand-off

**Branch:** `feat/starter-habits`

**Files:**

- Create: `src/lib/game/starters.ts`, `src/lib/game/starters.spec.ts`,
  `src/lib/components/StarterHabits.svelte`, `StarterHabits.svelte.spec.ts`
- Modify: `src/lib/server/habits.ts` (+ spec), `src/routes/(app)/me/habits/+page.server.ts`,
  `+page.svelte`, `src/routes/onboarding/+page.server.ts` (redirect target), `e2e/onboarding.e2e.ts`,
  `e2e/habits.e2e.ts`

**Interfaces:**

- Produces:
  - `STARTERS: readonly { id: string; emoji: string; name: string; category: CategoryId; rule: HabitRule }[]`,
    exactly these ten (from the product's example habits), each valid under `normalizeRule`:
    | id            | emoji | name                 | category | rule                        |
    | ------------- | ----- | -------------------- | -------- | --------------------------- |
    | `read-book`   | 📚    | Finish a book        | learning | atLeast / month / days / 1  |
    | `bike`        | 🚴    | Go biking            | fitness  | atLeast / month / times / 3 |
    | `meditate`    | 🧘    | Meditate             | mind     | atLeast / week / days / 2   |
    | `power-clean` | 🧹    | Power clean          | home     | atLeast / week / days / 2   |
    | `litter`      | 🐈    | Scoop the litter box | home     | atLeast / day / times / 1   |
    | `water`       | 💧    | Drink water          | health   | atLeast / day / times / 8   |
    | `call-friend` | 📞    | Call an old friend   | social   | atLeast / month / days / 1  |
    | `eat-out`     | 🍔    | Eat out              | money    | atMost / month / times / 10 |
    | `naps`        | 😴    | Nap                  | health   | atMost / month / days / 3   |
    | `no-alcohol`  | 🍺    | Alcohol              | health   | atMost / month / days / 0   |
  - `addStarter(db: Db, userId: string, starterId: string): Promise<{ ok: true; added: boolean } | { ok: false; message: string }>`
    — `added: false` when the user already has an **active** habit with the same name
    (case-insensitive); unknown id → `{ ok: false, message: 'Unknown suggestion.' }`; respects the
    100 cap.
  - `StarterHabits.svelte` props `{ addedIds: string[] }`: a grid of starter cards (emoji, name,
    `describeRule`), each a form posting `?/addStarter` with `starterId`; already-added cards show
    "Added ✓" and a disabled button. Heading "Quick start", lede "Tap to add. You can change them
    later."
  - `/me/habits` gains action `addStarter` (`requireUser`) and shows `StarterHabits` when the
    library is empty **or** when `?welcome=1`; load returns `addedIds` (starter ids whose names match
    active habits).
  - Onboarding's successful redirect changes from `/today` to `/me/habits?welcome=1` (spec §4.2
    step 2), with a "Continue to Today" link at the bottom of the welcome view. Update the
    onboarding E2E tests that expect `/today`.

- [ ] **Step 1: Write failing tests**

```ts
// starters.spec.ts
it('has exactly the ten starters, each a valid rule', ...)
// habits.spec.ts additions
it('adding a starter creates the habit once', ...) // second add → added:false, still one row (Review Focus 5)
it('a starter matching an archived habit is added again', ...)
it('unknown starter ids are refused', ...)
// StarterHabits.svelte.spec.ts
it('marks added starters and disables them', ...)
// e2e
test('after onboarding, new members land on Quick start and can add a starter', ...)
test('double-tapping a starter adds it once', ...) // Review Focus 5: two rapid clicks → one row "Go biking"
```

- [ ] **Step 2: Run to verify failure.** **Step 3: Implement.** **Step 4: Run all tests.**
- [ ] **Step 5: Commit, PR, CI green, merge.**

---

### Task 6: Accessibility follow-ups from M1 (issue #40)

**Branch:** `fix/a11y-followups`

Spec §8 items deferred from M1 that touch forms M2 builds on.

**Files:**

- Modify: `src/routes/onboarding/+page.svelte`, `src/routes/(app)/me/+page.svelte`,
  `src/lib/components/EmojiPicker.svelte` (+ spec), `src/routes/(app)/+layout.svelte`,
  `src/routes/+layout.svelte`, `src/routes/reset/[token]/+page.svelte`, the relevant E2E specs

**Requirements:**

- `EmojiPicker` accepts `error?: string`: sets `aria-invalid="true"` on the radiogroup and links the
  error via `aria-describedby`; onboarding and Me pass the avatar error; focus-on-error reaches it.
- Me's week-start radiogroup gets the same treatment.
- The app header is a `banner` landmark (move it outside the root `<main>`, or restructure the root
  layout so `(app)` pages render `<header>` before `<main>`), and the E2E header locators use
  `getByRole('banner')`.
- The reset page includes a hidden `autocomplete="username"` field with the user's username so
  password managers save the right account (load returns `username` for valid tokens only).
- Tick the corresponding boxes in issue #40 in the PR description (don't edit the issue).

- [ ] **Step 1: Write failing tests** — component test: `EmojiPicker` with `error` exposes
      `aria-invalid` and the described-by text; E2E: `getByRole('banner')` contains `@username`;
      reset page has an `input[autocomplete="username"]` with the right value.
- [ ] **Step 2–5:** run failing, implement, run all, commit/PR/CI/merge.

---

### Task 7: Ship it

**Branch:** none (release only)

- [ ] Confirm production `/api/health` is `ok/ok` after Task 6 merges (migration `0004` ran).
- [ ] With the human partner on production: create a habit, edit it, archive and restore it, add a
      starter, and check the library on a phone.
- [ ] Close milestone "M2: Habit library"; approve and merge the release-please PR (`v0.3.0`).
