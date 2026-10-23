# M8.1 Invite management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admins see every live invite code (admin invites and group links) and can delete any of them. A deleted code stops working at once, and existing accounts and memberships are untouched.

**Architecture:** "Delete" retires the code: it sets `invite.expires_at = now`, the same mechanism `resetInvite` already uses for group links. There is no migration and no new status. `listInvites` returns only live codes, joined to the group's name and icon. `getMembership` returns only a live group link, so a group whose link was deleted shows "No invite link." until the owner resets it.

**Tech Stack:** SvelteKit 2 form actions, Drizzle + PGlite tests (server Vitest project), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-09-habit-bingo-v2-design.md`, §4.12 "Invite codes (M8.1)" and §4.9 "Group page".

## Global Constraints

- Admin-only: every new action calls the page's existing `requireAdmin(locals)`, since layout guards do not protect actions.
- Delete is a `ConfirmAction` (confirm step). It works without JavaScript, like the other admin forms.
- Deleting never touches `user`, `group` or `group_member` rows.
- The bootstrap invite code (`BOOTSTRAP_INVITE_CODE`) isn't a database row, so it never appears in the list.
- Garden UI: the Admin page's existing sheet and list styles, `Icon` and `Notice`. No emoji, ≥44px tap targets, and 40-character group names must wrap.
- Copy, exactly:
  - "No invite link." (group page);
  - "Invite deleted." (admin success notice);
  - "That invite was already gone." (admin, when the code was not live).
- Before committing: `npm run check`, plus `npx prettier --check` and `npx eslint` on the touched files.

## Review Focus

1. **Double delete:** deleting the same code twice (two tabs, or a resubmitted no-JS form) shows "That invite was already gone." and never errors. Test: Task 1 `deleteInvite` returns false the second time; Task 2 e2e covers the notice.
2. **Reset after delete:** after an admin deletes a group's link, the owner presses Reset link and gets a fresh working link. Test: Task 2 e2e.
3. **Members on a deleted link:** a member who joined through a deleted link keeps the group and their place on the leaderboard. Test: Task 1 spec "deleting a group link keeps members".
4. **Non-admins:** a non-admin POST to `?/deleteInvite` is refused. Test: Task 2 e2e posts as a member and gets 403 (or the page's existing refusal status).
5. **Long group names:** a 40-character group name in the admin list wraps at 360px. Test: Task 2 e2e checks the list has no horizontal scroll at 360px.

---

### Task 1: Server — delete, live-only lists, live group link

**Files:**

- Modify: `src/lib/server/auth/invites.ts`, `src/lib/server/groups.ts` (`getMembership` gains `now`)
- Modify callers of `getMembership`: `src/routes/(app)/groups/[id]/+page.server.ts`, `src/routes/(app)/groups/[id]/members/[userId]/+page.server.ts` (if it calls it), `src/lib/server/groups.spec.ts`, `src/lib/server/leaderboard.spec.ts`. Find them all with `grep -rn "getMembership(" src`.
- Test: `src/lib/server/auth/invites.spec.ts`, `src/lib/server/groups.spec.ts`

**Interfaces:**

- Produces:
  - `deleteInvite(db: Db, code: string, now: Date): Promise<boolean>` sets `expiresAt = now` where `code = code AND expires_at > now`, and returns true when it changed one row.
  - `InviteSummary` gains `group: { name: string; icon: string } | null`.
  - `listInvites(db, now, limit = 100)` returns only rows with `expires_at > now AND uses < max_uses`, newest first, left-joined to `group` for its `name` and `icon`. The `status` field is removed, since every listed invite is live; update its consumers.
  - `getMembership(db, userId, groupId, now: Date)` returns `inviteCode: ''` when the group has no live link (`expires_at > now`).

- [ ] **Step 1: Write the failing tests.**
  - `invites.spec.ts`:
    - "deleteInvite retires a live code once": create an invite. `deleteInvite` returns true, and `getInviteStatus` is then `'expired'`. A second `deleteInvite` returns false.
    - "listInvites shows only live codes, labelled with their group": an expired invite, a used-up invite and a deleted invite are absent. A group link carries `group.name` and `group.icon`, and an admin invite has `group: null`.
  - `groups.spec.ts`:
    - "deleting a group link keeps members and clears the link": owner plus member, then `deleteInvite(link)`.
      - `listMembers` still has 2.
      - `getMembership(...).inviteCode` is `''`.
      - `groupForInvite(link)` is `'dead'`.
      - `resetInvite` returns a new code that `getMembership` then reports.
- [ ] **Step 2: Run** `npx vitest run src/lib/server/auth/invites.spec.ts src/lib/server/groups.spec.ts`. Expected: FAIL (`deleteInvite` is not exported).
- [ ] **Step 3: Implement** the three changes above and update every `getMembership` caller to pass `now` (routes use `new Date()`, matching their neighbours).
- [ ] **Step 4: Run** `npx vitest run src/lib/server`. Expected: all pass.
- [ ] **Step 5: Commit** `feat(invites): delete invite codes; live-only lists`.

### Task 2: Admin list and delete; group page without a link

**Files:**

- Modify: `src/routes/(app)/admin/+page.server.ts`, `src/routes/(app)/admin/+page.svelte`, `src/routes/(app)/groups/[id]/+page.server.ts`, `src/routes/(app)/groups/[id]/+page.svelte`
- Test: `e2e/admin.e2e.ts`, `e2e/groups.e2e.ts`

**Interfaces:**

- Consumes: `deleteInvite`, `listInvites`, and `getMembership` from Task 1.
- Produces:
  - **Admin action `deleteInvite`:** form field `code`. It returns `{ deleted: true }`, or `fail(404, { deleteError: 'That invite was already gone.' })`.
  - **Group page:** `data.inviteLink` is `null` when `inviteCode` is `''`.

- [ ] **Step 1: Write the failing e2e tests.**
  - `admin.e2e.ts`, "an admin deletes an invite and it stops working":
    - Create an invite through the UI, then press its Delete and confirm.
    - The "Invite deleted." status shows, and the code is no longer listed.
    - Opening `/join/{code}` in a new context shows "This invite has expired."
  - `admin.e2e.ts`, "deleting an invite twice says it was already gone": post the delete form for the same code twice (the second via `page.request.post` with the form body, or by re-submitting a no-JS form). The page shows "That invite was already gone."
  - `admin.e2e.ts`, "members cannot delete invites": a member's `page.request.post('/admin?/deleteInvite', { form: { code } })` is refused, with the same status the existing member-refusal test expects.
  - `groups.e2e.ts`, "an admin deletes a group link; the owner resets it":
    - An admin deletes the group's link from `/admin`, where the row is labelled with the group name.
    - The owner's group page shows "No invite link.", and there is no "Invite link" textbox.
    - After Reset link, the textbox shows a new link that opens the join page for that group.
  - `admin.e2e.ts`, "the invite list fits a phone": at 360×740, with a 40-character group name listed, `scrollWidth <= 360`.
- [ ] **Step 2: Run** `npx playwright test e2e/admin.e2e.ts e2e/groups.e2e.ts`. Expected: the new tests fail.
- [ ] **Step 3: Implement.**
  - **Admin load:** map `invite.group` into each row.
  - **Admin page:**
    - Each live code shows its code (monospace, `break-all`), "uses / max uses", "Expires {date}", and for group links an `Icon` plus the group name (`break-words`).
    - Each row gets a `ConfirmAction` labelled "Delete", with the confirm text "Delete this invite? Nobody new can use it." Its form posts `?/deleteInvite` with a hidden `code`.
    - Results show in `Notice`: success "Invite deleted.", error `form.deleteError`.
    - Keep the existing "Create invite" form above the list.
  - **Group page:** when `data.inviteLink` is `null`, show `<p class="text-muted">No invite link.</p>` in place of the `CopyField`. Owners still see Reset link.
- [ ] **Step 4: Run** `npx playwright test e2e/admin.e2e.ts e2e/groups.e2e.ts e2e/join.e2e.ts`. Expected: all pass.
- [ ] **Step 5: Commit** `feat(admin): list and delete invite codes`.

### Task 3: Verify and ship

- [ ] **Step 1: Run** `npm run check`, `npx eslint src e2e`, `npx vitest run --coverage` and `npx playwright test`. Expected: all green.
- [ ] **Step 2: Run** the final whole-branch review and one fix pass.
- [ ] **Step 3: Push** `feat/m8-1-invite-management` and open the PR "feat(invites): admins delete invite codes (M8.1)". The owner merges it.
