# Check-ins in the feed: design

Status: approved in brainstorming 2026-10-30. Reverses M9 feed spec §8 "posting individual
check-ins" (`2026-10-23-m9-feed-design.md`). Where they differ, this document wins.

## 1. Intent

Every check-in shows in the group feed, so friends see each other's daily progress and can react
to it, without one item per tap flooding the feed.

Success:

- logging a habit shows "@name logged {habit}" in each of the person's groups;
- repeated logs of the same habit on the same day update one item;
- an undo to 0 leaves nothing behind.

## 2. Rules

- **One item per person, per habit (square), per day,** with the day's count.
- **Every check-in posts,** "at most" slips included. Private habits never show their name.
- **Count changes:** `logCheckIn` and `setCheckIn` update the day's item in the same transaction
  as the check-in.
  - Count goes up: payload count updated, `created_at` set to now (the item moves to the top).
  - Count goes down but stays above 0: payload count updated, `created_at` unchanged.
  - Count reaches 0: the item and its reactions are deleted.
- **Reactions** stay on the item through count changes.
- **Highlights are unchanged** and post alongside check-in items.

## 3. Data (migration `0013`; the emoji-column drop moves to `0014`)

- `feed_event.type` check gains `checkIn`.
- Key: `checkin:<squareId>:<date>` (unique per card with the existing `(card_id, key)` index).
- Payload: `{ name, icon, date, count, backfilled }` for a public habit,
  `{ private: true, date, count, backfilled }` for a private one. `backfilled` is true when `date`
  was not the author's local today at the last write.
- Habit swaps in the 48-hour edit window delete the dropped squares' events by exact key
  (`cards.ts`, `square:<id>`); that delete must also remove `checkin:<id>:%` keys.

## 4. UI

- Sentence: "logged **{name}**" or "logged a private habit", then " ×{count}" when count > 1.
- When `backfilled` is true, add " for {Ddd}, {Mon} {d}" (e.g. "for Thu, Oct 22").
- Same author link, avatar, relative time and reaction row as other feed items.

## 5. Testing (test-driven)

Every behaviour below is written as a failing test first, seen failing, then made to pass.

- **Server (PGlite):**
  - a log posts a `checkIn` item with count 1;
  - a second log updates it to 2 and moves `created_at` forward;
  - lowering the count keeps `created_at`;
  - undo to 0 removes the item and its reactions;
  - a backfilled day stores its date and renders "for …";
  - a private habit is stored without a name;
  - a habit swap removes its check-in items;
  - non-members never see it (existing feed access rules).
- **End-to-end:** a friend sees "@a logged Drink water", reacts, sees "×2" after @a logs again,
  and sees the item disappear after an undo.

## 6. Out of scope

- Batching several habits into one item.
- Notifications, comments, muting check-ins.
