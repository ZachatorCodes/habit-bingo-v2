# Wide-screen UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give iPad and computer screens (≥768px) their own layout — left sidebar, side-panel habit sheet, two-pane screens — while the phone UI below 768px stays exactly as it is.

**Architecture:** Responsive CSS only: Tailwind `md:` (≥768px) and `lg:` (≥1024px) variants added to existing pages and components; no JS screen detection, no new routes. Wide-only markup is present in the page and hidden below its breakpoint. Two server loads return a little more data (Today: the board; group page: both leaderboard and members).

**Tech Stack:** SvelteKit 2, Svelte 5 runes, Tailwind v4, Vitest browser project, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-23-wide-screens-design.md` (the authority; read §3–§6 for your task).

## Global Constraints

- Below 768px nothing changes, visually or in behaviour. Every new class carries an `md:`/`lg:`/`xl:` prefix or sits on markup hidden below its breakpoint (`hidden md:block`). Phone-only markup gains `md:hidden` only.
- Breakpoints: 768–1023px icon-only sidebar (72px), one roomy column; ≥1024px labelled sidebar (220px), two panes, content max-width 1200px centred; ≥1280px (`xl:`) for 3-column grids.
- Garden tokens and type only; text ≥ 12px; tap targets ≥ 44px; hover effects only inside `@media (hover: hover)`; motion only under `motion-safe`.
- Keep routes, form names, h1 texts and accessible names unchanged (e2e select by them). One `<nav aria-label="Main">` landmark (restyled per breakpoint), never two.
- No new features, data, migrations or dependencies.
- Before committing: `npm run check`, `npx prettier --check` and `npx eslint` on touched files; run the task's e2e on all three Playwright projects.

## Review Focus

1. Phone regression: any wide-screen class leaking below 768px. Test: Task 1 adds `e2e/wide.e2e.ts` "phone keeps bottom tabs" (390px: sidebar landmark styled as bottom bar — nav bounding box at the bottom, height < 120) and the full phone project must stay green in every task.
2. Horizontal scroll at the in-between widths (768, 1024, 1440) on every main screen. Test: Task 1 creates the shared helper `expectNoHorizontalScroll(page)` and each screen task adds its routes to the loop test "no horizontal scroll at wide widths".
3. Side panel focus: opening the habit panel from a board square at ≥768px must trap focus and return it to that square on close. Test: Task 1 "habit panel holds and returns focus" (desktop project).
4. Today with no card at ≥1024px: right pane shows "Build one", never an empty column. Test: Task 2 "today without a card shows Build one beside the list".
5. Group page deep links: `?tab=members` on desktop still works (both panes visible, Members focused/scrolled into view is not required), and on phone/iPad portrait still shows only Members. Test: Task 4 "members tab link works at every width".

---

### Task 1: Shell — sidebar, side panel, offsets, tablet project

**Files:**

- Modify: `playwright.config.ts` (add `{ name: 'tablet', use: { ...devices['iPad (gen 7)'], viewport: { width: 820, height: 1180 } } }`), `src/routes/(app)/+layout.svelte`, `src/lib/components/Hero.svelte`, `src/lib/components/Sheet.svelte`, `src/lib/components/CookieNotice.svelte`, `src/lib/components/Toast.svelte`
- Create: `e2e/wide.e2e.ts`, helper `expectNoHorizontalScroll(page: Page): Promise<void>` exported from `e2e/fixtures.ts`
- Test: `src/lib/components/Sheet.svelte.spec.ts`

**Interfaces:**

- Produces: CSS variable `--sidebar` on `html` (`0px` below 768, `72px` at md, `220px` at lg) used by every later offset; content wrapper class pattern `md:ml-[var(--sidebar)]`; `expectNoHorizontalScroll(page)` asserting `document.documentElement.scrollWidth <= innerWidth`.

- [ ] **Step 1: Write the failing tests** in `e2e/wide.e2e.ts` (use `test.skip` on project names where a test doesn't apply):
  - "phone keeps bottom tabs" (phone): Main nav's bounding box bottom equals viewport height ±2px and its height < 120.
  - "sidebar navigates and marks the current page" (tablet, desktop): Main nav box `x === 0`, height ≥ viewport height − 2; click "Card" → URL `/card` and that link `aria-current="page"`; on desktop the link text "Card" is visible, on tablet it is not (icon-only, accessible name kept via `aria-label`).
  - "habit panel holds and returns focus" (desktop): on `/card` with a started card, click a square → dialog visible with box `x + width === viewport width ±2` and width ≈ 420 (±4); Tab cycles inside; Escape closes; focus returns to the square.
  - "no horizontal scroll at wide widths": for widths [768, 1024, 1440] × routes ['/today', '/card'] → `expectNoHorizontalScroll`.
  - `Sheet.svelte.spec.ts` "does not lock page scroll at md and up": stub `window.matchMedia` to match `(min-width: 768px)`, open → `documentElement.style.overflow` is not `hidden`.
- [ ] **Step 2: Run** `npx playwright test e2e/wide.e2e.ts` and the Sheet spec. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Layout: keep the single `<nav aria-label="Main">`; below md it keeps today's fixed bottom-tab CSS; at md it becomes `position: fixed; inset: 0 auto 0 0; width: var(--sidebar)`, flex column, surface bg, 1px `line` right border, padding `var(--safe-top)` / `var(--safe-bottom)` / `env(safe-area-inset-left)`, Habit Bingo mark (`Icon name="target"` + "Habit Bingo" text at lg) on top; items 44px+ rows, current item forest fill + white; labels `sr-only` at md, visible at lg (keep each link's accessible name identical). Move tab hover/raise styles under `@media (max-width: 767px)`. Body `--tab-bar` padding only below md. `<main>` gets `md:ml-[var(--sidebar)]` and inner `lg:mx-auto lg:max-w-[1200px]`.
  - `--sidebar` defined on `:root`/`html` in the layout's global style with media queries.
  - Hero at md: `md:m-4 md:rounded-[24px]` (keep phone classes), and the following sheet panels get `md:mx-4` via the existing sheet pattern pages use — do this once in Hero/the shared pattern; pages are adjusted in later tasks if they hard-code it.
  - Sheet at md: right panel (`md:fixed md:inset-y-0 md:right-0 md:w-[min(420px,calc(100vw-var(--sidebar)))] md:max-h-none md:rounded-none md:rounded-l-[24px]`), backdrop `md:backdrop:bg-ink/20`, slide-in keyframe under `motion-safe` only; scroll lock only when `matchMedia('(max-width: 767px)').matches`.
  - Cookie notice and Toast: left offset `md:left-[calc(var(--sidebar)+1rem)]`; their bottom offset uses `--tab-bar` only below md (at md they sit 1rem from the bottom).
- [ ] **Step 4: Run** `npx playwright test e2e/wide.e2e.ts e2e/shell.e2e.ts e2e/habit-sheet.e2e.ts e2e/today.e2e.ts` (all projects) and `npx vitest run src/lib/components`. Expected: all pass.
- [ ] **Step 5: Commit** `feat(wide): sidebar, side panel and tablet test project`.

### Task 2: Today and Card

**Files:**

- Modify: `src/routes/(app)/today/+page.server.ts` (+ `.svelte`), `src/routes/(app)/card/+page.svelte`, `src/routes/(app)/groups/[id]/members/[userId]/+page.svelte`, `src/lib/components/CardBoard.svelte`, `src/lib/components/BingoSquare.svelte` (compact rules only)
- Test: `e2e/wide.e2e.ts`

**Interfaces:**

- Consumes: `cardView(db, userId, card, today, known?)` from `src/lib/server/card-view.ts` — Today's load passes the check-ins it already fetched as `known` to avoid a second query.
- Produces: Today `data.board: { squares: ViewSquare[]; score: CardScore; size: CardSize } | null`.

- [ ] **Step 1: Write the failing tests** (desktop project):
  - "today shows the board beside the list": `/today` → a `region` named "Your card" is visible and its box `x` > the "Do today" heading's box right edge; log "Drink water" → the board's Drink water square `aria-label` changes (wait for `/today/__data.json`).
  - "today without a card shows Build one beside the list": new member → "Your card" region contains link "Build one".
  - "card names show on 5×5 at wide widths": 5×5 card at 1440 → every square's name text is visible.
  - Add '/groups/<id>/members/<userId>' is covered in Task 4; here add '/card' already in the loop.
- [ ] **Step 2: Run** `npx playwright test e2e/wide.e2e.ts --project=desktop`. Expected: new tests FAIL.
- [ ] **Step 3: Implement.**
  - Today load: when a card exists, also return `board` from `cardView` (reusing fetched check-ins); else `board: null`.
  - Today page at lg: `lg:grid lg:grid-cols-[1fr_420px] lg:gap-6`; left = hero + sections; right = `<section aria-label="Your card" class="hidden lg:block lg:sticky lg:top-4 self-start">` with `CardHeader` + `CardBoard` (squares open the habit panel via the existing `/card/squares/[id]` link/shallow routing the Card page uses), or the Build one CTA when `board` is null.
  - Card page at lg: board column + summary column (`lg:grid lg:grid-cols-[minmax(0,640px)_1fr]`); CardBoard squares grow to ~120px at lg and names show for 5×5 at md+ (BingoSquare's compact/hide-name rule becomes `max-md:` only).
  - Member card page: same lg layout as Card.
- [ ] **Step 4: Run** `npx playwright test e2e/wide.e2e.ts e2e/today.e2e.ts e2e/card.e2e.ts e2e/groups.e2e.ts e2e/next-month.e2e.ts`. Expected: all pass, all projects.
- [ ] **Step 5: Commit** `feat(wide): today with the board beside it; roomier card`.

### Task 3: Card builder and habit library

**Files:**

- Modify: `src/routes/(app)/card/build/[step]/+page.svelte`, `src/routes/(app)/me/habits/+page.svelte`, `src/routes/(app)/me/habits/HabitFormPage.svelte`, `src/lib/components/CategoryFilter.svelte`
- Test: `e2e/wide.e2e.ts`

- [ ] **Step 1: Write the failing tests** (desktop): "builder previews picks on the habits step": on the habits step pick 2 habits → a `region` named "Preview" contains 2 squares named after them; "library filter is a side list": at 1440 the category navigation's box is left of the first habit row and stacked vertically (second chip's `y` > first chip's `y`); add '/card/build/habits' and '/me/habits' to the no-scroll loop.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement.** Habits step at lg: `lg:grid lg:grid-cols-[1fr_380px]`; right `<section aria-label="Preview" class="hidden lg:block lg:sticky lg:top-4">` renders `CardBoard` with the picked habits in pick order (placeholder `empty` state, the free centre square in place) — client-side from the current picks. Size/Targets/Rewards steps: `md:mx-auto md:max-w-[640px]`. Library at lg: `lg:grid lg:grid-cols-[220px_1fr]`, `CategoryFilter` gets `lg:flex-col` (chips full width), Quick start below the rows. Habit form page: `md:mx-auto md:max-w-[640px]`.
- [ ] **Step 4: Run** `npx playwright test e2e/wide.e2e.ts e2e/card-builder.e2e.ts e2e/habits.e2e.ts`. Expected: pass, all projects.
- [ ] **Step 5: Commit** `feat(wide): builder preview and library side filter`.

### Task 4: Groups, Me, History, Admin

**Files:**

- Modify: `src/routes/(app)/groups/+page.svelte`, `src/routes/(app)/groups/[id]/+page.server.ts` (+ `.svelte`), `src/routes/(app)/me/+page.svelte`, `src/routes/(app)/me/history/+page.svelte`, `src/routes/(app)/me/history/[month]/+page.svelte`, `src/routes/(app)/admin/+page.svelte`
- Test: `e2e/wide.e2e.ts`

- [ ] **Step 1: Write the failing tests:** "group page shows leaderboard and members side by side" (desktop): both the "Leaderboard" and "Members" regions visible, Members box `x` > Leaderboard box right; tab links hidden. "members tab link works at every width": `?tab=members` → Members region visible on all projects; on phone only Members (no leaderboard list). Add '/groups', the group page, '/me', '/me/history', '/admin' (admin user) to the no-scroll loop.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement.** Group load: always compute `leaderboard` (drop the `tab ===` condition); `tab` still drives which pane shows below lg. Group page at lg: two labelled regions side by side, tab links `lg:hidden`, each pane always rendered at lg (`hidden lg:block` for the inactive one). Groups list: `md:grid md:grid-cols-2 xl:grid-cols-3`. Me at lg: two columns (Profile + Settings left; links, Password, Google, Sessions, Sign out, Danger zone right). History grid `md:grid-cols-2 xl:grid-cols-3`; recap board + stats side by side at lg. Admin at lg: create form left, invite list right.
- [ ] **Step 4: Run** `npx playwright test e2e/wide.e2e.ts e2e/groups.e2e.ts e2e/me.e2e.ts e2e/recap.e2e.ts e2e/admin.e2e.ts e2e/join.e2e.ts`. Expected: pass, all projects.
- [ ] **Step 5: Commit** `feat(wide): groups, me, history and admin layouts`.

### Task 5: Public pages

**Files:**

- Modify: `src/routes/+page.svelte`, `src/routes/signin/+page.svelte`, `src/routes/join/[code]/+page.svelte`, `src/routes/reset/[token]/+page.svelte`, `src/routes/onboarding/+page.svelte`, `src/routes/privacy/+page.svelte`, `src/routes/terms/+page.svelte`, `src/routes/+error.svelte`
- Test: `e2e/wide.e2e.ts`

- [ ] **Step 1: Write the failing tests** (tablet, desktop): "sign-in is a centred card": the form's box width ≤ 480 and its centre within 4px of the viewport centre; "landing band pads for the notch": with `--safe-top: 40px` set on `html`, the h1 box `y` ≥ 40 + 32 at md. Add '/', '/signin', '/privacy' to the no-scroll loop.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement.** Auth-style pages (sign-in, join, reset, onboarding, error) at md: full-height forest background, hero text above, sheet as a centred card `md:mx-auto md:max-w-[480px] md:rounded-[24px]`. Privacy/terms: `md:mx-auto md:max-w-[720px]`. Landing: replace `md:py-20` with `md:pt-[calc(5rem+var(--safe-top))] md:pb-20`.
- [ ] **Step 4: Run** `npx playwright test e2e/wide.e2e.ts e2e/public-pages.e2e.ts e2e/sign-in.e2e.ts e2e/join.e2e.ts e2e/onboarding.e2e.ts`. Expected: pass.
- [ ] **Step 5: Commit** `feat(wide): public pages as centred cards`.

### Task 6: Verify and ship

- [ ] **Step 1: Run** `npm run check`, `npx eslint src e2e`, `npx vitest run --coverage`, `npx playwright test` (phone, tablet, desktop). Expected: all green.
- [ ] **Step 2: Visual pass** on the local seeded server (`.claude/launch.json` "e2e-local") at 390, 820, 1180 and 1440px: Today, Card + panel, builder habits step, library, group page, Me, sign-in. The 390px screenshots must match the phone UI.
- [ ] **Step 3: Final whole-branch review, one fix pass.**
- [ ] **Step 4: Push** `design/wide-screens`, open PR "feat(design): wide-screen UI for iPad and computer"; the owner merges.
