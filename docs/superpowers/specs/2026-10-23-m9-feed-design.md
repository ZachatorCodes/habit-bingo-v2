# M9 Feed: design

Status: approved in brainstorming 2026-10-23. Refines v2 spec §4.9 "Feed (highlights only)" and
"Reactions" (`2026-10-09-habit-bingo-v2-design.md`). Where this document and the v2 spec differ, this
one wins.

## 1. Intent

Each group gets a feed of its members' highlights, so friends see progress and cheer each other on
without seeing every check-in. Success:

- the group page opens on a Feed of real, current highlights;
- friends react with one icon each;
- private habits are never named;
- an undo never leaves a false highlight behind.

## 2. Decisions

- **Reactions are icons, not emoji**, matching the Garden design. There are six, each with an `Icon` name:
  - `heart`;
  - `fire` (Phosphor `Fire`);
  - `hands-clapping` (`HandsClapping`);
  - `trophy`;
  - `star`;
  - `smiley`.

  Any new icon goes into `ICONS`, `Icon.svelte` and `RESERVED`.

- **A highlight exists only while it is true.** It is posted when a check-in makes it true and removed (with its reactions) when a check-in, or an undo, makes it false. Each one exists at most once per card at a time.
- **Only check-ins create square and tier highlights.**
  - Starting a card posts only "card started".
  - A bingo, 60% tier or blackout that a card already has at its start is never posted.
  - A tier posts only when a check-in moves the card from not reached to reached.
- **"At least" squares post when they become complete.** "At most" (protect) squares never post: being held is the default, not an achievement.
- **The group page opens on Feed.**
  - On phones and at 768–1023px, the tabs are Feed, Leaderboard, Members.
  - At ≥1024px, Feed is the main column, with Leaderboard and Members stacked in a 360px right column.

## 3. Data (migration `0012`; the planned emoji-column drop becomes `0013`)

- **`feed_event` table:**
  - `id` text primary key;
  - `user_id` references `user`, on delete cascade;
  - `card_id` references `card`, on delete cascade;
  - `type` text, one of `cardStarted`, `squareComplete`, `bingo`, `sixtyPercent`, `blackout`;
  - `key` text: `card`, `square:<squareId>` or `tier:<type>`;
  - `payload` jsonb;
  - `created_at` timestamptz, default now.

  It is unique on `(card_id, key)` and indexed on `(user_id, created_at desc)`. The payload is a snapshot taken when the event is posted:
  - `cardStarted`: `{ month }`, e.g. `"2026-11"`;
  - `squareComplete`: `{ name, icon }` for a public habit, or `{ private: true }`;
  - tier events: `{}`.

- **`reaction` table:**
  - `feed_event_id` references `feed_event`, on delete cascade;
  - `user_id` references `user`, on delete cascade;
  - `icon` text, checked against the six names;
  - `created_at`.

  Its primary key is `(feed_event_id, user_id)`.

- **Cascades:** deleting an account or a card removes its events and reactions.
- **Card edits:** when a habit on a card is swapped inside the 48-hour edit window, events whose square no longer has the same habit are deleted in the same transaction.

## 4. Writing (server, `src/lib/server/feed.ts`)

- **`postCardStarted(tx, card)`:** called inside `startCard`'s transaction.
- **`syncHighlights(tx, card, before, after)`:** called inside the check-in service's transaction (`logCheckIn` and `setCheckIn`) after the change is applied. `before` and `after` are the card's square states and reached tiers, from the existing evaluator.
  - It inserts an event for each "at least" square newly `complete`, and deletes events for squares no longer complete.
  - It does the same for each tier newly reached or no longer reached.
  - Inserts use `ON CONFLICT (card_id, key) DO NOTHING`, and deletes are by key, so repeated writes are no-ops.
- **Pure diff:** the function that decides what changed is `highlightChanges(before, after)` in `src/lib/game/feed.ts`, covered by the `src/lib/game` coverage gate.

## 5. Reading and reacting

- **`groupFeed(db, viewerId, groupId, before?)`:**
  - Returns up to 30 events from the group's current members, newest first, each with: author (display username, avatar icon), type, payload, `createdAt`, reaction counts per icon, and the viewer's own reaction.
  - Pagination is keyset on `(created_at, id)`; the "Show older" link carries `?before=<cursor>`.
  - Only members can read it: anyone else gets a 404, as for the other group pages.
- **`react(db, userId, feedEventId, icon)`:** the viewer must share a group with the event's author, otherwise 404.
  - With no reaction yet, it inserts one.
  - With a different icon already chosen, it updates it.
  - With the same icon, it deletes it (a toggle).
- **Group page action `?/react`:** form fields `eventId` and `icon`. It is a plain form, so it works without JavaScript, and is optimistic with JavaScript on.

## 6. UI

- **Feed item:**
  - A ring avatar (the author's avatar icon), **@username**, then a sentence:
    - "completed **{name}**", or "completed a private habit";
    - "got a bingo!";
    - "reached {sixtyThreshold} squares";
    - "got a blackout!";
    - "started their {Month} card".
  - A relative time ("just now", "5m", "2h", "3d", then a date).
  - A row of six reaction buttons: each shows an icon and a count (the count is hidden at 0). The viewer's choice gets a forest ring and fill.
  - Each button is ≥44px, with the accessible name "React with {label}, {count}{, you reacted}".
- **Empty feed:** "Nothing yet. Highlights show up here as your group checks in."
- **Avatars and names** link to that member's card.

## 7. Testing

- **Unit tests** (`src/lib/game/feed.spec.ts`): `highlightChanges` must:
  - post a newly complete "at least" square, and remove a square no longer complete;
  - never post an "at most" square;
  - post a tier only on a transition;
  - post nothing when nothing changed.
- **Server tests** (PGlite):
  - `syncHighlights` is idempotent;
  - an undo removes the event and its reactions;
  - private habits are stored without a name;
  - `startCard` posts only `cardStarted`, even when the card starts with a bingo;
  - `react` inserts, then switches, then toggles off;
  - a non-member can't react (404);
  - the feed excludes non-members' events and paginates.
- **End-to-end tests:**
  - **Friend reacts:** a friend sees "@a completed Go biking" after a log and reacts with heart, and the count shows 1 for both people.
  - **Undo:** the item disappears after an undo.
  - **Defaults and access:** the group page opens on Feed; a non-member gets a 404 for the group page.
  - **No JavaScript:** reacting works.
  - **Layouts:** at 1280px Feed is beside Leaderboard and Members; at 390px the tabs are Feed, Leaderboard, Members.

## 8. Out of scope

- Comments, notifications, push, and an all-groups feed on Today.
- Posting individual check-ins, and editing or deleting feed items by hand.
