# Phone web-app polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Habit Bingo feel like a clean, native iPhone home-screen app. Fix the issues found in the 2026-10-22 UI/UX audit at 390×844: blockers, accessibility, smoothness and visual clutter.

**Architecture:** Most fixes are markup and CSS:

- the app shell (`app.html`, the manifest, the signed-in layout);
- the landing grid;
- per-page titles;
- a handful of shared components.

No routes, forms, server actions or game rules change, except two:

- the home-screen start URL;
- moving Sign out into the Me page.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, Tailwind v4, Vitest browser project, Playwright (phone + desktop).

**Spec:** `docs/superpowers/specs/2026-10-16-garden-redesign-design.md` (§2 design system, §3 screens, §6 accessibility). The audit findings in this plan's tasks are the requirements; where they conflict with the spec, the spec wins.

## Global Constraints

- Tokens only: page `#F5F1E8`, surface `#FFFDF8`, ink, muted, line, forest `#2F5D46`, leaf, terracotta, the tile tokens, `shadow-sheet`, and the radius tokens. Never `text-ink/NN`, `font-black`, offset shadows or emoji.
- Text ≥ 4.5:1; focus rings and icon-only controls ≥ 3:1. No rendered text below 12px (raised from the spec's 11px for phone legibility).
- Every tap target is ≥ 44×44px. Inline links inside a sentence are exempt.
- Hover effects go only inside `@media (hover: hover)`, so they never stick after a tap on iOS.
- Respect `prefers-reduced-motion` for every new transition.
- Keep every h1 text, form field name, action and route, except where a task says otherwise. E2E tests select by accessible names.
- iPhone safe areas: `viewport-fit=cover` is on, so anything fixed or full-bleed at the top or bottom must pad with `env(safe-area-inset-*)`.
- Before committing: `npm run check`, plus `npx prettier --check` and `npx eslint` on the touched files.

## Review Focus

1. **Installed web app on a notched iPhone.**
   - The hero must not sit under the status bar.
   - The tab labels must clear the home indicator.
   - Test: Task 1 e2e "tab bar pads for the home indicator" injects a fake safe-area inset through a CSS variable override.
2. **Taps between tabs.** The gap between two tabs must never activate content behind the bar. Test: Task 1 e2e "the tab bar covers content behind it".
3. **The sheet's background scroll.** While a habit sheet is open the page behind must not scroll, and closing the sheet restores scrolling. Test: Task 4 spec "Sheet locks page scroll while open".
4. **Double taps on "+".** A second tap while the first log is in flight must not log twice. Test: Task 4 e2e "a double tap on + logs once".
5. **Signed-in launch.** Opening the installed app lands on Today. A signed-out user who opens it ends up on sign-in, not on an error. Test: Task 1 e2e "start URL leads to Today or sign-in".

---

### Task 1: App shell for an installed iPhone app

**Files:**

- Modify:
  - `src/app.html`, `static/manifest.webmanifest`
  - `src/routes/(app)/+layout.svelte`, `src/routes/+layout.svelte`
  - `src/lib/components/Hero.svelte`
  - `src/routes/(app)/me/+page.svelte` (gains Sign out)
- Test: `e2e/shell.e2e.ts` (new), plus existing e2e that click the header "Sign out"

**Interfaces:**

- Produces:
  - no `<header>` bar in the signed-in layout;
  - Sign out lives on `/me` as `<form method="POST" action="/signout"><button>Sign out</button></form>`;
  - the root layout renders `SiteFooter` only on non-(app) routes;
  - `--tab-bar` stays the body padding variable.

- [ ] **Step 1: Write the failing tests** in `e2e/shell.e2e.ts`, phone viewport 390×844, signed in with the `signIn` fixture:
  - "no header bar on signed-in pages": `/today` has no `banner` landmark and no "Sign out" button. `/me` has `getByRole('button', { name: 'Sign out' })`.
  - "no site footer on signed-in pages": on `/today`, `getByRole('link', { name: 'Privacy' })` has count 0.
  - "Me tab is current under /me": on `/me/habits`, `getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Me' })` has `aria-current="page"`.
  - "the tab bar covers content behind it": at the midpoint between the Today and Card tabs, 4px above the bar's bottom edge, `document.elementFromPoint(x, y)?.closest('nav[aria-label="Main"]')` is not null.
  - "tab bar pads for the home indicator": set `document.documentElement.style.setProperty('--safe-bottom', '34px')`. Then the Today tab label's bottom is ≥ 34px above the viewport bottom.
  - "start URL leads to Today or sign-in": fetch `/manifest.webmanifest`, and `start_url` is `/today`. Signed out, `page.goto('/today')` ends on `/signin`.
- [ ] **Step 2: Run** `npx playwright test e2e/shell.e2e.ts --project=phone`. Expected: all fail.
- [ ] **Step 3: Implement.**
  - **`app.html`:**
    - viewport becomes `width=device-width, initial-scale=1, viewport-fit=cover`;
    - `theme-color` becomes `#2F5D46`;
    - add `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">` and `<meta name="apple-mobile-web-app-title" content="Bingo">`.
  - **`layout.css`:** on `:root`, define `--safe-top: env(safe-area-inset-top, 0px)` and `--safe-bottom: env(safe-area-inset-bottom, 0px)`, and use those variables everywhere, so tests can override them.
  - **Manifest:** `start_url` "/today", `background_color` "#F5F1E8", `theme_color` "#2F5D46".
  - **Signed-in layout:**
    - Delete the `<header>` (avatar, username, Sign out) but keep the `<nav aria-label="Main">`, moved directly into the layout.
    - Me uses `current('/me', true)`.
    - The bar becomes `position: fixed; inset: auto 0 0 0` with `background: var(--color-surface)`, a 1px `line` top border and `padding-bottom: var(--safe-bottom)`. Drop `pointer-events: none`.
    - The tabs keep their raised folder look on top of that solid base. Tab height excludes the safe area (`height: 64px`), and `--tab-bar: calc(76px + var(--safe-bottom))`.
    - Move `.tab:hover` into `@media (hover: hover)`.
    - Delete the now-unused `.shell/.who/.avatar/.name/.signout` styles.
  - **Root layout:** render `<SiteFooter />` only when `!ownsMain`.
  - **`Hero.svelte`:** `pt-8` becomes `pt-[calc(2rem+var(--safe-top))]`. Do the same for the landing band in `src/routes/+page.svelte`.
  - **Me page:** add a "Sign out" button (secondary `Button`, full width) at the end of the Settings sheet, before Danger zone.
- [ ] **Step 4: Fix the existing e2e** that click a header Sign out: `grep -rn "Sign out" e2e`. Point each one at `/me` first.
- [ ] **Step 5: Run** `npx playwright test e2e/shell.e2e.ts e2e/auth.e2e.ts e2e/sign-in.e2e.ts e2e/me.e2e.ts e2e/pwa.e2e.ts`. Expected: all pass.
- [ ] **Step 6: Commit** `feat(shell): native iPhone app shell`.

### Task 2: Landing page on phones

**Files:**

- Modify: `src/routes/+page.svelte`
- Test: `e2e/public-pages.e2e.ts`

- [ ] **Step 1: Write the failing test** "landing headline sits on the forest band at phone width" (viewport 390×844). Give the band `data-testid="landing-band"`. Then:
  - the band's bounding box width equals 390;
  - the h1's box lies fully inside the band's box.
- [ ] **Step 2: Run** `npx playwright test e2e/public-pages.e2e.ts -g "forest band"`. Expected: FAIL (the band is 164px wide).
- [ ] **Step 3: Fix the grid.**
  - The outer grid gets `grid-cols-1 md:grid-cols-2`.
  - The band spans `row-start-1` on phones.
  - On phones the sample card (row 2, `-mt-8`) overlaps the band's bottom edge, so the band must extend into row 2: put it on `row-span-2` with a bottom margin, or give row 2 a forest background for its top 2rem. Pick whichever keeps the card overlap.
  - Replace the `100vw` paddings with the PR 4 review's suggestion, `md:pl-[max(1rem,calc(100%-31rem))]` (and the same for `pr`).
  - `text-surface/90` becomes `text-surface`.
- [ ] **Step 4: Run** `npx playwright test e2e/public-pages.e2e.ts`. Expected: all pass.
- [ ] **Step 5: Commit** `fix(landing): forest band spans the phone width`.

### Task 3: A title for every page

**Files:**

- Modify:
  - `src/routes/(app)/+layout.svelte` (delete its `Seo`)
  - each signed-in page that lacks `Seo`: `today`, `card`, `card/build/[step]`, `card/squares/[id]`, `me`, `me/habits`, `me/habits/[id]/delete`, `me/history`, `me/history/[month]`, `admin`
- Test: `e2e/shell.e2e.ts`

**Interfaces:**

- Consumes: `Seo` props `{ title, description, path, noindex }`. Every signed-in page passes `noindex` and `path={page.url.pathname}`.
- Titles:

  | Page                    | Title                |
  | ----------------------- | -------------------- |
  | `today`                 | "Today"              |
  | `card`                  | "Your card"          |
  | `card/build/[step]`     | "Build your card"    |
  | `card/squares/[id]`     | the habit name       |
  | `me`                    | "Me"                 |
  | `me/habits`             | "Habit library"      |
  | `me/habits/[id]/delete` | "Delete {name}"      |
  | `me/history`            | "History"            |
  | `me/history/[month]`    | "{Month year} recap" |
  | `admin`                 | "Admin"              |

- [ ] **Step 1: Write the failing test** "every signed-in page has its own title". Visit `/today`, `/card`, `/me`, `/me/habits` and `/me/history`, and expect `toHaveTitle` to be "Today · Habit Bingo", "Your card · Habit Bingo" and so on.
- [ ] **Step 2: Run** it. Expected: FAIL ("Your habits · Habit Bingo").
- [ ] **Step 3: Add** `Seo` to each page. Delete the layout's `Seo`.
- [ ] **Step 4: Run** `npx playwright test e2e/shell.e2e.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `fix(a11y): a title for every signed-in page`.

### Task 4: Touch, feedback and readability

**Files:**

- Modify:
  - `src/lib/components/Sheet.svelte`, `src/lib/components/TodayRow.svelte`
  - `src/routes/(app)/today/+page.svelte`, `src/routes/(app)/card/build/[step]/+page.svelte`
  - `src/lib/components/DaySwitcher.svelte`, `src/lib/components/CardHeader.svelte`
  - `src/lib/components/Hero.svelte`, `src/lib/components/SiteFooter.svelte`
- Test: `src/lib/components/Sheet.svelte.spec.ts`, `e2e/today.e2e.ts`

- [ ] **Step 1: Write the failing tests.**
  - `Sheet.svelte.spec.ts`, "Sheet locks page scroll while open": open the sheet, and `getComputedStyle(document.documentElement).overflow` is `hidden`; close it, and it is back to `visible`.
  - `today.e2e.ts`, "a double tap on + logs once": `dblclick` a habit's "+" with target 2, then expect "1/2" (or the count text the row shows), not "2/2".
- [ ] **Step 2: Run** both. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **Sheet:** in an `$effect`, while the dialog is open, set `document.documentElement.style.overflow = 'hidden'`, and restore it on close or destroy.
  - **TodayRow:**
    - While its form is submitting (a `pending` flag set in `use:enhance`), the "+" button gets `aria-busy="true"` and `disabled`, plus an immediate pressed look (`scale-95`, a short opacity dip). Guard the second submit with the flag.
    - Under reduced motion, show no scale.
  - **Tap targets:**
    - the Today hero link "See your {month} card" gets `inline-flex min-h-11 items-center`;
    - the "Done (n)" `summary` gets `min-h-11`;
    - DaySwitcher chips get `min-h-11`;
    - SiteFooter links get `min-h-11 inline-flex items-center`.
  - **DaySwitcher:** render nothing when it has only one day.
  - **Disclosure markers:** on both `<summary>` elements (Today "Done", builder "New habit"), hide the native marker (`list-none [&::-webkit-details-marker]:hidden`). Add an `Icon name="caret-right"` that rotates 90° when `[open]` (`group-open:rotate-90`), with a transition only under `motion-safe`.
  - **Text sizes:** the CardHeader "pts" label goes from 11px to 12px. The Hero summary goes from `text-[13px]` to `text-[15px]`.
- [ ] **Step 4: Run** `npx vitest run src/lib/components/Sheet.svelte.spec.ts`, then `npx playwright test e2e/today.e2e.ts e2e/habit-sheet.e2e.ts e2e/card-builder.e2e.ts`. Expected: all pass.
- [ ] **Step 5: Commit** `fix(touch): tap targets, pending feedback, sheet scroll lock`.

### Task 5: Visual clean-up

**Files:**

- Modify:
  - `src/routes/(app)/me/habits/+page.svelte`, `src/lib/components/CategoryFilter.svelte`
  - `src/routes/(app)/card/build/[step]/+page.svelte` (category headings)
  - `src/routes/(app)/groups/+page.svelte` (empty state)
  - `src/lib/components/SizePicker.svelte`, `src/lib/components/BingoSquare.svelte` (or wherever the center square renders on the board)
  - `src/routes/(app)/card/+page.svelte`
  - `src/routes/(app)/me/+page.svelte`
- Test: `e2e/habits.e2e.ts`, `e2e/card.e2e.ts`, the `SizePicker` and `BingoSquare` specs

- [ ] **Step 1: Write the failing tests.**
  - `habits.e2e.ts`, "quick start stays until a 3×3 card's worth": as a new member, add two starter habits, and the "Quick start" heading is still visible.
  - `habits.e2e.ts`, "an empty library shows one New habit and no chips": a new member sees exactly one "New habit" link and no `navigation` named "Categories" (or whatever `CategoryFilter`'s label is).
  - `SizePicker` spec: the 3×3 option reads "8 habits · 1× points", and 5×5 reads "24 habits · 2× points".
  - `card.e2e.ts`, "the free square is solid forest": the center square's computed background is `rgb(47, 93, 70)`.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **Quick start:** show `StarterHabits` while `!data.archived && data.activeCount < 8`, not only on `welcome || activeCount === 0`.
  - **Empty library:**
    - Hide `CategoryFilter` when `activeCount === 0`.
    - Hide the bottom "New habit" button when the empty-state card already shows one.
    - With habits, show only chips whose count > 0, plus All.
  - **Category headings** (library and builder): put the icon inline with the heading text (`flex items-center gap-2`), not on its own line. Groups' empty state does the same with its icon.
  - **SizePicker:** "×{m}" becomes "{m}× points".
  - **Free square:** find why the board's center square renders as an earned tile with a star ring, not `bg-forest text-white` "Free" (spec §3, Card: "a forest 'Free' center square"). Make it solid forest everywhere: the card, the builder board, the read-only member card and SampleCard.
  - **Remaining ✓ glyphs:** "✓ Card started!" and "✓ Reached" on the card page use `Icon name="check-circle"`. Any notice there uses `Notice tone="success"`.
  - **Me:** the hero shows the display name with the avatar only; drop the repeated `@username` line from the hero, since the Profile sheet shows it.
- [ ] **Step 4: Run** `npx playwright test e2e/habits.e2e.ts e2e/card.e2e.ts e2e/card-builder.e2e.ts e2e/groups.e2e.ts e2e/me.e2e.ts` and the touched component specs. Expected: all pass.
- [ ] **Step 5: Commit** `style: quieter library, solid Free square, inline headings`.

### Task 6: Verify and ship

- [ ] **Step 1: Run** `npm run check`, `npm run lint`, `npx vitest run --coverage` and `npx playwright test`. Expected: all green, with the `src/lib/game` gate met.
- [ ] **Step 2: Visual pass:** on the local seeded server (`.claude/launch.json` "e2e-local") at 390×844, screenshot landing, sign-in, Today, Card plus the sheet, the library, the builder, Groups and Me. Confirm each audit item is gone.
- [ ] **Step 3: Run** the final whole-branch review and one fix pass.
- [ ] **Step 4: Push** `design/phone-polish` and open the PR "fix(design): phone web-app polish". The owner merges it.

## Out of scope (owner decision needed)

- **The card reads "Bingo!" with points on day one,** because "at most" habits count as held from the start. That's a game-rules question, not a styling one, so it's left for the owner to decide.
- **Testing on a real iPhone, with VoiceOver and as an installed app:** the owner does this on the Vercel preview after merge.
