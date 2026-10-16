# Garden Redesign PR 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Garden design system's foundation (tokens, icons, the new shared components, restyled
base components and nav) and switch every stored and rendered emoji to a Phosphor icon, without
redesigning screen layouts yet.

**Architecture:** Tailwind v4 `@theme` tokens in `src/routes/layout.css` gain the Garden palette; the
old token names stay as aliases pointing at Garden values so un-restyled screens (PRs 2–4) already
use the new colors. A curated icon registry (`src/lib/icons.ts`) plus an `Icon` component wrap
`phosphor-svelte`. Migration `0011` adds `icon` columns beside every `emoji` column and backfills them
from a fixed map; all code then reads and writes `icon` only.

**Tech Stack:** SvelteKit 3 / Svelte 5 runes, Tailwind v4, Drizzle + Postgres (PGlite in tests),
Better Auth, Vitest (server + browser projects), Playwright, `phosphor-svelte`.

**Spec:** `docs/superpowers/specs/2026-10-16-garden-redesign-design.md` (§2 design system, §3 shared
components, §4 icons in the data, §5 PR 1, §6 testing).

## Global Constraints

- Light only. Colors exactly as spec §2: page `#F5F1E8`, surface `#FFFDF8`, ink `#1F2B23`, muted
  `#5C6A60`, line `#E4DDCD`, forest `#2F5D46`, leaf `#3E7258`/`#4E7E62`, terracotta `#D9693F`;
  earned tile `#E3ECDD` + forest ring; protected tile `#E5EDF1` + ring `#5B8AA6`; risk tile `#FAEDE4`
  - dashed terracotta ring; lost tile = page + ring `#8A8373` + struck name.
- Buttons with words: forest with white text. Terracotta is never behind text.
- Font: Nunito Variable (already installed). Headings 800, names/labels 700, meta 600, body 400/500.
  No rendered text below 11px.
- No hard offset shadows in anything this PR touches. Sheet shadow:
  `0 1px 2px rgb(36 51 42 / 6%), 0 14px 30px -16px rgb(36 51 42 / 30%)`. Press = slight scale-down.
- Radii: sheets 24px, tiles 18px, rows 16px, inputs 14px, buttons/chips fully round.
- Icons: Phosphor, duotone by default, bundled locally (CSP is `script-src 'self'`; no CDN).
  Decorative icons are `aria-hidden="true"`.
- All motion is disabled under `prefers-reduced-motion`.
- Every form keeps working without JavaScript; tap targets ≥ 44px; WCAG AA (text 4.5:1, rings and
  icon-only buttons 3:1).
- UI tasks (3, 4, 7, 8) load `taste-skill:design-taste-frontend` before writing markup and follow it
  within this spec's values; the spec wins on any conflict.
- Migrations are additive only: `emoji` columns stay (dropped later by `0012`, not in this PR).
- `.env` points at the remote production DB: never run `db:migrate`, `npm run dev` or `db:studio`
  against it. Tests use PGlite; E2E uses `scripts/e2e-server.ts`.
- CI minutes are exhausted: verify locally (`npm run check`, `npm run lint`,
  `npx vitest --run --coverage`, `npx playwright test`).

## Review Focus

1. A habit whose emoji is not in the migration map (any custom emoji a user typed) must load and
   render with the `sparkle` icon and stay editable. Test: Task 5 `backfills unmapped emoji to sparkle`.
2. A hand-crafted POST with an icon name outside the curated set (habit, group or avatar) must be
   refused with a field error, never stored. Tests: Task 6 `rejects an icon outside the set` (×3).
3. A card started before the migration keeps its squares' look: each non-center square gets the
   backfilled icon, the center square stays null, and the check constraint still holds. Test: Task 5
   `backfills card squares and leaves the center null`.
4. New sign-ups after the migration (Better Auth create path) must succeed even though code no
   longer writes `avatar_emoji`, and get `avatar_icon = 'smiley'`. Test: Task 6
   `a new account gets the default avatar icon`.
5. `IconPicker` without JavaScript: it is native radios, so the chosen icon posts and an arrow key
   moves the selection. Test: Task 4 `posts the checked icon as a native radio`.

---

## File map

- Create `src/lib/icons.ts`: the curated icon registry (names, labels, groups), `isIconName`,
  category/avatar/starter icon constants.
- Create `src/lib/components/Icon.svelte`, `ProgressRing.svelte`, `Hero.svelte`, `IconPicker.svelte`
  (+ `*.svelte.spec.ts` each).
- Delete `src/lib/components/EmojiPicker.svelte` (+ its spec) once nothing imports it.
- Create `src/lib/server/db/emoji-icons.ts`: `EMOJI_TO_ICON`, the map the migration SQL mirrors.
- Create `drizzle/0011_icons.sql` (generated, then hand-edited) and its journal/snapshot entries.
- Modify schema: `src/lib/server/db/schema/{habits,cards,groups,auth}.ts`.
- Modify services: `habits.ts`, `habit-form.ts`, `groups.ts`, `cards.ts`, `card-view.ts`,
  `leaderboard.ts`, `auth/accounts.ts`, `auth/create-auth.ts`; game: `categories.ts`, `starters.ts`,
  `recap.ts`; `src/lib/profile.ts`.
- Modify every component/route in the "emoji" list (Task 7) to render `Icon`.
- Modify `src/routes/layout.css`, `src/lib/tokens.spec.ts`, `Button.svelte`, `TextField.svelte`,
  `Sheet.svelte`, `Toast.svelte`, `CookieNotice.svelte`, `ConfirmAction.svelte`,
  `src/routes/(app)/+layout.svelte`.

---

### Task 1: Icon registry and `Icon` component

**Files:**

- Create: `src/lib/icons.ts`, `src/lib/icons.spec.ts`, `src/lib/components/Icon.svelte`,
  `src/lib/components/Icon.svelte.spec.ts`
- Modify: `package.json` (dependency)

**Interfaces:**

- Produces:
  - `type IconName` (union of the curated kebab-case names)
  - `ICONS: readonly { name: IconName; label: string; group: CategoryId }[]`
  - `isIconName(value: string): value is IconName`
  - `CATEGORY_ICON: Record<CategoryId, IconName>`
  - `AVATAR_ICONS: readonly IconName[]`, `DEFAULT_AVATAR_ICON: 'smiley'`, `FALLBACK_ICON: 'sparkle'`
  - `Icon.svelte` props: `{ name: string; weight?: 'regular' | 'duotone' | 'fill' | 'bold'; size?: number | string; class?: string }`,
    renders `aria-hidden="true"`; an unknown `name` renders `sparkle`.

- [ ] **Step 1: Install the icon library**

Run: `npm install phosphor-svelte --save-exact`
Expected: added to `dependencies`; `node_modules/phosphor-svelte/package.json` peer range includes
Svelte 5. If it does not, stop and report.

- [ ] **Step 2: Write the failing registry test** (`src/lib/icons.spec.ts`)

```ts
import { CATEGORIES } from '#lib/game/categories.ts';
it('has about 60 unique icons, every group a real category', () => {
	expect(ICONS.length).toBeGreaterThanOrEqual(54);
	expect(new Set(ICONS.map((i) => i.name)).size).toBe(ICONS.length);
	for (const icon of ICONS) expect(CATEGORIES.map((c) => c.id)).toContain(icon.group);
});
it('isIconName accepts curated names only', () => {
	expect(isIconName('book-open')).toBe(true);
	expect(isIconName('BookOpen')).toBe(false);
	expect(isIconName('')).toBe(false);
	expect(isIconName('<svg>')).toBe(false);
});
it('category, avatar, fallback and default icons are all curated', () => {
	for (const n of [
		...Object.values(CATEGORY_ICON),
		...AVATAR_ICONS,
		FALLBACK_ICON,
		DEFAULT_AVATAR_ICON
	])
		expect(isIconName(n)).toBe(true);
});
```

- [ ] **Step 3: Run it.** `npx vitest --run src/lib/icons.spec.ts` → FAIL (module missing).

- [ ] **Step 4: Implement `src/lib/icons.ts`** with these curated names (group in brackets) and
      short human labels:
  - fitness: `barbell`, `person-simple-run`, `bicycle`, `swimming-pool`, `sneaker-move`,
    `mountains`, `soccer-ball`, `basketball`
  - health: `drop`, `carrot`, `pill`, `tooth`, `bed`, `moon`, `wine`, `cigarette`, `coffee`,
    `fork-knife`, `hamburger`, `heartbeat`
  - mind: `leaf`, `brain`, `flower-lotus`, `sun-horizon`, `smiley`, `notebook`, `sun`
  - home: `broom`, `sparkle`, `cat`, `dog`, `plant`, `washing-machine`, `trash`, `house`
  - social: `phone`, `users-three`, `chat-circle`, `envelope`, `heart`, `gift`
  - learning: `book-open`, `graduation-cap`, `translate`, `code`, `pencil-simple`, `lightbulb`
  - creative: `paint-brush`, `music-notes`, `camera`, `guitar`, `palette`, `pen-nib`
  - money: `piggy-bank`, `wallet`, `coins`, `shopping-cart`, `receipt`, `chart-line-up`
  - other: `star`, `alarm`, `target`, `trophy`, `rocket`, `cactus`, `flower`, `pizza`

  `CATEGORY_ICON`: fitness `barbell`, health `heartbeat`, mind `brain`, home `house`, social
  `users-three`, learning `graduation-cap`, creative `palette`, money `piggy-bank`, other `sparkle`.
  `AVATAR_ICONS`: `smiley`, `cat`, `dog`, `flower-lotus`, `leaf`, `sun`, `moon`, `star`, `plant`,
  `mountains`, `coffee`, `music-notes`, `rocket`, `cactus`, `flower`, `pizza`, `soccer-ball`,
  `basketball`, `guitar`, `palette`, `heart`, `trophy`, `book-open`, `bicycle` (24, matching today's
  avatar count).

- [ ] **Step 5: Run it.** Same command → PASS.

- [ ] **Step 6: Write the failing component test** (`Icon.svelte.spec.ts`, browser project)

```ts
it('renders the named icon, hidden from assistive tech', async () => {
	const { container } = render(Icon, { name: 'book-open' });
	const svg = container.querySelector('svg')!;
	expect(svg.getAttribute('aria-hidden')).toBe('true');
	expect(container.innerHTML).toBe(render(Icon, { name: 'book-open' }).container.innerHTML);
});
it('falls back to sparkle for an unknown name', async () => {
	const unknown = render(Icon, { name: 'not-an-icon' }).container.innerHTML;
	const sparkle = render(Icon, { name: 'sparkle' }).container.innerHTML;
	expect(unknown).toBe(sparkle);
});
it('defaults to the duotone weight', async () => {
	/* duotone renders an element with opacity 0.2 */
	expect(render(Icon, { name: 'drop' }).container.querySelector('[opacity="0.2"]')).not.toBeNull();
});
```

- [ ] **Step 7: Run it** (`npx vitest --run src/lib/components/Icon.svelte.spec.ts`) → FAIL.

- [ ] **Step 8: Implement `Icon.svelte`:** a static `Record<IconName, Component>` built from
      per-icon imports (`import BookOpen from 'phosphor-svelte/lib/BookOpen'`), so only curated icons
      are bundled; look up `name`, fall back to `sparkle`; pass `weight` (default `duotone`), `size`
      (default `'1em'`), `class`, `aria-hidden="true"`.

- [ ] **Step 9: Run both tests** → PASS. `npm run check` → 0 errors.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json src/lib/icons.ts src/lib/icons.spec.ts src/lib/components/Icon.svelte src/lib/components/Icon.svelte.spec.ts
git commit -m "feat(icons): curated Phosphor icon registry and Icon component"
```

### Task 2: Garden tokens

**Files:**

- Modify: `src/routes/layout.css`, `src/lib/tokens.spec.ts`

**Interfaces:**

- Produces Tailwind color tokens `page`, `surface`, `ink`, `muted`, `line`, `forest`, `leaf`,
  `leaf-2`, `terracotta`, `earned-tile`, `protected-tile`, `protected-ring`, `risk-tile`,
  `lost-ring`; radius tokens `--radius-sheet: 24px`, `--radius-tile: 18px`, `--radius-row: 16px`,
  `--radius-input: 14px`; `--shadow-sheet` (spec value) and utility `shadow-sheet`.
- Keeps old names as aliases (same values) until PR 4 removes them: `cream`→page, `accent`→forest,
  `accent-edge`→forest, `earn`→earned-tile, `earn-edge`/`earn-shadow`→forest, `protect`→
  protected-tile, `protect-edge`/`protect-shadow`→protected-ring, `risk`→risk-tile,
  `risk-edge`/`risk-shadow`→terracotta, `lost`→page. `--radius-square` → 18px. The `.ripple`
  keyframes use `forest`.

- [ ] **Step 1: Rewrite `tokens.spec.ts` (failing)** keeping its `token`/`contrast` helpers:

```ts
it.each([
	['ink', 'page'],
	['ink', 'surface'],
	['muted', 'page'],
	['muted', 'surface'],
	['ink', 'earned-tile'],
	['ink', 'protected-tile'],
	['ink', 'risk-tile']
])('%s text on %s meets 4.5:1', (fg, bg) =>
	expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5)
);
it('white on forest meets 4.5:1', () =>
	expect(contrast('#ffffff', token('forest'))).toBeGreaterThanOrEqual(4.5));
it.each([
	['forest', 'earned-tile'],
	['protected-ring', 'protected-tile'],
	['terracotta', 'risk-tile'],
	['lost-ring', 'page'],
	['forest', 'surface']
])('%s ring on %s meets 3:1', (ring, bg) =>
	expect(contrast(token(ring), token(bg))).toBeGreaterThanOrEqual(3)
);
it('white icon on terracotta meets 3:1', () =>
	expect(contrast('#ffffff', token('terracotta'))).toBeGreaterThanOrEqual(3));
```

- [ ] **Step 2: Run it.** `npx vitest --run src/lib/tokens.spec.ts` → FAIL (no `--color-page`).
- [ ] **Step 3: Edit `layout.css` `@theme`** with the spec values and aliases above; `body` uses
      `bg-page text-ink`.
- [ ] **Step 4: Run it** → PASS. If a pair fails, stop: the spec's color is wrong, report it rather
      than nudging values silently.
- [ ] **Step 5: Run the browser component specs** (`npx vitest --run --project client`) and fix any
      assertion that pinned an old class name only (not behavior).
- [ ] **Step 6: Commit** `feat(design): Garden color, radius and shadow tokens`.

### Task 3: `ProgressRing` and `Hero`

**Files:**

- Create: `src/lib/components/ProgressRing.svelte`, `ProgressRing.svelte.spec.ts`,
  `src/lib/components/Hero.svelte`, `Hero.svelte.spec.ts`

**Interfaces:**

- Consumes: `Icon` (Task 1), tokens (Task 2).
- Produces:
  - `ProgressRing` props `{ icon: string; variant: 'open' | 'progress' | 'earned' | 'protected' | 'risk' | 'lost'; percent?: number; size?: 'sm' | 'md' | 'lg' }`.
    Size px: sm 32, md 42, lg 56; stroke 3.5 (sm 3). `progress` draws the forest arc at
    `clamp(percent, 0, 100)`; `earned` full forest; `protected` full `protected-ring`; `risk` dashed
    terracotta (`6 5`); `lost` full `lost-ring`; `open` track only (`line`). The arc's
    `stroke-dasharray` transition (400ms ease-out) is removed under reduced motion. The whole ring is
    `aria-hidden`; the caller supplies text.
  - `Hero` props `{ title: string; summary?: string; children?: Snippet }`: forest banner, title
    800 28px, summary 600 13px, two leaf SVG shapes in `leaf`/`leaf-2` that drift slowly (CSS
    animation, off under reduced motion), bottom padding so a following sheet can overlap by 18px
    (`-mt-[18px]` on the sheet is the caller's job). Renders `<h1>` for the title.

- [ ] **Step 1: Failing tests:**

```ts
// ProgressRing
it('progress draws the arc at the given percent', () => {
	const c = render(ProgressRing, { icon: 'drop', variant: 'progress', percent: 50 }).container;
	const arc = c.querySelector('[data-arc]')!;
	expect(Number(arc.getAttribute('data-percent'))).toBe(50);
});
it('clamps percent to 0..100', () => {
	/* -10 → 0, 150 → 100 via data-percent */
});
it.each(['earned', 'protected', 'risk', 'lost', 'open'])(
	'%s renders and is hidden from assistive tech',
	(variant) => {
		const c = render(ProgressRing, { icon: 'drop', variant }).container;
		expect(c.firstElementChild!.getAttribute('aria-hidden')).toBe('true');
		expect(c.firstElementChild!.getAttribute('data-variant')).toBe(variant);
	}
);
it('risk is dashed', () => {
	const c = render(ProgressRing, { icon: 'drop', variant: 'risk' }).container;
	expect(c.querySelector('[data-arc]')!.getAttribute('stroke-dasharray')).toBe('6 5');
});
// Hero
it('renders the title as the page heading and the summary', () => {
	const c = render(Hero, {
		title: 'Good morning, Zach',
		summary: '3 things to do today'
	}).container;
	expect(c.querySelector('h1')!.textContent).toBe('Good morning, Zach');
	expect(c.textContent).toContain('3 things to do today');
});
```

- [ ] **Step 2: Run** `npx vitest --run src/lib/components/ProgressRing.svelte.spec.ts src/lib/components/Hero.svelte.spec.ts` → FAIL.
- [ ] **Step 3: Implement both** per the Interfaces block.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(design): ProgressRing and Hero components`.

### Task 4: `IconPicker` (replaces `EmojiPicker`)

**Files:**

- Create: `src/lib/components/IconPicker.svelte`, `IconPicker.svelte.spec.ts`

**Interfaces:**

- Consumes: `ICONS`, `IconName`, `Icon`.
- Produces: `IconPicker` props `{ name: string; value: string (bindable); options?: readonly IconName[]; label?: string; error?: string; groups?: boolean }`.
  Default `options` = all `ICONS`; `groups` true shows the options under category subheadings
  (habit and group forms), false a flat grid (avatars). Native radios like `EmojiPicker` (one tab
  stop, arrows move, posts without JS), each radio named by its icon `label` via `aria-label`,
  selection shown by a forest ring plus a check mark (not color alone). Tiles 44px minimum.

- [ ] **Step 1: Failing tests:**

```ts
it('posts the checked icon as a native radio', async () => {
	const { container } = render(IconPicker, {
		name: 'icon',
		value: 'leaf',
		options: ['leaf', 'drop']
	});
	const checked = container.querySelector('input[type=radio]:checked') as HTMLInputElement;
	expect(checked.name).toBe('icon');
	expect(checked.value).toBe('leaf');
});
it('names each option by its label', () => {
	const { getByRole } = render(IconPicker, { name: 'icon', value: '', options: ['book-open'] });
	expect(getByRole('radio', { name: 'Book' })).toBeTruthy(); // use the label you chose in ICONS
});
it('links the error to the group', () => {
	const { getByRole } = render(IconPicker, { name: 'icon', value: '', error: 'Pick an icon.' });
	expect(getByRole('radiogroup').getAttribute('aria-invalid')).toBe('true');
});
it('arrow key moves the selection', async () => {
	/* focus checked radio, press ArrowRight, next is checked */
});
```

- [ ] **Step 2: Run** `npx vitest --run src/lib/components/IconPicker.svelte.spec.ts` → FAIL.
- [ ] **Step 3: Implement** per Interfaces.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(design): IconPicker`.

### Task 5: Migration `0011_icons` and schema

**Files:**

- Create: `src/lib/server/db/emoji-icons.ts`, `src/lib/server/db/emoji-icons.spec.ts`,
  `drizzle/0011_icons.sql` (+ `drizzle/meta` snapshot/journal from generate)
- Modify: `src/lib/server/db/schema/{habits,cards,groups,auth}.ts`

**Interfaces:**

- Produces columns: `habit.icon text not null default 'sparkle'`, `card_square.icon text` (null
  only when `is_center`), `group.icon text not null default 'sparkle'`,
  `user.avatar_icon text not null default 'smiley'`. The defaults keep existing insert paths valid
  between Task 5 and Task 6 (`0012` may drop them with the emoji columns).
  Drizzle field names: `icon`, `avatarIcon`.
- `EMOJI_TO_ICON: Readonly<Record<string, IconName>>` covering at least: every starter emoji
  (📚 book-open, 🚴 bicycle, 🧘 flower-lotus, 🧹 broom, 🐈 cat, 💧 drop, 📞 phone, 🍔 hamburger,
  😴 bed, 🍺 wine), every category emoji (💪 barbell, 🥗 carrot, 🧠 brain, 🏠 house, 👥 users-three,
  📚 book-open, 🎨 palette, 💰 piggy-bank, ✨ sparkle), every avatar emoji (🙂 smiley, 😎 smiley,
  🤓 smiley, 🥳 smiley, 😺 cat, 🐶 dog, 🦊 dog, 🐼 heart, 🐸 leaf, 🐵 smiley, 🦄 star, 🐙 heart,
  🌵 cactus, 🌻 flower, 🍀 leaf, 🍉 pizza, 🍕 pizza, 🍩 coffee, ⚽ soccer-ball, 🏀 basketball,
  🎸 guitar, 🎨 palette, 🚀 rocket, ⭐ star) and the HabitForm suggestion emoji.

- [ ] **Step 1: Failing map test** (`emoji-icons.spec.ts`):

```ts
it('maps every starter, category and avatar emoji to a curated icon', () => {
	for (const e of [
		...STARTERS.map((s) => s.emoji),
		...CATEGORIES.map((c) => c.emoji),
		...AVATAR_EMOJI
	])
		expect(isIconName(EMOJI_TO_ICON[e])).toBe(true);
});
it('the migration SQL mirrors the map exactly', () => {
	const sql = readFileSync('drizzle/0011_icons.sql', 'utf8');
	for (const [emoji, icon] of Object.entries(EMOJI_TO_ICON))
		expect(sql).toContain(`WHEN '${emoji}' THEN '${icon}'`);
});
```

(Run this before Task 6 changes `STARTERS`/`CATEGORIES`/`AVATAR_EMOJI`; Task 6 keeps a frozen copy
of the old emoji lists in this spec file so the test stays meaningful.)

- [ ] **Step 2: Run** `npx vitest --run src/lib/server/db/emoji-icons.spec.ts` → FAIL.
- [ ] **Step 3: Write `EMOJI_TO_ICON`.** Edit the four schema files: add the columns; set
      `habit.emoji` and `group.emoji` `.default('✨')`; `card_square.emoji` stays nullable; change the
      `card_square` check constraint to require `icon` (not `emoji`) on non-center squares.
- [ ] **Step 4: Generate** `npm run db:generate -- --name icons` (needs no DB). Then hand-edit
      `drizzle/0011_icons.sql`, in this order, keeping `--> statement-breakpoint` separators:
  1. add `icon` / `avatar_icon` columns as nullable;
  2. `UPDATE ... SET icon = CASE emoji WHEN '📚' THEN 'book-open' ... ELSE 'sparkle' END` for
     `habit`, `group`, `card_square` (only `WHERE NOT is_center`), and `user.avatar_icon` with
     `ELSE 'smiley'`;
  3. `SET DEFAULT 'sparkle'` then `SET NOT NULL` on `habit.icon` and `group.icon`;
     `SET DEFAULT 'smiley'` then `SET NOT NULL` on `user.avatar_icon`; `SET DEFAULT '✨'` on
     `habit.emoji` and `group.emoji`;
  4. drop and re-add the `card_square` check constraint with `icon`.
     Keep generated statements that already match; the journal entry stays as generated.
- [ ] **Step 5: Failing backfill tests** in `src/lib/server/db/emoji-icons.spec.ts` using a PGlite
      migrated to `0010` then `0011` (helper: copy `drizzle/` to a temp dir, trim
      `meta/_journal.json` `entries` to `idx <= 10`, `migrate` from it, insert rows, then `migrate` from
      the real `drizzle/` folder to apply `0011`):

```ts
it('backfills mapped emoji', ...);              // habit 📚 → book-open, group ⚽ → soccer-ball, user 🦊 → dog
it('backfills unmapped emoji to sparkle', ...);  // habit '🦖' → sparkle; user '🦖' avatar → smiley
it('backfills card squares and leaves the center null', ...); // non-center 💧 → drop; center icon is null
```

- [ ] **Step 6: Run** `npx vitest --run src/lib/server/db/emoji-icons.spec.ts` → PASS; then
      `npx vitest --run --project server` → all existing server tests still PASS (the column defaults
      keep their inserts valid).
- [ ] **Step 7: Commit** `feat(db): icon columns with emoji backfill (0011)`.

### Task 6: Server switch to icons

**Files:**

- Modify: `src/lib/game/categories.ts`, `starters.ts`, `recap.ts`, `src/lib/profile.ts`,
  `src/lib/server/{habits,habit-form,groups,cards,card-view,leaderboard}.ts`,
  `src/lib/server/auth/{accounts,create-auth}.ts`, the matching `*.spec.ts`, and the
  `+page.server.ts` files that read or validate emoji: `onboarding`, `(app)/me`, `(app)/groups/new`,
  `(app)/groups/[id]`, `(app)/card/build/[step]`, `(app)/card/squares/[id]`, `(app)/me/habits/[id]`,
  `(app)/me/habits/[id]/delete`, `(app)/me/history/[month]`, `(app)/today`, `(app)/+layout.server.ts`.

**Interfaces:**

- Consumes: `isIconName`, `CATEGORY_ICON`, `AVATAR_ICONS`, `DEFAULT_AVATAR_ICON`, `FALLBACK_ICON`.
- Produces (renames, everywhere): `emoji` → `icon` on `Habit`, `HabitInput`, `Starter`, category
  entries (`CATEGORIES[n].icon`), card square/view types, recap `mostLogged`/`categoryBreakdown`
  entries, group summaries and `createGroup` input; `avatarEmoji` → `avatarIcon` on the user,
  `AVATAR_EMOJI` → `AVATAR_ICONS` (from `icons.ts`; delete the emoji list from `profile.ts`).
  Form field names become `icon` and `avatarIcon`. Error copy: habits and groups
  `'Pick an icon.'`, avatar `'Pick one of the avatars.'` (unchanged). Better Auth
  `additionalFields`: replace `avatarEmoji` with `avatarIcon { type: 'string', required: false, defaultValue: 'smiley' }`.
  `isSingleEmoji` is deleted if nothing else uses it.

- [ ] **Step 1: Failing tests** (add to existing specs):

```ts
// habits.spec.ts
it('rejects an icon outside the set', async () => {
	const r = await createHabit(db, user.id, { ...valid, icon: 'not-an-icon' });
	expect(r).toEqual({ ok: false, field: 'icon', message: 'Pick an icon.' });
});
// groups.spec.ts — same for createGroup({ name: 'Crew', icon: 'nope' }) → field 'icon'
// accounts.spec.ts — updateProfile/onboarding with avatarIcon 'nope' → field 'avatarIcon'
// create-auth.spec.ts
it('a new account gets the default avatar icon', async () => {
	/* sign up through the test auth; select user.avatarIcon → 'smiley' */
});
// cards.spec.ts — startCard snapshots habit.icon onto each square; center square icon is null
```

- [ ] **Step 2: Run** `npx vitest --run --project server` → the new tests FAIL.
- [ ] **Step 3: Implement the renames** across the listed files; validation uses `isIconName`.
      Update every existing spec fixture from emoji to icon names (`'💧'` → `'drop'` etc.). Keep the
      frozen old emoji lists inside `emoji-icons.spec.ts` (Task 5) as local constants.
- [ ] **Step 4: Run** `npx vitest --run --project server --coverage` → all PASS, `src/lib/game` at
      100%.
- [ ] **Step 5: Run** `npm run check` → 0 errors in server code (Svelte files may still error until
      Task 7; note the count).
- [ ] **Step 6: Commit** `refactor(icons): store and validate icons instead of emoji`.

### Task 7: UI switch to icons

**Files:**

- Modify (render `Icon` wherever an emoji was rendered; forms post `icon`/`avatarIcon`):
  components `BingoSquare`, `CardBoard`, `CategoryFilter`, `HabitForm`, `HabitPicker`, `HabitRow`,
  `HabitSheet`, `SampleCard`, `StarterHabits`, `TargetList`, `TextField` (remove any emoji-only
  affordance), `TodayRow`; routes `(app)/+layout.svelte` (avatar), `(app)/groups/+page.svelte`,
  `(app)/groups/[id]/+page.svelte`, `(app)/groups/[id]/members/[userId]/+page.svelte`,
  `(app)/groups/new/+page.svelte`, `(app)/me/+page.svelte`, `(app)/me/habits/+page.svelte`,
  `(app)/me/habits/[id]/delete/+page.svelte`, `(app)/me/history/[month]/+page.svelte`,
  `+page.svelte` (landing sample), `join/[code]/+page.svelte`, `onboarding/+page.svelte`;
  their `*.svelte.spec.ts`; e2e `habits.e2e.ts`, `card-builder.e2e.ts`, `card.e2e.ts`,
  `groups.e2e.ts`.
- Delete: `src/lib/components/EmojiPicker.svelte` (+ spec).

**Interfaces:**

- Consumes: `Icon`, `IconPicker`, the renamed fields from Task 6.
- Habit form: `IconPicker` with `groups`, default selection = `CATEGORY_ICON[category]` when the
  form is blank and the person has not picked one. Group form: `IconPicker` with `groups`.
  Onboarding and Me profile: `IconPicker` with `options={AVATAR_ICONS}`, flat. Avatars render as the
  icon on a `forest`-tinted circle. Private squares on member cards keep the 🔒 meaning via
  `Icon name="lock"` — add `lock` to the curated set in this task if missing (and to the Task 1
  test's expectations).

- [ ] **Step 1: Update the component specs** that asserted emoji text to assert the `Icon`
      (e.g. `container.querySelector('svg')`) and accessible names; run
      `npx vitest --run --project client` → FAIL where components still render emoji.
- [ ] **Step 2: Implement** the renders and forms.
- [ ] **Step 3: Run** `npx vitest --run --project client` → PASS; `npm run check` → 0 errors;
      `grep -rn "emoji" src --include=*.svelte` → only `Icon`-unrelated comments, if any.
- [ ] **Step 4: Update the four e2e specs**: steps that type or pick an emoji now pick an icon radio
      by its label (`getByRole('radio', { name: '...' })`).
- [ ] **Step 5: Run** `npx playwright test e2e/habits.e2e.ts e2e/card-builder.e2e.ts e2e/card.e2e.ts e2e/groups.e2e.ts e2e/onboarding.e2e.ts e2e/me.e2e.ts`
      → all PASS.
- [ ] **Step 6: Commit** `feat(icons): render icons and pick them with IconPicker`.

### Task 8: Restyle base components and nav

**Files:**

- Modify: `src/lib/components/{Button,TextField,Sheet,Toast,CookieNotice,ConfirmAction}.svelte`
  (+ specs only where they pin classes), `src/routes/(app)/+layout.svelte`.

**Interfaces (looks, per spec §2):**

- `Button` primary: `bg-forest text-white rounded-full`, no shadow, 44px min height, press
  `active:scale-[0.97]` (no scale under reduced motion); secondary: `bg-surface text-ink border
border-line rounded-full`. Focus ring stays 3px ink, offset 2.
- `TextField`: `bg-surface border border-line rounded-[14px]`, no sticker shadow; focus ring forest.
- `Sheet`: `bg-surface rounded-t-[24px]` on phones, `rounded-[24px]` dialog on desktop,
  `shadow-sheet`; behavior (focus trap, restore, Escape) unchanged.
- `Toast`, `CookieNotice`, `ConfirmAction`: surface + `shadow-sheet`, rounded 24/16, no hard
  shadows; CookieNotice keeps `bottom-[calc(1rem+var(--tab-bar,0px))]`.
- Nav (`(app)/+layout.svelte`): replace the inline SVGs with `Icon` (`sun-horizon`, `grid-nine`,
  `users-three`, `user-circle`, `shield-check` for Admin; add any missing to the curated set),
  tabs `bg-surface border-line`, active tab `border-forest text-forest bg-page`, raised 8px, hover
  lifts 4px; tabs extend 12px below the viewport (as today) so a raised tab shows no gap; labels
  ≥ 11px (use 12px). Header: avatar = `Icon` on a forest-tinted circle.

- [ ] **Step 1: Run** `npx vitest --run --project client` → note any spec that pins removed
      classes; update those to behavior assertions (role, name, focus) rather than class names.
- [ ] **Step 2: Implement** the restyles.
- [ ] **Step 3: Run** `npx vitest --run --project client` → PASS; `npm run lint` → clean.
- [ ] **Step 4: Visual pass** on the local seeded server (`scripts/e2e-server.ts` flow, signed in
      as `e2e_member` with a card): screenshot `/today`, `/card`, `/me` at 360px and 1280px; check no
      horizontal scroll (`document.documentElement.scrollWidth === innerWidth`), no hard shadows on
      the restyled components, the active tab shows no gap.
- [ ] **Step 5: Commit** `feat(design): Garden base components and nav`.

### Task 9: Full verification

- [ ] **Step 1:** `npm run check` → 0 errors, 0 warnings.
- [ ] **Step 2:** `npm run lint` → clean.
- [ ] **Step 3:** `npx vitest --run --coverage` → all pass, `src/lib/game` 100%.
- [ ] **Step 4:** `npx playwright test` → all pass on phone and desktop (rerun once if only
      auth-spec hook timeouts appear; report any persistent failure).
- [ ] **Step 5:** Update `DESIGN.md` frontmatter colors/radii/shadow to the Garden tokens and its
      Overview to "Garden" (keep it untracked unless the owner asks to commit it).
- [ ] **Step 6:** Push the branch and open the PR (owner merges): title
      `feat(design): Garden foundation (tokens, icons, base components)`.
