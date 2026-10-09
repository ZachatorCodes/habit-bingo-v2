# 4. Scores and square states are derived, never stored

- Status: accepted
- Date: 2026-10-09

## Context

Square states (earn, protect, at-risk, lost), lines, reward tiers and points all depend on the
card, its check-ins, the 3-day backfill window, and "today" in the user's timezone. Storing them
would mean keeping many denormalized values in sync with every check-in and every passing day.

## Decision

All of these are computed by the pure `src/lib/game` module from the card, its check-ins and an
injected date. Only finalized months are snapshotted, to `month_result`, when the closing window
ends.

## Consequences

- One source of truth; scores cannot drift from check-ins.
- The rules are pure functions, so they are exhaustively unit-testable with 100% branch coverage.
- Every read recomputes state; cards are at most 25 squares, so this is cheap.
- All-time leaderboards read snapshots, so finalized history never changes.
