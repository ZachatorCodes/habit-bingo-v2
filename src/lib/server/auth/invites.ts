import { randomBytes } from 'node:crypto';
import { and, desc, eq, gt, lt, sql } from 'drizzle-orm';
import type { Db } from '#lib/server/db/client.ts';
import { invite, user } from '#lib/server/db/schema.ts';

export type InviteStatus = 'valid' | 'expired' | 'usedUp' | 'notFound';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Creates an invite with an unguessable code (10 random bytes, base64url). */
export async function createInvite(
	db: Db,
	input: { createdBy: string; expiresInDays: number; maxUses: number; groupId?: string },
	now: Date
): Promise<{ code: string }> {
	const code = randomBytes(10).toString('base64url');
	await db.insert(invite).values({
		code,
		createdBy: input.createdBy,
		groupId: input.groupId,
		maxUses: input.maxUses,
		expiresAt: new Date(now.getTime() + input.expiresInDays * DAY_MS)
	});
	return { code };
}

function statusOf(row: { expiresAt: Date; uses: number; maxUses: number }, now: Date) {
	if (row.expiresAt <= now) return 'expired';
	if (row.uses >= row.maxUses) return 'usedUp';
	return 'valid';
}

export async function getInviteStatus(db: Db, code: string, now: Date): Promise<InviteStatus> {
	const [row] = await db
		.select({ expiresAt: invite.expiresAt, uses: invite.uses, maxUses: invite.maxUses })
		.from(invite)
		.where(eq(invite.code, code));
	return row ? statusOf(row, now) : 'notFound';
}

/**
 * Like getInviteStatus, but the `BOOTSTRAP_INVITE_CODE` also counts as valid while there are no
 * users at all (the account-creation hook then makes that first user the admin). Once any user
 * exists the code falls through to the normal lookup and is not found.
 */
export async function getJoinStatus(
	db: Db,
	code: string,
	now: Date,
	bootstrapCode: string | undefined
): Promise<InviteStatus> {
	if (bootstrapCode && code === bootstrapCode) {
		const [anyUser] = await db.select({ id: user.id }).from(user).limit(1);
		if (!anyUser) return 'valid';
	}
	return getInviteStatus(db, code, now);
}

export type InviteSummary = {
	code: string;
	status: Exclude<InviteStatus, 'notFound'>;
	uses: number;
	maxUses: number;
	expiresAt: Date;
};

/** The most recent invites, newest first, for the admin page. */
export async function listInvites(db: Db, now: Date, limit = 100): Promise<InviteSummary[]> {
	const rows = await db
		.select({
			code: invite.code,
			uses: invite.uses,
			maxUses: invite.maxUses,
			expiresAt: invite.expiresAt
		})
		.from(invite)
		.orderBy(desc(invite.createdAt), invite.code)
		.limit(limit);
	return rows.map((row) => ({ ...row, status: statusOf(row, now) }));
}

/**
 * Uses one of an invite's uses, if it has one left and has not expired. A single conditional
 * UPDATE, so concurrent sign-ups can never use more than `maxUses`.
 */
export async function consumeInvite(db: Db, code: string, now: Date): Promise<boolean> {
	const rows = await db
		.update(invite)
		.set({ uses: sql`${invite.uses} + 1` })
		.where(and(eq(invite.code, code), lt(invite.uses, invite.maxUses), gt(invite.expiresAt, now)))
		.returning({ code: invite.code });
	return rows.length === 1;
}
