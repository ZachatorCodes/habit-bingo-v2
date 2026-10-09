# Habit Bingo v2 — Product & Technical Design

- **Date:** 2026-10-09
- **Status:** Draft, awaiting review
- **Repository:** `habit-bingo-v2` (new; v1 lives at `ZachatorCodes/habit-bingo` and is not a reference)

## 1. Purpose

Habit Bingo is a monthly habit game for small groups of friends. Each month you build a bingo card
from your own habit library, log habits daily with satisfying feedback, earn and protect squares,
unlock real-life rewards you set yourself, and compete with friends on group leaderboards.

v2 is a ground-up rebuild. Its goals:

1. **Satisfying to use.** Opening the app makes today's to-dos obvious; logging a habit feels good.
2. **Tight, clean codebase.** Clear layers, small files, the game rules isolated and fully tested.
3. **Built like a real product.** TDD, small PRs, CI, preview deploys, releases.
4. **Learning.** SvelteKit, TDD, incremental delivery, GitHub workflow features.
5. **Ready to grow.** The audience is the author and friends today; security, SEO and privacy
   compliance are done properly from the start so it can open up later.

Non-goals for now: native apps, push notifications, comments, friend requests, passkeys, dark mode.
These are listed under §9 Later.

## 2. Roadmap

Each milestone is a GitHub milestone made of small user-story issues and is shippable on its own.
This spec is the source of truth; each milestone gets its own implementation plan, written just
before it is built.

| #  | Milestone           | Delivers                                                                                          |
|----|---------------------|---------------------------------------------------------------------------------------------------|
| M0 | Foundation          | Repo, SvelteKit app, CI, Vercel previews + production, Neon DB, design tokens, landing, privacy/terms |
| M1 | Accounts            | Username + password sign-up/sign-in, invite-only gate, admin password-reset links, profile (name, emoji avatar, timezone, week start) |
| M2 | Habit library       | Create, edit, archive habits                                                                      |
| M3 | Card builder        | Size, habit picking, prorated targets, rewards, shuffle, 48-hour edit window                     |
| M4 | Today & check-ins   | Today list, logging with Pop & burst, 3-day backfill, earn/protect states                        |
| M5 | Card view & scoring | Emoji grid + bottom sheet, lines, reward tiers, points, bingo celebration                        |
| M6 | Updates             | Nudges & insights screen                                                                          |
| M7 | Month lifecycle     | Closing window, finalization, recap, history                                                      |
| M8 | Groups              | Groups, invite links (also the signup path), leaderboards, viewing members' cards                |
| M9 | Feed                | Highlights feed with emoji reactions                                                              |

M0–M5 is a complete single-player game. M6–M7 make it sticky. Social (M8–M9) comes after the core
loop feels great.

**Bootstrapping invites before M8:** M1 introduces the `invite` table with an optional `groupId`.
Until groups exist, invites are created by an admin (the first account, seeded via a script). M8
adds group invite links using the same table.

## 3. Game rules

These rules live in the pure `game` module (§5) and are the primary TDD target.

### 3.1 Definitions

- **User-local date:** every "day" is a calendar date (`YYYY-MM-DD`) in the user's timezone, stored
  on their profile (auto-detected at onboarding, editable in settings).
- **Week:** a calendar week starting Monday or Sunday per the user's `weekStartsOn` setting.
- **Backfill window:** today plus the previous 3 days. Check-ins can be added or removed only for
  dates in this window (and within the card's span).

### 3.2 Habits

A habit has: `emoji`, `name`, `direction` (`atLeast` | `atMost`), `target` (integer N),
`period` (`day` | `week` | `month`), and `isPrivate`.

Valid combinations:

| direction \ period | day                | week                 | month                 |
|--------------------|--------------------|----------------------|-----------------------|
| `atLeast`          | protect (N fixed 1) | protect (1 ≤ N ≤ 7)  | **earn** (1 ≤ N ≤ 31) |
| `atMost`           | not offered        | protect (0 ≤ N ≤ 6)  | protect (0 ≤ N ≤ 30)  |

- **One check-in per habit per day.** A day is logged or not; logging the same day twice is a no-op.
- `atMost` check-ins are **slips** ("I ate out today").
- Habits are archived, not deleted, so past cards keep their history. Archived habits do not appear
  in the card builder.

### 3.3 Cards

- One card per user per calendar month (`YYYY-MM`). A card can be created on any day of the month.
- Sizes: **3×3** (9 habits), **4×4** (16 habits), **5×5** (24 habits + FREE center at index 12).
- When a card is created, each square **snapshots** its habit (emoji, name, direction, period,
  target after proration and user overrides, isPrivate). Later library edits never affect it.
- Habits are placed in random positions; the builder offers re-shuffle before the card starts.
- Three rewards (free text): **first bingo**, **~60% of squares**, **blackout**.
  Middle-tier thresholds: 3×3 → 5, 4×4 → 10, 5×5 → 15 squares. FREE counts as a square.
- **Edit window:** for 48 hours after creation (but not beyond the month's last day), habits,
  targets, rewards and layout can be edited. Afterward the card is locked.

### 3.4 Proration

A card starting on day `s` of a `D`-day month has `R = D − s + 1` days remaining. Rounding is
"round half up". The builder shows prorated values with an explanation (e.g. "13 days left") and
lets the user override any of them before starting.

| Habit                 | Prorated requirement                                                        |
|-----------------------|-----------------------------------------------------------------------------|
| `atLeast` / `month`   | `max(1, round(N × R / D))`                                                  |
| `atMost` / `month`    | `round(N × R / D)`                                                          |
| `atLeast` / `day`     | Every day from the start date to month end                                 |
| `atLeast` / `week`    | Each week clipped to the card's span (start date … month end) needs `round(N × d / 7)`, where `d` is the days of that week inside the span. Full weeks need `N`. |
| `atMost` / `week`     | Each clipped week allows `ceil(N × d / 7)`. Limits round **up** so a stub week is never stricter than a full one. |

Week clipping applies even to cards started on the 1st, because months rarely align with weeks.

### 3.5 Square states

Evaluated for a given "today". A square **counts** (toward lines, tiers and blackout) when its state
is `complete`, `held` or `atRisk`.

**Earn squares** (`atLeast` / `month`), with `k` = logged days, `N` = requirement:

| State        | Condition |
|--------------|-----------|
| `empty`      | `k = 0` |
| `inProgress` | `0 < k < N` |
| `complete`   | `k ≥ N` |

**Protect squares** start `held`:

| Habit              | `atRisk` when… | `lost` when… |
|--------------------|----------------|--------------|
| `atLeast` / `day`  | Any day in the backfill window other than today (and within the card span) is unlogged | Any card-span day older than the backfill window is unlogged |
| `atLeast` / `week` | The current week still needs `m > 0` check-ins and the days left in that week (including today) ≤ `m`; **or** a past week is short of its requirement but its last day is still within the backfill window | A week whose last day is older than the backfill window is short of its requirement |
| `atMost` / `week`  | Slips this week = the week's limit | Any week's slips exceed its limit |
| `atMost` / `month` | Slips this month = the limit | Slips exceed the limit |

`atMost` squares become `lost` immediately on exceeding a limit, but because check-ins within the
backfill window can be removed, a mistaken slip can restore the square. Once the offending days
leave the window, `lost` is permanent.

**FREE** square: always `complete`.

### 3.6 Lines and reward tiers

- Lines: every row, every column, and both diagonals (3×3: 8, 4×4: 10, 5×5: 12).
- A line is complete when all its squares count.
- Tiers: `bingo` (≥ 1 complete line), `sixtyPercent` (counting squares ≥ threshold in §3.3),
  `blackout` (all squares count).
- Tiers are **live**: losing a protect square can drop a tier. The feed (M9) announces only the
  **first** time a tier is reached on a card.

### 3.7 Points

Each square has a base value of **10**:

| Square                         | Points |
|--------------------------------|--------|
| Earn                           | `10 × min(k, N) / N` |
| `atLeast` / `day`              | `10 × logged span days / required span days` |
| `atLeast` / `week`             | `10 × Σ min(kᵥ, Nᵥ) / Σ Nᵥ` over weeks `w` (if `Σ Nᵥ = 0`, the square scores 10) |
| `atMost` (week or month)       | `10` while `held`/`atRisk`, `0` when `lost` |
| FREE                           | `0` |

Bonuses: **+25** per complete line, **+100** for blackout.
Size multiplier on the total: **3×3 ×1, 4×4 ×1.5, 5×5 ×2**. Displayed points are rounded to the
nearest integer at the end of the calculation.

`atLeast` day/week squares keep their earned points even after being `lost`.

Example: a 3×3 blackout = 9 squares × 10 + 8 lines × 25 + 100 = 390. A 5×5 blackout
(24 habit squares) = (240 + 300 + 100) × 2 = 1,280.

Live scores are **always derived** from card + check-ins + today; never stored.

### 3.8 Month lifecycle

| Phase     | When (user-local)                              | Behavior |
|-----------|------------------------------------------------|----------|
| `active`  | 1st through last day of the card's month       | Check-ins for any backfill-window date inside the month |
| `closing` | 1st through 3rd of the next month              | Backfill only for the old month; the new month's card can be built; leaderboard marks the month provisional |
| `final`   | From the 4th of the next month                 | Points, lines and tiers are snapshotted to `month_result`; card is read-only; recap shown on next app open |

Finalization runs lazily (on first read after the closing window ends) and via a daily scheduled
job, whichever comes first; it is idempotent.

### 3.9 Leaderboards (M8)

Per group, two tabs: **This month** (default; live derived points, provisional during `closing`)
and **All-time** (sum of `month_result` points plus the current month's live points). Ties share a
rank. Members without a card this month appear below those with one.

## 4. Screens & flows

Visual direction: **Playful & chunky**: warm cream background, bright tactile "button" squares
with a press-down shadow. Square colors: earned/complete green, protected blue, at-risk yellow,
lost faded with strikethrough. States always pair color with an icon (✓ 🛡 ⚠ ✗). Light theme only
to start.

### 4.1 Public

- **Landing** (`/`, prerendered): what it is, an animated sample card, sign-in button. OG tags.
- **Sign in** (`/signin`): username + password. "Forgot password?" explains that an admin can
  send a reset link.
- **Invite** (`/join/[code]`): "Alex invited you to *College Crew*" → create account (username,
  password) or sign in → join. Creating an account is only possible through a valid, unexpired
  invite with uses remaining.
- **Password reset** (`/reset/[token]`): set a new password using an admin-issued one-time link.
- **Privacy** and **Terms** pages. A one-time dismissible notice: "We only use essential cookies
  to keep you signed in." No consent banner (only essential cookies; analytics are cookieless).

### 4.2 Onboarding (first sign-in)

1. Profile: display name, emoji avatar (timezone and week start auto-detected).
2. Habit library: add habits; tap-to-add starter suggestions.
3. Build your first card.

### 4.3 Card builder (step flow, progress saved)

1. Size: shows multiplier and "you have X habits / need Y".
2. Pick habits; create new habits inline.
3. Review prorated targets (with "N days left" explanation); override.
4. Rewards: three text fields.
5. Preview shuffled board; re-shuffle.
6. Start card (notes the 48-hour edit window).

### 4.4 Navigation

Phone: five bottom tabs, **Today · Card · Updates · Groups · Me**. Desktop: left sidebar with the
same sections; Today and Card side-by-side where width allows.

### 4.5 Today

Sections: **Do today** (day habits; week habits still needing check-ins this week), **Anytime this
month** (earn squares), **Log a slip** (`atMost` habits). Each row: emoji, name, progress text,
check button. Earlier backfill-window days reachable via a day switcher. Empty states: "No card yet
→ Build one", "All done today 🎉".

### 4.6 Card

- Header: month, percent of squares counting, bingo count, points, reward-tier chips.
- **Phone (and all 5×5 on narrow screens):** emoji grid. Each square shows emoji, state color and a
  thin progress bar. Tapping opens a **bottom sheet**: name, rule, progress, this week's / month's
  days, log / unlog. Logging never happens from a stray grid tap.
- **Wider screens and 3×3 / 4×4:** squares also show full names.
- Private squares show to others as 🔒 with progress only.

### 4.7 Feedback & celebration

- **Check-in: Pop & burst.** Square squishes on press, springs up into its new state, confetti bits
  burst outward. Haptic tap via `navigator.vibrate` where supported (Android; iOS Safari has no
  web haptics API).
- **Line complete:** squares in the line ripple gold in sequence → "BINGO!" banner → full-screen
  confetti → reward reveal when a tier unlocks.
- `prefers-reduced-motion`: replace motion with fades; no confetti.

### 4.8 Updates

Prioritized nudges, computed from game state (no stored notifications):

1. At-risk squares ("Meditate once more by Sunday to keep your 🛡").
2. Backfill reminders ("You didn't log Litter box yesterday — still time").
3. Near bingo ("1 square from a bingo").
4. Near a reward tier ("2 squares from your 60% reward").
5. Month-end countdowns ("New month in 3 days — plan your next card").

The Updates tab shows a badge when any priority 1–2 nudge exists.

### 4.9 Groups (M8) & Feed (M9)

- Groups list → group page with **Leaderboard** (This month / All-time), **Feed**, **Members**.
- Tap a member → their card, read-only, private habits hidden.
- Create group; copy invite link; leave group; owner can remove members.
- A user can belong to many groups. A "friend" is a two-person group.
- **Feed (highlights only):** square completed, bingo, reward tier first reached, blackout, new card
  started. Private habits are never named. Individual check-ins are not posted.
- **Reactions:** one emoji reaction per user per feed item, from a small fixed set.
- **Visibility rule:** anyone who shares a group with you can see your card (minus private habit
  names) and your feed items.

### 4.10 Me

Profile, Habit library, History (past cards + recaps), Settings (timezone, week start), Change
password, Sign out everywhere, Delete account (cascades all data).

### 4.12 Admin (admins only)

Create invites (expiry, max uses) and generate one-time password-reset links for a user. The admin
copies the link and sends it to the person however they like. The first admin account is created by
a seed script.

### 4.11 Month recap

Full-screen sequence: final board → points and group rank → rewards earned → a highlight (best
streak or most-logged habit) → "Build next month's card".

## 5. Architecture

### 5.1 Stack

| Concern        | Choice |
|----------------|--------|
| Framework      | SvelteKit (Svelte 5), TypeScript strict |
| Styling        | Tailwind CSS v4 with design tokens; Bits UI for accessible primitives |
| Motion         | Svelte transitions / springs; `canvas-confetti` |
| Database       | Postgres on Neon; Drizzle ORM + Drizzle Kit migrations |
| Auth           | Better Auth with the username plugin: username + password, scrypt hashing, DB-backed sessions and rate limiting, Have I Been Pwned password check. Better Auth's core user schema expects an email; the M1 plan must verify this and, if required, store a non-routable placeholder (e.g. `<userId>@users.invalid`) that is never displayed or emailed, replaced when email recovery lands. |
| Email          | None for now (no outbound email). |
| Validation     | Zod |
| Hosting        | Vercel (production + per-PR previews); Neon branch per preview |
| Analytics      | Vercel Web Analytics (cookieless) |
| Testing        | Vitest, Testing Library (Svelte), PGlite, Playwright |

### 5.2 Layers

Dependencies point downward only.

| Layer    | Path                         | Responsibility |
|----------|------------------------------|----------------|
| Routes/UI | `src/routes`, `src/lib/components` | Pages and components. Load functions and form actions (progressive enhancement), optimistic UI for check-ins. |
| Services | `src/lib/server/services`    | Use cases (`createCard`, `logCheckIn`, `joinGroup`, …). **All authorization lives here.** Receive the current user and a `clock`. |
| Data     | `src/lib/server/db`          | Drizzle schema, migrations, small repository functions. |
| Game     | `src/lib/game`               | Pure rules from §3. No I/O, no framework imports; dates are `YYYY-MM-DD` strings. |

### 5.3 Data model

| Table | Key columns |
|-------|-------------|
| `user` (+ Better Auth `session`, `account`, `verification`) | `id`, `username` (unique, case-insensitive), `displayName`, `avatarEmoji`, `timezone`, `weekStartsOn`, `isAdmin`, `onboardedAt` (+ `email` placeholder if Better Auth requires it, see §5.1) |
| `invite` | `code` (unique), `createdBy`, `groupId?`, `expiresAt`, `maxUses`, `uses` |
| `password_reset` | `tokenHash` (unique), `userId`, `createdBy` (admin), `expiresAt`, `usedAt?` |
| `habit` | `id`, `userId`, `emoji`, `name`, `direction`, `target`, `period`, `isPrivate`, `archivedAt?` |
| `card` | `id`, `userId`, `month` (`YYYY-MM`), `size`, `startDate`, `editableUntil`, `rewardBingo`, `rewardSixty`, `rewardBlackout`; unique (`userId`, `month`) |
| `card_square` | `id`, `cardId`, `position`, `isFree`, `habitId?`, snapshot fields (`emoji`, `name`, `direction`, `period`, `target`, `isPrivate`); unique (`cardId`, `position`) |
| `check_in` | `id`, `squareId`, `date` (`YYYY-MM-DD`), `createdAt`; unique (`squareId`, `date`) |
| `group` | `id`, `name`, `emoji`, `createdBy` |
| `group_member` | `groupId`, `userId`, `role` (`owner` \| `member`), `joinedAt`; unique (`groupId`, `userId`) |
| `feed_event` | `id`, `userId`, `cardId`, `type`, `payload` (JSON), `createdAt` |
| `reaction` | `feedEventId`, `userId`, `emoji`; unique (`feedEventId`, `userId`) |
| `month_result` | `userId`, `month`, `points`, `lines`, `tiers`, `squaresCounting`, `size`; unique (`userId`, `month`) |

For week-period habits, the `target` snapshot is the full-week N; per-week requirements for
clipped weeks are computed by the game module from `startDate`, the month and `weekStartsOn`.
`card` therefore also snapshots `weekStartsOn` so a later settings change doesn't alter a card.

### 5.4 Security

| Concern | Defense |
|---------|---------|
| Passwords | Hashed with scrypt (Better Auth default); never stored or logged in plain text. Rules: at least 10 characters, max 128, not equal to the username, rejected if found in Have I Been Pwned (k-anonymity range query; the password itself never leaves the server). |
| Usernames | 3–20 characters `[a-z0-9_]`, unique case-insensitively, shown as `@username` beside display names. |
| Password reset | Admin-issued link containing a random 32-byte token; only its SHA-256 hash is stored; single use; expires after 24 hours. Using it, or changing a password, revokes all other sessions. |
| Sessions | Random session ID in an `httpOnly`, `Secure`, `SameSite=Lax` cookie, looked up in the DB; expiry; "sign out everywhere" deletes the user's sessions. |
| CSRF | SvelteKit's built-in origin check on form actions. |
| Authorization | Every service function takes the current user and scopes queries to the user or shared-group members; private habit names stripped for non-owners. Dedicated tests per rule. |
| Input | Zod schemas on every form action and API endpoint. |
| XSS | Svelte escaping by default; strict Content Security Policy via SvelteKit `kit.csp`. |
| Brute force | Better Auth DB-backed rate limits on auth routes per IP, plus per-username failed-sign-in throttling with a short lockout. Sign-in errors never reveal whether a username exists. |
| Signup | Only via a valid invite (unexpired, uses remaining). |
| Supply chain | Dependabot updates, CodeQL scanning. |
| Secrets | Vercel and GitHub environment settings only; `.env.example` documents names. |
| Data rights | Account deletion cascades all user data. |

### 5.5 SEO & privacy

- Landing, privacy and terms pages are prerendered, with title, description and Open Graph tags.
- `sitemap.xml` lists public pages; `robots.txt` allows them and disallows app routes.
- All authenticated pages send `noindex`.
- Only essential cookies (session, notice dismissal). No consent banner; privacy policy linked in
  the footer.

## 6. Error handling

- **Form actions** return typed validation errors (Zod issues mapped to fields); the UI shows them
  inline and keeps user input.
- **Optimistic check-ins** roll back with a toast if the server rejects them (e.g. date outside the
  backfill window, card locked, network failure).
- **Domain errors** (e.g. `CardAlreadyExists`, `OutsideBackfillWindow`, `CardLocked`,
  `NotAGroupMember`) are thrown by services as typed errors and mapped to HTTP status + friendly
  messages in one place.
- **Authorization failures** return 404 for resources the user may not know exist, 403 otherwise.
- **Unexpected errors** use SvelteKit's `handleError` hook: log with a request ID, show a friendly
  error page with that ID.
- **Concurrency:** unique constraints (one card per month, one check-in per square-day, one reaction
  per user-event) are the source of truth; services treat constraint violations as idempotent
  no-ops or domain errors.

## 7. Engineering process

### 7.1 TDD

Every behavior: write a failing test → watch it fail for the right reason → minimal code to pass →
refactor → commit. Each issue's acceptance criteria are written as Given/When/Then and map
one-to-one to tests.

| Level       | Tool                              | Scope | Gate |
|-------------|-----------------------------------|-------|------|
| Unit        | Vitest                            | `game` module, every rule in §3 plus edge cases (leap years, months starting on each weekday, 1-day stub weeks, limit 0, start on last day) | 100% branch coverage |
| Integration | Vitest + PGlite                   | Services and repositories, including authorization rules | Required in CI |
| Component   | Vitest + Testing Library (Svelte) | Square states, bottom sheet, builder steps | Required in CI |
| E2E         | Playwright (phone + desktop viewports) | Critical journeys: invite → onboard → build card → check in → bingo; month rollover with a fake clock | Required in CI |

- **Injectable time:** the game module takes dates as arguments; services receive a `clock`.
- **Test sign-in:** a sign-in route for E2E exists only when `NODE_ENV=test`; a test asserts it
  returns 404 in production builds.

### 7.2 Workflow (GitHub Flow)

- `main` is always deployable and auto-deploys to production.
- Short-lived branches (`feat/…`, `fix/…`, `chore/…`) → PR → required checks → Vercel preview →
  squash-merge with a Conventional Commit title.
- Branch protection on `main`: PR required, checks required, linear history.
- GitHub Issues per user story (template: story + Given/When/Then acceptance criteria), grouped into
  milestones (§2) and tracked on a GitHub Projects board.
- PR template: summary, linked issue, test evidence, screenshots/preview, checklist.
- **release-please** opens release PRs from Conventional Commits; merging tags a semver release
  with a changelog.

### 7.3 CI (GitHub Actions, every PR)

1. Prettier + ESLint
2. `svelte-check` (types)
3. Unit, component and integration tests with coverage gates
4. Playwright E2E
5. Build; Vercel preview with a Neon branch; preview URL posted on the PR

### 7.4 Environments

| Env        | Database |
|------------|----------|
| Local      | PGlite, or a personal Neon dev branch |
| Preview    | Neon branch per PR, deleted on merge |
| Production | Neon main branch; deployed from `main` |

### 7.5 Definition of done

Acceptance tests pass; CI green; checked on the preview deploy on a phone; code reviewed;
accessibility checked (keyboard, labels, contrast, reduced motion); docs updated.

### 7.6 Code health & docs

- One component per file; keep files small and single-purpose.
- `README.md` (setup, scripts), `CONTRIBUTING.md` (workflow), `docs/adr/` short decision records
  (SvelteKit, Drizzle, passwordless auth, derived scores, groups-only social).

## 8. Accessibility

States never rely on color alone; full keyboard support; labelled controls; WCAG AA contrast;
`prefers-reduced-motion` respected; bottom sheet and dialogs trap and restore focus.

## 9. Later (explicitly out of scope)

Push notifications (installable PWA groundwork is in scope: manifest + icons in M0), optional
email for self-service password recovery, Google/Apple sign-in, passkeys, comments, one-to-one
friends, dark mode, multiple check-ins per day, open signup.
