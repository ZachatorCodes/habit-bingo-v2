import { and, eq, inArray } from 'drizzle-orm';
import { backfillMonths } from '#lib/game/backfill.ts';
import { monthName, monthOf } from '#lib/game/calendar.ts';
import { rankRows } from '#lib/game/leaderboard.ts';
import type { CardScore } from '#lib/game/score.ts';
import { cardView, type ViewSquare } from '#lib/server/card-view.ts';
import { getCard } from '#lib/server/cards.ts';
import { localDate } from '#lib/server/clock.ts';
import type { Db } from '#lib/server/db/client.ts';
import { habit } from '#lib/server/db/schema.ts';
import { getMembership, listMembers } from '#lib/server/groups.ts';
import { finalizeMonths, listResults } from '#lib/server/month-results.ts';

export type BoardRow = {
	userId: string;
	displayUsername: string;
	avatarEmoji: string;
	points: number | null;
	lines: number | null;
	rank: number | null;
	isViewer: boolean;
};

type Member = Awaited<ReturnType<typeof listMembers>>[number];

const todayOf = (member: Member, now: Date) => localDate(now, member.timezone ?? 'UTC');

/** A member's live score for one month's card, or null when they have none. */
async function liveScore(db: Db, userId: string, month: string, today: string) {
	const card = await getCard(db, userId, month);
	return card ? (await cardView(db, userId, card, today)).score : null;
}

/**
 * The group's leaderboard as the viewer sees it (spec §3.9). Each member is scored on their own
 * local date. `all` adds saved results to the live months, which include a closing month that is
 * not final yet; `provisionalMonth` names the viewer's closing month when a total counts it.
 */
export async function groupBoard(
	db: Db,
	viewerId: string,
	groupId: string,
	board: 'month' | 'all',
	now: Date
): Promise<{ rows: BoardRow[]; provisionalMonth: string | null } | null> {
	if (!(await getMembership(db, viewerId, groupId))) return null;
	const members = await listMembers(db, groupId);
	const viewer = members.find((m) => m.userId === viewerId);
	if (!viewer) return null;
	const viewerToday = todayOf(viewer, now);
	const closing = backfillMonths(viewerToday).find((m) => m < monthOf(viewerToday)) ?? null;
	let provisional = false;

	const rows = await Promise.all(
		members.map(async (m) => {
			const today = todayOf(m, now);
			let points: number | null = null;
			let lines: number | null = null;
			if (board === 'month') {
				const score = await liveScore(db, m.userId, monthOf(today), today);
				if (score) [points, lines] = [score.points, score.lines.length];
			} else {
				await finalizeMonths(db, m.userId, today);
				[points, lines] = [0, 0];
				for (const r of await listResults(db, m.userId)) {
					points += r.points;
					lines += r.lines;
				}
				// Months still open to logging have no saved result yet: count them live.
				for (const month of backfillMonths(today)) {
					const score = await liveScore(db, m.userId, month, today);
					if (!score) continue;
					points += score.points;
					lines += score.lines.length;
					if (month === closing) provisional = true;
				}
			}
			return {
				userId: m.userId,
				displayUsername: m.displayUsername ?? 'Someone',
				avatarEmoji: m.avatarEmoji,
				points,
				lines,
				isViewer: m.userId === viewerId
			};
		})
	);
	return { rows: rankRows(rows), provisionalMonth: provisional ? closing : null };
}

/** A member's current card for the viewer: private habits show as 🔒, no ids, links or rewards. */
export async function memberCard(
	db: Db,
	viewerId: string,
	groupId: string,
	memberId: string,
	now: Date
): Promise<{
	member: { displayUsername: string; avatarEmoji: string };
	monthName: string;
	card: { size: number; squares: ViewSquare[]; score: CardScore } | null;
} | null> {
	if (!(await getMembership(db, viewerId, groupId))) return null;
	const member = (await listMembers(db, groupId)).find((m) => m.userId === memberId);
	if (!member) return null;
	const today = todayOf(member, now);
	const month = monthOf(today);
	const card = await getCard(db, memberId, month);
	let shown = null;
	if (card) {
		const view = await cardView(db, memberId, card, today);
		// Private at card start, or made private since.
		const habitIds = card.squares.flatMap((s) => (s.habitId ? [s.habitId] : []));
		const nowPrivate = new Set(
			(
				await db
					.select({ id: habit.id })
					.from(habit)
					.where(and(inArray(habit.id, habitIds), eq(habit.isPrivate, true)))
			).map((h) => h.id)
		);
		const privateIds = new Set(
			card.squares
				.filter((s) => !s.isCenter && (s.isPrivate || (s.habitId && nowPrivate.has(s.habitId))))
				.map((s) => s.id)
		);
		const squares = view.squares.map((square) => {
			const { id, link, ...rest } = square;
			void link;
			return id && privateIds.has(id) ? { ...rest, emoji: '🔒', name: '🔒' } : rest;
		});
		shown = { size: card.size, squares, score: view.score };
	}
	return {
		member: {
			displayUsername: member.displayUsername ?? 'Someone',
			avatarEmoji: member.avatarEmoji
		},
		monthName: monthName(month),
		card: shown
	};
}
