# Garden Redesign PR 3: Secondary Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the BINGO! celebration (carried from PR 2) and the remaining signed-in screens
(habit library and forms, Groups, Me, History and Recap, Admin) in the Garden style.

**Architecture:** Same pattern as PR 2: every screen is a `Hero` banner plus `surface` sheets
overlapping it; rows and tiles use `Icon`/`ProgressRing`. Routes, loads, actions, field names and
game rules stay unchanged. Public pages (landing, sign-in, join, reset, onboarding, legal, error)
are PR 4.

**Tech Stack:** SvelteKit 3 / Svelte 5 runes, Tailwind v4 Garden tokens, Vitest (server + browser),
Playwright.

**Spec:** `docs/superpowers/specs/2026-10-16-garden-redesign-design.md` (§2 design system; §3
BINGO!, Habit library, Groups, Me/History/Recap/Admin; §6 testing).

## Global Constraints

- Everything in PR 2's Global Constraints holds
  (`docs/superpowers/plans/2026-10-17-garden-pr2-core-screens.md`): Garden colors, Nunito weights
  400–800 only (no `font-black`), no text under 11px, no hard offset shadows, 44px tap targets,
  WCAG AA, states not by color alone, reduced motion, no-JS forms, local Phosphor icons
  `aria-hidden`.
- Screen pattern (as Today and Card): `Hero` then
  `<section class="relative -mt-[18px] rounded-[24px] bg-surface shadow-sheet">`; extra sheets
  below get `mt-4` and the same classes. Controls on `surface` use a 1px `line` border; selected
  state is `forest` plus a non-color cue (check icon, weight, `aria-current`/`aria-selected`).
- In every file touched, replace old aliases (`cream`, `accent`, `earn*`, `protect*`, `risk*`,
  `lost`, `border-ink` sticker outlines, `shadow-[0_3px_0_…]`, `text-ink/NN`) with Garden tokens
  (`page`, `forest`, `earned-tile`, `protected-tile`, `protected-ring`, `risk-tile`, `terracotta`,
  `lost-ring`, `line`, `muted`), and replace emoji in copy with `Icon`.
- Keep visible heading and button text the same unless this plan names new text (e2e uses them).
- UI tasks load `taste-skill:design-taste-frontend` first; the spec wins on conflict.
- `.env` is production: never `npm run dev`/`db:migrate`. Verify with `npm run check`,
  `npx vitest --run --coverage` (`src/lib/game` 100%), `npx playwright test`.

## Review Focus

1. Confirm dialogs (Leave group, Remove member, Reset link, Delete habit, Delete account) must keep
   working with keyboard, focus return and without JavaScript after the restyle. Test: each owning
   task keeps its e2e green (`groups.e2e.ts`, `habits.e2e.ts`, `me.e2e.ts`).
2. Private habits on a member's card still show the lock and no name. Test: Task 3 keeps
   `groups.e2e.ts` "private habits show a lock" (or the existing equivalent) green.
3. The leaderboard's This month / All-time switch is still a real link/tab with
   `aria-current`/`aria-selected` and works without JavaScript. Test: Task 3
   `tabs mark the current board`.
4. The BINGO! reveal still traps focus, returns it, and skips confetti under reduced motion.
   Test: Task 1 keeps `today.e2e.ts` "reduced motion: no confetti canvas" and the reveal tests
   green, plus the new spec.
5. Long names (40-char habit, group and display names) wrap or truncate without horizontal scroll
   at 360px. Test: Task 2 `a long habit name fits a phone` (e2e, habits library at 360px).

---

### Task 1: BINGO! celebration and builder border fix (carried from PR 2)

**Files:**

- Modify: `src/lib/components/BingoCelebration.svelte` (+ spec), `src/lib/celebrate.ts`,
  `src/lib/components/HabitPicker.svelte`

**Interfaces:**

- The banner and reward reveal become one centered `surface` sheet (24px radius, `shadow-sheet`,
  no ink border, no offset shadow): a `trophy` icon in an `lg` `earned` `ProgressRing`, "BINGO!"
  (800, 36px, `forest`), the earned rewards as rows ("First bingo — {reward}"), and the forest
  "Nice!" button. Behavior, focus, timing and props unchanged.
- `celebrate.ts`: export `CONFETTI_COLORS = ['#2F5D46', '#4E7E62', '#E3ECDD', '#D9693F', '#5B8AA6']`
  and use it for all confetti. No confetti under reduced motion (unchanged).
- `HabitPicker`: rows are `border-2 border-line` by default and `border-forest` when checked, so
  selecting does not shift layout.

- [ ] **Step 1: Failing tests:** `BingoCelebration.svelte.spec.ts` `it('shows BINGO! and each
earned reward')` (heading "BINGO!", one row per tier with its reward text);
      `it('uses the Garden confetti palette')` (`CONFETTI_COLORS` equals the five values above).
- [ ] **Step 2: Run** `npx vitest --run src/lib/components/BingoCelebration.svelte.spec.ts` → FAIL.
- [ ] **Step 3: Implement** per Interfaces.
- [ ] **Step 4: Run** the spec and HabitPicker spec → PASS; `npx playwright test e2e/bingo.e2e.ts
e2e/today.e2e.ts e2e/card-builder.e2e.ts` → PASS.
- [ ] **Step 5: Commit** `feat(bingo): Garden celebration; steady habit picker border`.

### Task 2: Habit library and habit forms

**Files:**

- Modify: `src/routes/(app)/me/habits/+page.svelte`, `HabitFormPage.svelte`, `new/+page.svelte`,
  `[id]/+page.svelte`, `[id]/delete/+page.svelte`, `src/lib/components/HabitRow.svelte`,
  `HabitForm.svelte`, `CategoryFilter.svelte`, `StarterHabits.svelte`, their specs,
  `e2e/habits.e2e.ts` (selectors only, plus the new test)

**Interfaces:**

- Library: `Hero` "Habit library" with summary "Everything you can put on a card."; a sheet with
  `CategoryFilter` chips (icon + label + count; selected forest with white text and
  `aria-current="page"`), the habit rows (`sm` ring with icon, name 700, rule `muted`, private
  `lock` icon with sr-only "Private", row actions as 44px icon buttons with `aria-label`s), the
  "New habit" forest button, and "Show archived (n)" as a quiet link. Quick start (`StarterHabits`)
  is its own sheet of selectable tiles with a "+ Add" pill.
- New / edit: `Hero` with the existing heading text; `HabitForm` on a sheet: `IconPicker` (groups),
  name `TextField`, category chips, kind radios ("Do it" / "Limit it") as two tiles with an icon
  each (`check-circle` for Do it, `prohibit` for Limit it; add them to `icons.ts`
  under group other if missing), target inputs, the private toggle, Save (forest) and Cancel.
- Delete confirm page: `Hero` "Delete {name}?" and a sheet with the consequence text and a
  terracotta-outlined destructive button (white surface, `terracotta` border and text) plus Cancel.

- [ ] **Step 1: Failing e2e** in `habits.e2e.ts`: `test('a long habit name fits a phone', …)` —
      create a habit with a 40-character name, open `/me/habits` at 360×800, assert
      `document.documentElement.scrollWidth <= 360` and the name is visible.
- [ ] **Step 2: Run** `npx playwright test e2e/habits.e2e.ts -g "long habit name"` → FAIL or PASS;
      record which (it guards the restyle either way).
- [ ] **Step 3: Implement** per Interfaces; update component specs that pinned removed classes to
      assert roles, names and checked state.
- [ ] **Step 4: Run** the touched component specs → PASS; `npx playwright test e2e/habits.e2e.ts
e2e/card-builder.e2e.ts` → PASS.
- [ ] **Step 5: Commit** `feat(habits): Garden habit library and forms`.

### Task 3: Groups

**Files:**

- Modify: `src/routes/(app)/groups/+page.svelte`, `new/+page.svelte`, `[id]/+page.svelte`,
  `[id]/members/[userId]/+page.svelte`, `src/lib/components/CopyField.svelte`, specs,
  `e2e/groups.e2e.ts`, `e2e/join.e2e.ts` (selectors only, plus the new test)

**Interfaces:**

- List: `Hero` "Groups" (summary: "{n} group(s)" or "No groups yet"); a sheet of rows (group icon on
  a `earned-tile` circle, name 700, member count `muted`, chevron) and the forest
  "Create a group" button. Empty state copy unchanged, with an icon.
- New: `Hero` "Create a group"; form sheet with `IconPicker` (groups) and name.
- Group page: `Hero` with the group icon and name and "{n} members"; one sheet with two tabs
  (Leaderboard, Members) as real links with `aria-current="page"` on the active one; Leaderboard
  has the This month / All-time switch (pill links, active forest + `aria-current`), ranked rows
  (rank number 800 tabular, avatar icon on a circle, display name, points tabular, "You" marked
  with a `forest` left dot + sr-only "you"); Members has rows with avatar, name, "Owner" tag, the
  owner's Remove action; below, a sheet with the invite `CopyField` (surface field, forest Copy
  button with icon), Reset link and Leave group via `ConfirmAction`.
- Member's card: `Hero` "{name}'s card" with points; the read-only `CardBoard` on a sheet;
  private squares keep the `lock` icon.

- [ ] **Step 1: Failing test** in `groups.e2e.ts`: `test('tabs mark the current board', …)` —
      on a group page, the active Leaderboard tab and the "This month" pill have `aria-current="page"`;
      after clicking "All-time", that pill has it and "This month" does not.
- [ ] **Step 2: Run** `npx playwright test e2e/groups.e2e.ts -g "tabs mark"` → record result.
- [ ] **Step 3: Implement** per Interfaces.
- [ ] **Step 4: Run** CopyField and group specs → PASS; `npx playwright test e2e/groups.e2e.ts
e2e/join.e2e.ts` → PASS (including the private-habit lock test).
- [ ] **Step 5: Commit** `feat(groups): Garden groups screens`.

### Task 4: Me, History, Recap and Admin

**Files:**

- Modify: `src/routes/(app)/me/+page.svelte`, `src/routes/(app)/me/history/+page.svelte`,
  `[month]/+page.svelte`, `src/routes/(app)/admin/+page.svelte`, specs, `e2e/me.e2e.ts`,
  `e2e/recap.e2e.ts`, `e2e/admin.e2e.ts` (selectors only)

**Interfaces:**

- Me: `Hero` with the avatar icon on a circle, display name and "@username"; settings grouped into
  sheets with 12px 800 section headings (Profile, Settings, Password, Google, Sessions, Danger
  zone); links to Habit library and History as rows with chevrons at the top. Delete account stays
  behind `ConfirmAction` with the terracotta-outlined destructive style.
- History: `Hero` "History"; month rows (month name, points tabular, a small earned/total
  indicator, chevron).
- Recap: `Hero` "{Month} recap" with points; sheets for the board (`CardBoard`, read-only),
  rewards earned (rows with `trophy` icon), most-logged habit (ring + icon), category breakdown
  (rows with category icon and counts).
- Admin: `Hero` "Admin"; sheets for Create invite (form) and Reset link (form) and the invite list
  as rows; generated links in `CopyField`.

- [ ] **Step 1: Run** the Me/History/Admin component specs and
      `npx playwright test e2e/me.e2e.ts e2e/recap.e2e.ts e2e/admin.e2e.ts` → record the baseline.
- [ ] **Step 2: Implement** per Interfaces; update specs that pinned removed classes.
- [ ] **Step 3: Run** the same specs and e2e → PASS.
- [ ] **Step 4: Commit** `feat(me): Garden Me, History, Recap and Admin`.

### Task 5: Shared-component sweep

**Files:**

- Modify: `src/lib/components/{ConfirmAction,Sheet,IconPicker,TodayRow}.svelte` and any other
  signed-in component still matching
  `grep -rn "font-black\|shadow-\[0_3px\|bg-accent\|bg-cream\|border-ink\|text-ink/" src/lib/components src/routes/\(app\)`

**Interfaces:**

- Replace each match with its Garden equivalent (focus rings may stay `outline-ink`: an outline
  is not a sticker border). No behavior change.

- [ ] **Step 1: Run** the grep → list matches in the report.
- [ ] **Step 2: Replace** them; re-run the grep → only `outline-ink`/`focus-visible` hits remain.
- [ ] **Step 3: Run** `npx vitest --run --project client` → PASS.
- [ ] **Step 4: Commit** `style: finish Garden tokens in signed-in components`.

### Task 6: Full verification, final review and PR

- [ ] **Step 1:** `npm run check` → 0 errors.
- [ ] **Step 2:** `npx vitest --run --coverage` → all pass, `src/lib/game` 100%.
- [ ] **Step 3:** `npx playwright test` → all pass (phone + desktop).
- [ ] **Step 4:** Final whole-branch review (most capable model), one fix wave, re-run the suite.
- [ ] **Step 5:** Push and open the PR (owner merges): `feat(design): Garden secondary screens`.
