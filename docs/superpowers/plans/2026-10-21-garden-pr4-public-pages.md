# Garden redesign PR 4: public pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the public pages (landing, sign-in, join, reset, onboarding, privacy, terms, error) in the Garden style and remove the pre-Garden alias tokens.

**Architecture:** Each public page becomes the shared `Hero` (or, on the landing page, a larger forest hero) followed by one surface sheet that holds the form or text. A new `Notice` component replaces the error and success banners that pages hand-roll today. Once nothing uses them, the alias tokens are deleted from `src/routes/layout.css`.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, Tailwind v4 `@theme` tokens, Vitest (browser project for components), Playwright (phone + desktop).

**Spec:** `docs/superpowers/specs/2026-10-16-garden-redesign-design.md` (§2 design system, §3 "Public pages", §5 rollout item 4, §6 testing).

## Global Constraints

- Use only these tokens: page `#F5F1E8`, surface `#FFFDF8`, ink `#1F2B23`, muted `#5C6A60`, line `#E4DDCD`, forest `#2F5D46`, leaf `#3E7258`/`#4E7E62`, terracotta `#D9693F`, `earned-tile`, `protected-tile`, `risk-tile`, `shadow-sheet`, and the radius tokens (sheet 24px, tile 18px, row 16px, input 14px, full for buttons and chips).
- "Buttons with words are `forest` with white text. `terracotta` is never behind text." Terracotta text on surface fails contrast, so use ink text.
- Nunito; weights 800 (headings), 700 (labels), 600 (meta), 400/500 (body). Never `font-black` (900). No rendered text below 11px.
- No hard offset shadows (`shadow-[0_3px_0…]`, `shadow-[0_4px_0…]`); sheets use `shadow-sheet`.
- No emoji in markup: use `Icon` from `#lib/components/Icon.svelte` with names from `src/lib/icons.ts`. A new icon used only in the UI goes into `ICONS`, the `Icon.svelte` map and the `RESERVED` set.
- Public pages: "no tab bar; a full-width forest hero with the form on a sheet". Sheet markup: `<section class="relative -mt-[18px] rounded-sheet bg-surface p-5 shadow-sheet">` (or the PR 3 equivalent `rounded-[24px]`).
- Keep every h1's text and every form, field name, action and route unchanged; e2e tests select by these. "Marketing copy is not rewritten."
- Public text is ink or muted (`text-muted`), never `text-ink/NN`.
- Long user-supplied text (group names up to 40 chars, usernames) wraps at 360px (`break-words`, `min-w-0`).
- Before committing: `npm run check`, plus `npx prettier --check` and `npx eslint` on the touched files.

## Review Focus

1. **Notice focus:** after a failed sign-in, join or reset, the error must still take focus. The pages' `use:enhance` focuses `[role="alert"]`, so `Notice` must keep `role="alert"` and `tabindex="-1"`. Test: `Notice` spec "error is a focusable alert".
2. **No-JavaScript forms:** a full-page POST still renders the error Notice in place. Covered by the existing sign-in e2e test, which must stay green.
3. **Long group names on the join page:** "Join {40-char name}" must wrap at 360px with no horizontal scroll. Test: Task 2 e2e "a long group name fits a phone".
4. **Landing sample card:** the animation stays reduced-motion safe and stops at the bingo (WCAG 2.2.2), and the restyle must not break it. The existing SampleCard spec and the public-pages e2e must stay green.
5. **Alias removal:** a leftover alias class renders as no color at all, and silently. Test: Task 4 adds a grep check, `src/lib/tokens.spec.ts` "no alias token classes remain".

---

### Task 1: Notice, sign-in, reset, error

**Files:**

- Create: `src/lib/components/Notice.svelte`, `src/lib/components/Notice.svelte.spec.ts`
- Modify: `src/routes/signin/+page.svelte`, `src/routes/reset/[token]/+page.svelte`, `src/routes/+error.svelte`, `src/routes/(app)/me/+page.svelte` (its `problem` snippet uses `Notice`)

**Interfaces:**

- Produces: `Notice.svelte` with props `{ tone: 'error' | 'success'; children: Snippet }`.
  - `error`: renders `<p role="alert" tabindex="-1">` on `bg-risk-tile` with `Icon name="warning"`.
  - `success`: renders `<p role="status">` on `bg-earned-tile` with `Icon name="check-circle"`.
  - Both use `rounded-row px-4 py-3 font-bold text-ink`, and the icon is `aria-hidden`.

- [ ] **Step 1: Write the failing test** `Notice.svelte.spec.ts`. Render with a text snippet (use `createRawSnippet` from svelte):
  - "error is a focusable alert": `getByRole('alert')` has the text and `tabindex="-1"`.
  - "success is a status": `getByRole('status')` has the text, and there is no alert.
- [ ] **Step 2: Run** `npx vitest run src/lib/components/Notice.svelte.spec.ts`. Expected: FAIL (the module is not found).
- [ ] **Step 3: Implement** `Notice.svelte`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Restyle the pages.**
  - **Sign-in:**
    - `Hero` with title "Welcome back" and summary "Sign in to check in on today's habits."
    - One sheet below it holds the Google form, "or", the password form (now a plain `flex flex-col gap-4`, not a bordered card) and the reset hint in `text-muted`.
    - The `✓`/`⚠` banners become `Notice`.
  - **Reset:** `Hero` "Choose a new password" over a sheet. The problem state (`🔑` plus h1 `{problems[status]}`) uses `Hero` with that title and a sheet holding `Icon name="lock"` in a `ProgressRing` (variant `open`, size `lg`) plus the existing text and link.
  - **Error:** `Hero` with the existing title and message as summary. A sheet holds the reference line (`text-muted`, ≥11px) and the "Go home" button. `🧭`/`🙈` become a `ProgressRing` (`open`, `lg`) with icon `map-trifold` for 404 and `warning` otherwise. Add `map-trifold` to `ICONS` (group other), `Icon.svelte` (Phosphor `MapTrifold`) and `RESERVED`.
- [ ] **Step 6: Run** `npx playwright test e2e/sign-in.e2e.ts e2e/auth.e2e.ts e2e/public-pages.e2e.ts e2e/google-button.e2e.ts e2e/security.e2e.ts` plus `npx vitest run src/lib/components src/lib/icons.spec.ts`. Expected: all pass. If a test asserted a removed emoji, switch it to the accessible name.
- [ ] **Step 7: Commit** `feat(design): Garden sign-in, reset and error pages`.

### Task 2: Join and onboarding

**Files:**

- Modify: `src/routes/join/[code]/+page.svelte`, `src/routes/onboarding/+page.svelte`, `e2e/join.e2e.ts`

**Interfaces:**

- Consumes: `Notice` (Task 1), `Hero`, `ProgressRing`, `Icon`, `IconPicker`.

- [ ] **Step 1: Write the failing test** in `e2e/join.e2e.ts`: "a long group name fits a phone".
  - Set the viewport to 360×740.
  - Open a join link for a group named with 40 characters and no spaces (create it the way the file's other tests create groups).
  - Assert `document.documentElement.scrollWidth <= 360` and that the h1 "Join {name}" is visible.
- [ ] **Step 2: Run** `npx playwright test e2e/join.e2e.ts -g "long group name"`. Expected: FAIL (scrollWidth > 360). If it already passes, note that in the report and keep it as a guard.
- [ ] **Step 3: Restyle.**
  - **Join:** every state (invited, join group, already in group, problem `💌`) uses `Hero` with the existing h1 text as title, and a sheet with the form or message. `⚠` banners become `Notice tone="error"`. `💌` becomes a `ProgressRing` (`open`, `lg`) with the `envelope` icon.
  - **Onboarding:** `Hero` "Welcome to Habit Bingo" over a sheet. The `⚠` banner becomes `Notice`, and the avatar `IconPicker` stays.
  - Remove `font-black` and the offset shadows.
- [ ] **Step 4: Run** `npx playwright test e2e/join.e2e.ts e2e/onboarding.e2e.ts`. Expected: all pass, including the new test.
- [ ] **Step 5: Commit** `feat(design): Garden join and onboarding`.

### Task 3: Landing, privacy, terms

**Files:**

- Modify: `src/routes/+page.svelte`, `src/lib/components/SampleCard.svelte`, `src/routes/privacy/+page.svelte`, `src/routes/terms/+page.svelte`, `src/lib/components/SiteFooter.svelte` (tokens only, if needed)

- [ ] **Step 1: Restyle the landing page in place.** Keep all copy.
  - The top section becomes a full-width forest band (`bg-forest text-surface`, with leaf shapes as in `Hero`). The h1 is `text-4xl md:text-5xl font-extrabold`, and the subtitle sits on `text-surface/90` (check contrast ≥4.5:1 against forest, or use plain surface).
  - The sign-in button keeps working on forest: use `Button variant="secondary"` or a surface-filled button with forest text.
  - "Invite-only beta." stays.
  - The SampleCard sits on a surface sheet overlapping the band on phones, and beside the text on desktop.
  - The three step cards become surface tiles: `rounded-tile bg-surface shadow-sheet`, the icon in a `ProgressRing` (`earned`, `md`), and `text-muted` body.
- [ ] **Step 2: SampleCard:** `bg-white` becomes `bg-surface`, the border plus offset shadow become `shadow-sheet`, and the radius becomes `rounded-sheet`. Do not change its logic.
- [ ] **Step 3: Privacy and terms:** `Hero` with "Privacy" / "Terms" and a sheet holding the text. h2s become `text-[22px] font-extrabold`, and the body text is `text-ink`, with `text-muted` for meta.
- [ ] **Step 4: Run** `npx playwright test e2e/public-pages.e2e.ts e2e/pwa.e2e.ts` and `npx vitest run src/lib/components/SampleCard`. Expected: all pass.
- [ ] **Step 5: Commit** `feat(design): Garden landing, privacy and terms`.

### Task 4: Remove the alias tokens

**Files:**

- Modify: `src/routes/layout.css` (delete the "Aliases for the pre-Garden names" block), `src/lib/tokens.spec.ts`, and every file still using an alias class. As of this plan:
  - Components: `BingoSquare.svelte:44`, `ConfirmAction.svelte:58`.
  - Card: `(app)/card/+page.svelte:134`, `(app)/card/build/[step]/+page.svelte:87`.
  - Me: `(app)/me/+page.svelte:311`, `(app)/me/habits/+page.svelte:66`, `HabitFormPage.svelte:37`, `[id]/delete/+page.svelte:17`.
  - Today: `(app)/today/+page.svelte:110,140`.
  - Tasks 1–2 remove the public-page uses.

**Interfaces:**

- Mapping:

  | Alias            | Garden token     |
  | ---------------- | ---------------- |
  | `cream`          | `page`           |
  | `accent`         | `forest`         |
  | `accent-edge`    | `forest`         |
  | `earn`           | `earned-tile`    |
  | `earn-edge`      | `forest`         |
  | `earn-shadow`    | `forest`         |
  | `protect`        | `protected-tile` |
  | `protect-edge`   | `protected-ring` |
  | `protect-shadow` | `protected-ring` |
  | `risk`           | `risk-tile`      |
  | `risk-edge`      | `terracotta`     |
  | `risk-shadow`    | `terracotta`     |
  | `lost`           | `page`           |

- [ ] **Step 1: Write the failing test** in `src/lib/tokens.spec.ts`: "no alias token classes remain".
  - Use `import.meta.glob('/src/**/*.svelte', { query: '?raw', import: 'default', eager: true })`, or `node:fs` if the spec runs in the server project.
  - Assert no file matches `/\b(?:bg|text|border|ring|outline|fill|stroke|shadow|from|to)-(?:cream|accent(?:-edge)?|earn(?:-edge|-shadow)?|protect(?:-edge|-shadow)?|risk(?:-edge|-shadow)?|lost)\b(?!-)/`.
  - Also assert `layout.css` contains no `--color-cream`.
- [ ] **Step 2: Run** `npx vitest run src/lib/tokens.spec.ts`. Expected: FAIL, listing the files above.
- [ ] **Step 3: Replace** each alias class by the mapping, then delete the alias block from `layout.css`.
- [ ] **Step 4: Dialog titles wrap.** Add `break-words` to the title heading in `Sheet.svelte` and `ConfirmAction.svelte` (deferred from PR 3).
- [ ] **Step 5: Run** `npx vitest run src/lib/tokens.spec.ts`, then `npm run check`. Expected: PASS, with 0 errors.
- [ ] **Step 6: Commit** `refactor(design): drop pre-Garden alias tokens`.

### Task 5: Verify and ship

- [ ] **Step 1: Run** `npm run check`, `npx eslint .`, `npx vitest run --coverage` and `npx playwright test`. Expected: 0 errors, every unit test passes with the `src/lib/game` gate met, and every Playwright test passes.
- [ ] **Step 2: Grep** the public routes and components for emoji, `font-black`, `shadow-[0_` and `text-ink/`. Expected: none, except emoji in data and migration files.
- [ ] **Step 3: Run** the final whole-branch review and one fix pass.
- [ ] **Step 4: Push** `design/garden-pr4` and open the PR "feat(design): Garden public pages". The owner merges it.
