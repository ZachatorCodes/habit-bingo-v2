# When protect squares count: design

Status: approved in brainstorming 2026-10-30. Changes v2 spec §3.5 (square states) and §3.6–§3.7
(what counts toward lines, tiers and points). Where they differ, this document wins.

## 1. Intent

A new card should not start with a bingo. Today every protect square starts `held` and counts at
once, so a card with a few "at most" or "every day" habits reaches Bingo, tiers and points the
moment it starts. Squares should count only once they have been earned.

Success:

- A newly started card has 0 points and no tier reached.
- Someone keeping up with "every day" habits can still get a bingo mid-month.
- "At most" squares that held all month count at month end.

## 2. Rules

- **"At most" squares** (any period): states are unchanged (`held`, `atRisk` at the limit, `lost`
  over it). While today ≤ the card's last day they do **not** count toward lines, tiers, blackout
  or points. Once today is after the card's last day (the 1st–3rd grace days and month close),
  `held` and `atRisk` count as they do now.
- **"At least" day and week squares** ("every day", "N days a week"):
  - State `empty` (already labelled "Not started") until the first met period: a day whose count
    reached the target, or a week (the current one included) with a requirement above 0 whose
    progress reached it. `empty` does not count.
  - After that, the existing rules apply unchanged: `held`, `atRisk`, `lost`, with the 3-day
    settle rule and winning back by logging a missed day. Today, or the current week, not being
    done yet is not a miss, so a counting square stays counted overnight.
  - A square that is `lost` stays `lost` (a met day does not override a settled miss).
- **Unchanged:** monthly "at least" goals (earn squares), the Free square, the 48-hour edit
  window, recaps and final leaderboards (they read the same states at month close).
- **Existing cards** are re-scored live by the new rule. No migration.

## 3. What people see

- **"At most" squares during the month:** same look as today. The square's sheet adds the line
  "Counts at the end of the month if you stay under."
- **Not-started protect squares** use the existing `empty` look and its "Not started" label.
- **Points, leaderboard, "Next reward":** only what counts now. No projected score.
- **Feed:** follows square states as today, so no day-one tier posts. Nothing new posts at month
  end.

## 4. Testing (test-driven)

Every behaviour below is written as a failing test first, seen failing, then made to pass.

- **Unit (`src/lib/game`, 100% coverage kept):**
  - an "at most" daily, weekly and monthly square does not count on the 15th and counts the day
    after the card's last day;
  - "every day" is `empty` on day one before logging, counts after one met day, and still
    counts the next morning before logging;
  - "every week" is `empty` until a week's requirement is met, the current week included;
  - a settled miss before the first met day is `lost`, not `empty`;
  - a card started with only protect squares has 0 points and no tiers;
  - existing win-back tests still pass.
- **End-to-end:** start a card and see 0 pts and no Bingo.

## 5. Out of scope

- A projected or "if you hold" score.
- Posting check-ins to the feed (its own spec, 2026-10-30-check-in-feed).
- Keeping the old rule for cards started before the change.
