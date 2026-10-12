import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import type { Db } from '#lib/server/db/client.ts';
import { account, passwordReset, session, signInFailure, user } from '#lib/server/db/schema.ts';
import type { Auth } from './create-auth.ts';
import { checkPassword, PASSWORD_MESSAGES } from './password-policy.ts';

export type ResetStatus = 'valid' | 'expired' | 'used' | 'notFound';

/** How long a reset link works. */
export const RESET_LINK_TTL_MS = 24 * 60 * 60 * 1000;

export const UNKNOWN_USERNAME_MESSAGE = 'No user with that username.';

/** What the reset page says for each link that cannot be used. */
export const RESET_LINK_PROBLEMS: Record<Exclude<ResetStatus, 'valid'>, string> = {
	expired: 'This reset link has expired.',
	used: 'This reset link has already been used.',
	notFound: "We couldn't find that reset link."
};

/** Why a reset failed: the link itself (`status`), or the new password. */
export type ResetFailure =
	| { ok: false; field: 'link'; status: Exclude<ResetStatus, 'valid'>; message: string }
	| { ok: false; field: 'newPassword'; message: string };

function linkProblem(status: Exclude<ResetStatus, 'valid'>): ResetFailure {
	return { ok: false, field: 'link', status, message: RESET_LINK_PROBLEMS[status] };
}

/** 32 random bytes, base64url: always 43 characters from this alphabet. */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** The token is a bearer secret: only its SHA-256 is ever stored or compared. */
function hashToken(token: string): string {
	return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * Issues a single-use, 24-hour reset link for a user, who need not have a password yet (the link
 * sets one). Returns the raw token for the link; it is not stored anywhere.
 */
export async function createResetLink(
	db: Db,
	input: { username: string; createdBy: string },
	now: Date
): Promise<{ ok: true; token: string } | { ok: false; message: string }> {
	const username = input.username.trim().replace(/^@/, '').toLowerCase();
	if (!username) return { ok: false, message: UNKNOWN_USERNAME_MESSAGE };
	const [target] = await db.select({ id: user.id }).from(user).where(eq(user.username, username));
	if (!target) return { ok: false, message: UNKNOWN_USERNAME_MESSAGE };

	const token = randomBytes(32).toString('base64url');
	await db.insert(passwordReset).values({
		tokenHash: hashToken(token),
		userId: target.id,
		createdBy: input.createdBy,
		expiresAt: new Date(now.getTime() + RESET_LINK_TTL_MS)
	});
	return { ok: true, token };
}

export async function getResetStatus(db: Db, token: string, now: Date): Promise<ResetStatus> {
	if (!TOKEN_PATTERN.test(token)) return 'notFound';
	const [row] = await db
		.select({ expiresAt: passwordReset.expiresAt, usedAt: passwordReset.usedAt })
		.from(passwordReset)
		.where(eq(passwordReset.tokenHash, hashToken(token)));
	if (!row) return 'notFound';
	if (row.usedAt) return 'used';
	if (row.expiresAt <= now) return 'expired';
	return 'valid';
}

/**
 * The username a reset link is for, only while the link is usable: the page puts it in a hidden
 * `autocomplete="username"` field so password managers save the new password to the right account.
 */
export async function getResetUsername(db: Db, token: string, now: Date): Promise<string | null> {
	if (!TOKEN_PATTERN.test(token)) return null;
	const [row] = await db
		.select({ username: user.username })
		.from(passwordReset)
		.innerJoin(user, eq(user.id, passwordReset.userId))
		.where(
			and(
				eq(passwordReset.tokenHash, hashToken(token)),
				isNull(passwordReset.usedAt),
				gt(passwordReset.expiresAt, now)
			)
		);
	return row?.username ?? null;
}

/**
 * Sets a new password through a reset link. Runs our password policy itself (Better Auth's
 * reset route is disabled and its hooks never see a direct hash). Then, in one transaction: claims
 * the link (a conditional UPDATE, so it works exactly once even under concurrent use), sets or
 * creates the user's password, retires their other links, signs them out everywhere and clears
 * any sign-in lockout.
 */
export async function useResetLink(
	auth: Auth,
	db: Db,
	token: string,
	newPassword: string,
	now: Date,
	isPwned: (password: string) => Promise<boolean>
): Promise<{ ok: true } | ResetFailure> {
	if (!TOKEN_PATTERN.test(token)) return linkProblem('notFound');
	const tokenHash = hashToken(token);
	const [link] = await db
		.select({
			userId: passwordReset.userId,
			username: user.username,
			expiresAt: passwordReset.expiresAt,
			usedAt: passwordReset.usedAt
		})
		.from(passwordReset)
		.innerJoin(user, eq(user.id, passwordReset.userId))
		.where(eq(passwordReset.tokenHash, tokenHash));
	if (!link) return linkProblem('notFound');
	if (link.usedAt) return linkProblem('used');
	if (link.expiresAt <= now) return linkProblem('expired');

	const problem = await checkPassword(newPassword, link.username, isPwned);
	if (problem) return { ok: false, field: 'newPassword', message: PASSWORD_MESSAGES[problem] };

	const context = await auth.$context;
	const hash = await context.password.hash(newPassword);

	return db.transaction(async (tx) => {
		const claimed = await tx
			.update(passwordReset)
			.set({ usedAt: now })
			.where(
				and(
					eq(passwordReset.tokenHash, tokenHash),
					isNull(passwordReset.usedAt),
					gt(passwordReset.expiresAt, now)
				)
			)
			.returning({ userId: passwordReset.userId });
		// Someone else used it between our check and now.
		if (claimed.length !== 1) return linkProblem('used');
		const userId = claimed[0].userId;

		const updated = await tx
			.update(account)
			.set({ password: hash, updatedAt: now })
			.where(and(eq(account.userId, userId), eq(account.providerId, 'credential')))
			.returning({ id: account.id });
		if (updated.length === 0) {
			// As Better Auth itself creates credential accounts: the account id is the user id.
			const id = context.generateId({ model: 'account' }) || crypto.randomUUID();
			await tx.insert(account).values({
				id,
				userId,
				accountId: userId,
				providerId: 'credential',
				password: hash,
				createdAt: now,
				updatedAt: now
			});
		}

		await retireResetLinks(tx, userId, now);
		await tx.delete(session).where(eq(session.userId, userId));
		if (link.username) {
			await tx.delete(signInFailure).where(eq(signInFailure.username, link.username));
		}
		return { ok: true } as const;
	});
}

/**
 * Marks every unused reset link for a user as used, so links issued before a password was set
 * (through a link or on /me) stop working.
 */
export async function retireResetLinks(db: Pick<Db, 'update'>, userId: string, now: Date) {
	await db
		.update(passwordReset)
		.set({ usedAt: now })
		.where(and(eq(passwordReset.userId, userId), isNull(passwordReset.usedAt)));
}
