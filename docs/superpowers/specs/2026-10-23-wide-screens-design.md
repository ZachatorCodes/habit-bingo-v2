# Wide-screen UI (iPad and computer): design

Status: approved in brainstorming 2026-10-23. Builds on the Garden design
(`2026-10-16-garden-redesign-design.md`) and the phone polish (PR #100).

## 1. Intent

Habit Bingo is built and polished for phones. On an iPad or a computer it shows the stretched phone
layout. People use wider screens for a mix of things: daily check-ins, looking over the card and
leaderboards, and setup (building cards, the habit library, admin). This adds a layout made for
those screens.

**The phone UI below 768px does not change.** Any visual or behavioural change there is a bug.

Success:

- From 768px up, navigation is a left sidebar, and every main screen uses the extra width (two panes
  or grids) instead of a stretched single column.
- Today shows the card beside the check-in list, so logging visibly fills the board.
- No horizontal scroll at 768, 1024 or 1440px wide. All phone tests still pass unchanged.

## 2. Approach

Responsive CSS on the existing pages and components: Tailwind `md:` (≥768px) and `lg:` (≥1024px)
variants added to current markup. There is no JavaScript screen detection, so the server renders the
right layout on the first paint. There are no separate wide-screen components or routes.

Where a wide layout needs extra markup, it is present in the page and shown only from its breakpoint
(`hidden lg:block`), and the phone counterpart is hidden from it (`md:hidden`):

- the sidebar and the bottom tabs;
- the board panel on Today.

Breakpoints:

| Width      | Devices                  | Layout                                                             |
| ---------- | ------------------------ | ------------------------------------------------------------------ |
| < 768px    | phones                   | today's phone UI, unchanged                                        |
| 768–1023px | iPad portrait            | icon-only sidebar; one roomy column, two panes where noted         |
| ≥ 1024px   | iPad landscape, computer | sidebar with labels; two-pane layouts; content max 1200px, centred |

## 3. Shell

- **Sidebar** (≥768px), on the left, the full height of the viewport:
  - **Look:** a `surface` background with a 1px `line` right border, padding for safe areas (`--safe-top`, `--safe-bottom`, and the left inset in landscape).
  - **Contents:** the Habit Bingo mark at the top, then Today, Card, Groups, Me, and Admin (for admins only).
  - **Items:** each is an icon, plus a label at ≥1024px, and ≥44px tall.
  - **Current item:** forest fill with white icon and text, plus `aria-current="page"`, using the same rules as the tabs (Me stays current under `/me/*`).
  - **Width:** 72px icon-only (768–1023px) and 220px with labels (≥1024px).
  - **Hover:** only inside `@media (hover: hover)`.
  - **Markup:** the same `<nav aria-label="Main">` landmark as on phones, one element whose styles change by breakpoint. The bottom tab styles apply below 768px only.
- **Body padding:** `--tab-bar` padding applies below 768px only. From 768px the content column is offset by the sidebar width.
- **Hero:** from 768px it sits inside the content column with 24px rounded corners and a 16px margin, instead of running edge to edge. The overlapping sheet becomes a surface panel below it.
- **Habit sheet** (`Sheet.svelte`), from 768px:
  - **Position:** a panel from the right edge, 420px wide (max 100vw − sidebar), full height, `shadow-sheet`. It slides in under `motion-safe` and appears instantly under reduced motion.
  - **Behaviour kept from phones:** the dialog role, focus trap, Escape to close, and focus returning to the opener.
  - **Scroll:** from 768px the page behind is not scroll-locked, so wheel and trackpad scrolling still work. The phone lock stays below 768px.
  - **The page behind:** stays visible under a lighter scrim (`ink/20`).
- **Cookie notice and toast:** from 768px, positioned inside the content column (left offset by the sidebar), not over the sidebar.

## 4. Screens (≥1024px unless stated; 768–1023px stacks the same content in one wider column)

- **Today:**
  - **Two columns:**
    - Left: the hero plus the check-in sections (Heads up, Do today, This week, Anytime, Log a slip), about 1fr.
    - Right: a sticky card panel, about 420px. It holds the points line (`CardHeader`) and the `CardBoard`; tapping a square opens the habit panel.
  - **Updating:** logging updates both columns from the same load.
  - **No card yet:** the right pane shows the "Build one" call to action.
  - **Data:** Today's load also returns the board data that Card's load already builds (shared server helper, no new queries beyond what Card runs).
- **Card:** the board grows (squares up to about 120px), and names always show, on 5×5 too. Points, the next reward and the reward tiers move into a column to the right of the board.
- **Card builder:**
  - **Step bar:** stays in the hero.
  - **Habits step:** the picker on the left, a live preview board on the right that fills as habits are picked. The preview is built client-side from the picks, reusing `CardBoard` with placeholder squares in pick order.
  - **Size, Targets and Rewards:** one centred column, max 640px.
- **Habit library:**
  - **Category filter:** becomes a vertical list on the left (about 220px), with habit rows on the right.
  - **Quick start:** under the rows.
  - **New and edit forms:** a centred column, max 640px.
- **Groups:**
  - **List:** a grid of group cards, 2 columns at ≥768px and 3 at ≥1280px.
  - **Group page:** Leaderboard and Members side by side at ≥1024px, replacing the tabs. The tab links stay below 1024px.
- **A member's card:** the same layout as Card (big board, summary beside it).
- **Me:** two columns.
  - Left: Profile and Settings.
  - Right: the Habit library and History links, then Password, Google, Sessions, Sign out and Danger zone.
- **History:** month cards in a grid, 2 columns at ≥768px and 3 at ≥1280px. **Recap:** board and stats side by side.
- **Admin:** the create-invite form on the left and the invite list on the right.
- **Public pages:**
  - **Landing:** keeps its existing desktop layout; fix the band's top padding to include `--safe-top` at ≥768px (it was overridden by `md:py-20`).
  - **Sign-in, join, reset, onboarding:** a centred card, max 480px, on a full-height forest background, with the hero text above it.
  - **Privacy, terms:** a 720px reading column.

## 5. Constraints

- **Tokens and type:** Garden only (spec 2026-10-16 §2). Text ≥12px. Tap targets ≥44px, unchanged. No hover-only actions: everything works by tapping.
- **Structure:** no new routes, features, data or migrations. Routes, form names, h1 text and accessible names stay the same, so the e2e tests keep working.
- **Landscape phones** stay on the phone layout (their width is under 768px for most devices; ≥768px landscape phones get the iPad-portrait layout, which is acceptable).
- **Reduced motion:** the sidebar and the panel slide get no animation under `prefers-reduced-motion`.

## 6. Testing

- **Projects:** Playwright gains a `tablet` project (iPad, 820×1180). `phone` and `desktop` (1280×720) stay.
- **Phone guard:** at 390px, the sidebar is hidden and the bottom tabs are shown. All existing phone tests pass unchanged.
- **New e2e tests:**
  - **Sidebar:** navigation at tablet and desktop widths, with the current item marked.
  - **Today:** at desktop, the board sits beside the list, and a log updates the list and the board.
  - **Habit panel:** at desktop, it opens from the right, holds focus, closes on Escape, and returns focus.
  - **Group page:** at desktop, Leaderboard and Members are side by side.
  - **No horizontal scroll** on Today, Card, Builder (habits step), Library, Groups, the group page, Me, History and Admin at 768, 1024 and 1440px.
- **Unit tests:** where a component's behaviour branches by breakpoint (`Sheet` scroll lock), a test with `matchMedia` stubbed.
- **Visual pass:** screenshots at 820, 1180 and 1440px on the local seeded server before the PR.

## 7. Rollout

One branch (`design/wide-screens`), one PR, with about five tasks:

1. **Shell:** sidebar, side panel, offsets, the tablet Playwright project.
2. **Today and Card:** includes Today's board data.
3. **Builder and Library.**
4. **Groups, Me, History, Admin.**
5. **Public pages.**

Then a final whole-branch review and one fix pass.

## 8. Out of scope

- Keyboard shortcuts, drag-and-drop, multi-select, and hover-only affordances.
- A separate desktop information architecture (new pages, a dashboard route).
- Dark mode.
