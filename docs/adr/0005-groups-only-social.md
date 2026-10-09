# 5. Groups are the only social structure

- Status: accepted
- Date: 2026-10-09

## Context

Leaderboards and the feed need a "who can see me" boundary. Supporting both friends and groups
would mean two audiences, two visibility rules and two leaderboards to reconcile.

## Decision

Social features are built on groups only. A user can join many groups; each group has its own
leaderboard and feed. A one-to-one "friendship" is a two-person group. Visibility rule: anyone who
shares a group with you can see your card (private habits hidden) and your feed items.

## Consequences

- One visibility rule, easy to explain and to test.
- Invite links double as the sign-up path.
- No friend requests; a separate friends feature can be added later without changing groups.
