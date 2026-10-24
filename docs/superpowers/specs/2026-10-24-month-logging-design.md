# Log any day this month: design

Status: approved in brainstorming 2026-10-24. Changes v2 spec §3.1 (backfill window) and §3.8 (month
lifecycle) and the habit sheet (Garden spec §3). Where they differ, this document wins.

## 1. Intent

People forget to open the app for a few days. They should be able to log any past day of the current
month, see habit names on every card, and pick a day from a month calendar when they open a habit.

Success:

- From the card or Today, a habit opens a sheet with a month calendar. Any day from the card's start
  up to today can be logged.
- Every square on every card shows its habit name (up to two lines).
- Month close, recaps, final leaderboards and points still happen on the 4th, as today.

## 2. Rules

- **Loggable days:** a date can be logged when all of these hold:
  - it is ≥ the card's `startDate`;
  - it is ≤ today;
  - its month is still open. The current month is always open, and the previous month stays open
    on the 1st–3rd only (unchanged).
  - In practice: any day of the current card, plus the previous card's remaining days on the
    1st–3rd.
  - The `BACKFILL_DAYS = 3` constant keeps one meaning only: the 3-day grace after a month ends.
- **Missed days (owner decision 2026-10-24):** scoring keeps the 3-day rule. A day missed more than
  3 days ago makes an "at least" protect square `lost`, so it stops counting toward lines and
  points. Because any day this month can be logged, logging the missed day later wins the square
  back. Going over an "at most" limit is `lost`, and deleting the slip wins it back too. Nothing is
  final until the month closes.
- **Points, tiers, recaps, leaderboards:** unchanged; they read the same square states.
- **Feed:** highlights already follow the card's current state. Logging an old day posts or removes
  highlights at the time it is logged.
- **Honour system:** there are no extra limits on backfilling.

## 3. Habit sheet: month calendar

- **Layout:**
  - **Top:** the ring, name and rule (unchanged).
  - **Middle:** a month grid with weekday headings. Weeks start on the user's `weekStartsOn`.
  - **Bottom:** the selected day's controls. Today is selected by default.
- **Day cells:**
  - **Logged:** the date plus a forest dot (with the count if > 1). "At most" slips get a
    terracotta dot.
  - **Today:** an outlined ring.
  - **Not loggable** (future, before the start, closed): greyed out and disabled.
  - **Selected:** forest fill.
- **Selecting a day:**
  - The controls read "{Weekday}, {Mon} {d}: {n} logged" and keep the existing − / count / +
    behaviour, including setting a count.
  - On the habit page itself, the selected day is in the URL as `?day=YYYY-MM-DD`, so it works
    without JavaScript (each cell is a link) and survives a reload. In the in-place panel, selection
    is client-side.
- **History:** the calendar replaces the history list in the sheet.
- **Where it opens from:** the board (Card, the Today side panel) and a habit's name on Today. Today
  rows gain a link to the sheet; the "+" stays.
- **Accessibility:**
  - The grid is a `role="grid"` of buttons or links named "{Weekday} {Month} {d}, {n} logged", or
    "not logged", or "can't log".
  - Arrow keys move between days, and Home and End jump to the week's edges.
  - Targets are ≥ 44px, and text is ≥ 12px.

## 4. Card names

- **5×5 squares on phones:** they use the `sm` ring plus up to two lines of the name at 12px,
  clamped with an ellipsis (`line-clamp-2`). The full name stays in the square's accessible label
  and in the sheet.
- **3×3 squares and wide screens:** unchanged.

## 5. Today

- **Day chips:** the "Today / Yesterday / two days before" chips stay, as the fast way to catch up
  across all habits. They are limited to the loggable days.
- **Older days:** use the calendar in a habit's sheet.

## 6. Testing (test-driven)

Every behaviour below is written as a failing test first, run and seen failing, then made to pass.

- **Unit tests:**
  - `canLog` and the loggable-day set: the start date, today, future days, the previous month on
    the 1st–3rd versus the 4th.
  - Winning back: an "at least" daily square missed 10 days ago is `lost`, and logging that day
    makes it `held` again. An "at most" square recovers when its slip is deleted.
  - `monthGrid(month, weekStartsOn)`: weeks, leading and trailing blanks, both start days.
  - Calendar day states.
  - `src/lib/game` keeps 100% coverage.
- **Component tests:**
  - The calendar's accessible names and disabled days.
  - Arrow-key movement.
  - The selected-day controls.
- **End-to-end tests:**
  - Log a day 10 days ago from the calendar, and the board updates.
  - A future day is disabled.
  - On the 2nd, last month's days can be logged; on the 4th they can't.
  - Deleting an old slip brings back a lost square.
  - 5×5 names show at 390px with no horizontal scroll.
  - Calendar logging works without JavaScript.
  - The habit sheet opens from a Today row.

## 7. Out of scope

- Logging future days.
- Editing closed months.
- Bulk "log every day" actions.
- A date picker on Today.
- Per-habit short card labels.
