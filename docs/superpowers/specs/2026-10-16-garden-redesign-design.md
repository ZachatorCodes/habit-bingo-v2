# Garden redesign: design

Status: approved in brainstorming on 2026-10-16. Supersedes the visual sections of the v2 design spec
(`2026-10-09-habit-bingo-v2-design.md` §4 tokens and component looks) and the current `DESIGN.md`.
Game rules, routes, forms and features do not change.

## 1. Intent

**What the owner said:** the current look (cream page, coral buttons, chunky outlines with hard drop
shadows, heaviest-weight Nunito) feels childish and toy-like, generic, cluttered, and the colors are
off. The app should feel _playful but grown-up_, in the soft, warm, organic world of Headspace / Calm.
Dark mockups felt too heavy and flat; plant and seed-packet metaphors felt too cute. Keep Nunito.
Replace every emoji with an icon library.

**Chosen direction: "Garden".** Light, warm sand page; a forest-green hero banner with soft leaf
shapes at the top of each screen; white sheets with soft blurred shadows overlapping it; habit icons
inside progress rings that fill as you go. The mood comes from color, type and depth, not from
illustrated metaphors.

**Success:** the owner and friends open the app daily and it feels calm, crafted and grown-up; state
is readable at a glance; nothing regresses (every test green, every form works without JavaScript,
WCAG AA).

Approved mockup: `.superpowers/brainstorm/701-1792170316/content/combined-v1.html` (Today and Card),
with one correction: the selected nav tab must not leave a gap below it.

## 2. Design system

### Theme

Light only. Dark mode is out of scope.

### Colors

| Token        | Value                                         | Use                                                                                |
| ------------ | --------------------------------------------- | ---------------------------------------------------------------------------------- |
| `page`       | `#F5F1E8`                                     | page background                                                                    |
| `surface`    | `#FFFDF8`                                     | sheets, tiles, tabs                                                                |
| `ink`        | `#1F2B23`                                     | all text                                                                           |
| `muted`      | `#5C6A60`                                     | meta text (≥ 4.5:1 on `page` and `surface`)                                        |
| `line`       | `#E4DDCD`                                     | dividers, open-tile and tab outlines, ring tracks                                  |
| `forest`     | `#2F5D46`                                     | hero, primary buttons (white text, 7.6:1), earned rings, active tab, center square |
| `leaf`       | `#3E7258`, `#4E7E62`                          | hero leaf shapes only                                                              |
| `terracotta` | `#D9693F`                                     | the icon-only "+" log button (white icon, ≥ 3:1); at-risk ring                     |
| `earned`     | tile `#E3ECDD`, ring `forest`                 | complete squares                                                                   |
| `protected`  | tile `#E5EDF1`, ring `#5B8AA6`                | held "at most" squares                                                             |
| `risk`       | tile `#FAEDE4`, dashed ring `terracotta`      | at-risk squares                                                                    |
| `lost`       | tile `page`, grey ring `#8A8373`, name struck | lost squares                                                                       |

Buttons with words are `forest` with white text. `terracotta` is never behind text.

### Type

Nunito Variable (already installed). Weights: 800 headings (hero 28px, page title 22px, section
title 12px with 0.02em tracking), 700 names and labels, 600 meta, 400/500 body. No rendered text
below 11px. Tabular numerals for points and counts.

### Shape and depth

- Radii: sheets 24px, square tiles 18px, rows 16px, inputs 14px, buttons and chips fully round.
- No hard offset ("sticker") shadows anywhere. Sheets: `0 1px 2px rgb(36 51 42 / 6%), 0 14px 30px
-16px rgb(36 51 42 / 30%)`. The "+" button: a soft terracotta glow. Press feedback is a slight
  scale-down, not a translate.

### Icons

Phosphor, duotone weight by default, bundled locally (no CDN: the CSP allows `script-src 'self'`
only). A curated set of about 60 icon names lives in `src/lib/icons.ts`, grouped by category, and is
the only set users can pick from. Icons are decorative (`aria-hidden`); the adjacent text carries the
meaning.

### Hero

Each main screen opens with a `forest` banner: greeting or title (800, 28px), a one-line summary, and
two or three soft leaf shapes in `leaf` tones. Sheets overlap the hero by 18px.

### Motion

Gentle and purposeful; all of it is disabled under `prefers-reduced-motion`:

- rings animate their fill (about 400ms, ease-out);
- a square that becomes earned does a soft scale pop;
- hero leaf shapes drift slowly (long loop, a few px);
- BINGO! keeps its celebration, restyled with Garden-colored confetti; completed lines ripple
  `forest` instead of gold.

### Navigation

The existing bottom folder tabs (PR #90), restyled: `surface` tabs with `line` outlines, icon plus
word, the active tab `forest` outline and text on `page`, raised 8px; hovered tabs lift 4px. Tabs
extend below the viewport edge so a raised tab never shows a gap. The top header keeps the avatar,
username and Sign out.

## 3. Screens and components

Every screen: hero on top, sheets overlapping it, tabs at the bottom (signed-in pages). Routes,
forms, copy and behavior stay as they are unless stated.

### Shared components

- Restyled: `Button`, `TextField`, `Sheet` (bottom sheet on phones, centered dialog on desktop),
  `Toast`, `CookieNotice`, `ConfirmAction`, `CategoryFilter`, `CopyField`, `DaySwitcher`,
  `BingoSquare`, `CardBoard`, `CardHeader`, `TodayRow`, `HabitRow`, `HabitSheet`, `HabitForm`,
  `HabitPicker`, `SizePicker`, `TargetList`, `BuilderSteps`, `StarterHabits`, `SampleCard`,
  `BingoCelebration`, `SiteFooter`.
- New:
  - `Icon`: renders a curated Phosphor icon by name; unknown names fall back to `sparkle`.
  - `ProgressRing`: an icon inside a ring; variants `progress` (with a percentage), `earned`,
    `protected`, `risk`, `lost`, `open`.
  - `Hero`: the forest banner with title, summary and leaf shapes.
  - `IconPicker`: replaces `EmojiPicker`; a keyboard-navigable grid of the curated set, filterable
    by category.

### Screens

- **Today:** hero "Good morning, {name}" plus how many things are left today. One sheet with the
  Do today, This week and Anytime this month sections. Each row: ring with the habit icon, name,
  progress line, and the terracotta "+" (a sage check once done). Heads up and the recap banner
  become a soft tinted card at the top of the sheet.
- **Card:** hero with the month and days left. The sheet shows points, closeness to a line and the
  next reward above the grid: rings on tinted tiles, a `forest` "Free" center square. 5×5 cards use
  smaller rings and hide names on phones. Tapping a square opens the restyled habit sheet (ring at
  the top, the day log as rows).
- **Card builder:** the same five steps, with a slim step bar in the hero; size options and habit
  picks as selectable tiles.
- **Habit library, new, edit, delete:** rows with icon and ring; category chips with icons; the
  habit form uses `IconPicker`.
- **Groups:** list rows with the group icon; the group page puts Leaderboard and Members as tabs
  inside the sheet, avatars as icons on colored circles; a member's card reuses the grid read-only,
  with a lock icon for private habits.
- **Me, History, Recap, Admin:** settings grouped into sheets; History as month rows; the recap
  reuses the card grid with points and rewards earned; Admin in plain sheets.
- **Public pages** (landing, sign-in, join, reset, onboarding, privacy, terms, error): no tab bar; a
  full-width forest hero with the form on a sheet. The landing page is restyled in place with a big
  hero and a sample card in the new style; marketing copy is not rewritten.

## 4. Icons in the data

- **Icon set:** `src/lib/icons.ts` exports the curated names and an `isIconName` check. Server
  validation rejects any icon outside the set, as it rejects invalid emoji today.
- **Migration `0011` (additive):** add `habit.icon`, `card_square.icon` (null only for the center
  square, mirroring `emoji`), `group.icon`, `user.avatar_icon`. Backfill from the emoji columns with a
  fixed emoji-to-icon map (for example 📚 `book-open`, 💧 `drop`, 🧘 `leaf`, 🚴 `bicycle`); unmapped
  habit and group emoji become `sparkle`, unmapped avatars `smiley`. Then make the columns required
  with the same rules as their emoji twins.
- **Code:** everything reads and writes `icon` only. Starter habits, categories and the avatar list
  use icon names. Recap "most logged" and the category breakdown carry icons. The habit form,
  onboarding, the profile and group creation use `IconPicker`.
- **Snapshots:** card squares copy the habit's icon at card start, exactly as they copy emoji now;
  the 48-hour edit rules and private-habit masking are unchanged.
- **Later cleanup (out of scope here):** migration `0012` drops the emoji columns in its own PR,
  after this release is live.

## 5. Rollout

Four PRs, each shippable on its own with every suite green:

1. **Foundation:** tokens, type, shadows; `Icon`, `ProgressRing`, `Hero`, `IconPicker`; restyled
   base components (`Button`, `TextField`, `Sheet`, `Toast`, `CookieNotice`, `ConfirmAction`, nav);
   `icons.ts`, migration `0011` and the emoji-to-icon code switch.
2. **Core screens:** Today, Card, habit sheet, card builder, BINGO!.
3. **Secondary screens:** habit library, Groups, Me, History and Recap, Admin.
4. **Public pages:** landing, sign-in, join, reset, onboarding, privacy, terms, error.

Implementation in each PR is driven by taste-skill, held to this spec.

## 6. Testing and accessibility

- Each PR: `npm run check`, lint, `vitest --coverage` (100% on `src/lib/game`), and the full
  Playwright suite on phone and desktop, all run locally (CI minutes are exhausted).
- New unit tests: `Icon` fallback; `ProgressRing` variant and fill per state; `IconPicker` keyboard
  use; server icon validation for habits, groups and avatars; the migration map (every emoji in the
  starters, categories and avatar list maps, unmapped values fall back).
- E2E specs that select or assert emoji move to icons; tests that use accessible names stay.
- `src/lib/tokens.spec.ts` checks the new pairs: text ≥ 4.5:1, rings and icon-only buttons ≥ 3:1.
- One visual pass per PR at 360px and desktop widths on the local seeded server.
- States never rely on color alone: earned is a full ring, protected a blue ring plus "Protected",
  at risk a dashed ring, lost a grey ring with a struck-through name; each square states its state to
  screen readers.
- Tap targets at least 44px; keyboard focus rings, dialog focus trapping, reduced motion and
  no-JavaScript forms keep working.

## 7. Out of scope

Dark mode; rewriting marketing copy; new features or flows; dropping the emoji columns (`0012`).
