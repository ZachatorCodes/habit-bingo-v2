import { and, eq, isNull } from 'drizzle-orm';
import { AVATAR_EMOJI, isValidTimezone, type WeekStart } from '#lib/profile.ts';
import type { Db } from '#lib/server/db/client.ts';
import { user } from '#lib/server/db/schema.ts';
import { USERNAME_RULES_MESSAGE, USERNAME_TAKEN_MESSAGE } from './sign-up.ts';

export type Invalid = { ok: false; field: string; message: string };

/** Display name (trimmed, 1–40 characters) and avatar. */
export function validateProfileInput(input: {
	name: string;
	avatarEmoji: string;
}): { ok: true; name: string } | Invalid {
	const name = input.name.trim();
	if (name.length < 1) return { ok: false, field: 'name', message: 'Enter a display name.' };
	if ([...name].length > 40)
		return { ok: false, field: 'name', message: 'Use at most 40 characters.' };
	if (!(AVATAR_EMOJI as readonly string[]).includes(input.avatarEmoji))
		return { ok: false, field: 'avatarEmoji', message: 'Pick one of the avatars.' };
	return { ok: true, name };
}

/** Timezone and week start. */
export function validateSettingsInput(input: {
	timezone: string;
	weekStartsOn: string;
}): { ok: true; timezone: string; weekStartsOn: WeekStart } | Invalid {
	if (!isValidTimezone(input.timezone))
		return { ok: false, field: 'timezone', message: 'Pick a valid timezone.' };
	if (input.weekStartsOn !== 'monday' && input.weekStartsOn !== 'sunday')
		return { ok: false, field: 'weekStartsOn', message: 'Pick Monday or Sunday.' };
	return { ok: true, timezone: input.timezone, weekStartsOn: input.weekStartsOn };
}

function isUniqueViolation(error: unknown): boolean {
	for (let e = error as { code?: string; cause?: unknown } | undefined; e; e = e.cause as never) {
		if (e.code === '23505') return true;
	}
	return false;
}

/**
 * Finishes first-run setup. `username` is only needed (and only used) when the user has none, as
 * with Google sign-ups.
 */
export async function completeOnboarding(
	db: Db,
	userId: string,
	input: {
		username?: string;
		name: string;
		avatarEmoji: string;
		timezone: string;
		weekStartsOn: WeekStart;
	},
	now: Date
): Promise<{ ok: true } | Invalid> {
	const profile = validateProfileInput(input);
	if (!profile.ok) return profile;
	const settings = validateSettingsInput(input);
	if (!settings.ok) return settings;

	const [current] = await db.select().from(user).where(eq(user.id, userId));
	if (!current) return { ok: false, field: 'form', message: 'We could not find your account.' };

	let username: { username: string; displayUsername: string } | undefined;
	if (!current.username) {
		const typed = (input.username ?? '').trim();
		if (!/^[a-z0-9_]{3,20}$/i.test(typed))
			return { ok: false, field: 'username', message: USERNAME_RULES_MESSAGE };
		username = { username: typed.toLowerCase(), displayUsername: typed };
		const [taken] = await db
			.select({ id: user.id })
			.from(user)
			.where(eq(user.username, username.username));
		if (taken) return { ok: false, field: 'username', message: USERNAME_TAKEN_MESSAGE };
	}

	try {
		await db
			.update(user)
			.set({
				...username,
				name: profile.name,
				avatarEmoji: input.avatarEmoji,
				timezone: settings.timezone,
				weekStartsOn: settings.weekStartsOn,
				onboardedAt: now
			})
			// Only fill a missing username; never overwrite one set meanwhile.
			.where(username ? and(eq(user.id, userId), isNull(user.username)) : eq(user.id, userId));
	} catch (error) {
		if (username && isUniqueViolation(error))
			return { ok: false, field: 'username', message: USERNAME_TAKEN_MESSAGE };
		throw error;
	}
	return { ok: true };
}
