import { beforeEach, describe, expect, it } from 'vitest';
import { CARD_SIZES, type CardSize } from '#lib/game/card-layout.ts';
import { evaluateSquare } from '#lib/game/evaluate.ts';
import type { Db } from '#lib/server/db/client.ts';
import { checkIn, user } from '#lib/server/db/schema.ts';
import { createTestDb } from '#lib/server/db/test-db.ts';
import { startCard, updateCard, type Card, type CardPlan, type Rewards } from './cards';
import { getCheckIns, logCheckIn, MAX_COUNT } from './check-ins';
import { createHabit, type Habit } from './habits';

let db: Db;

type TestUser = { id: string; timezone: string; weekStartsOn: 'monday' | 'sunday' };

async function makeUser(timezone = 'UTC'): Promise<TestUser> {
	const id = crypto.randomUUID();
	await db.insert(user).values({
		id,
		name: 'Someone',
		email: `${id}@users.invalid`,
		username: `u_${id.slice(0, 8)}`,
		displayUsername: `u_${id.slice(0, 8)}`,
		timezone,
		weekStartsOn: 'monday'
	});
	return { id, timezone, weekStartsOn: 'monday' };
}

async function makeHabits(
	userId: string,
	n: number,
	overrides: Record<string, unknown> = {}
): Promise<Habit[]> {
	const habits: Habit[] = [];
	for (let i = 0; i < n; i++) {
		const result = await createHabit(db, userId, {
			emoji: '🚴',
			name: `Habit ${i}`,
			category: 'fitness',
			direction: 'atLeast',
			period: 'day',
			countMode: 'times',
			target: 1,
			isPrivate: false,
			...overrides
		});
		if (!result.ok) throw new Error(result.message);
		habits.push(result.habit);
	}
	return habits;
}

const rewards: Rewards = { bingo: 'Pizza', sixty: 'Movie night', blackout: 'Weekend away' };

function plan(habits: Habit[], size: CardSize = 3, extra: Partial<CardPlan> = {}): CardPlan {
	const ids = habits.map((h) => h.id);
	const layout: (string | null)[] = [...ids];
	layout.splice(CARD_SIZES[size].centerPosition, 0, null);
	return { size, habitIds: ids, targets: {}, rewards, layout, ...extra };
}

async function cardFor(u: TestUser, habits: Habit[], now: Date): Promise<Card> {
	const result = await startCard(db, u, plan(habits), now);
	if (!result.ok) throw new Error(result.message);
	return result.card;
}

const habitSquare = (card: Card, index = 0) => card.squares.filter((s) => !s.isCenter)[index];
const OCT_1 = new Date('2026-10-01T09:00:00Z');
const OCT_20 = new Date('2026-10-20T09:00:00Z'); // the window is Oct 17–20

beforeEach(async () => {
	db = await createTestDb();
});

describe('logCheckIn', () => {
	it('adds one per tap and removes at zero', async () => {
		const me = await makeUser();
		const card = await cardFor(me, await makeHabits(me.id, 8), OCT_1);
		const { id } = habitSquare(card);
		const log = (delta: 1 | -1) => logCheckIn(db, me, id, '2026-10-20', delta, OCT_20);
		expect(await log(1)).toEqual({ ok: true, count: 1 });
		expect(await log(1)).toEqual({ ok: true, count: 2 });
		expect(await log(-1)).toEqual({ ok: true, count: 1 });
		expect(await log(-1)).toEqual({ ok: true, count: 0 });
		expect(await db.select().from(checkIn)).toHaveLength(0);
		expect(await log(-1)).toEqual({ ok: true, count: 0 });
	});

	it('stops at 20', async () => {
		const me = await makeUser();
		const card = await cardFor(me, await makeHabits(me.id, 8), OCT_1);
		const { id } = habitSquare(card);
		expect(MAX_COUNT).toBe(20);
		for (let i = 0; i < 21; i++) await logCheckIn(db, me, id, '2026-10-20', 1, OCT_20);
		expect(await logCheckIn(db, me, id, '2026-10-20', 1, OCT_20)).toEqual({ ok: true, count: 20 });
	});

	it('counts every simultaneous tap', async () => {
		const me = await makeUser();
		const card = await cardFor(me, await makeHabits(me.id, 8), OCT_1);
		const { id } = habitSquare(card);
		await Promise.all(
			Array.from({ length: 5 }, () => logCheckIn(db, me, id, '2026-10-20', 1, OCT_20))
		);
		expect((await getCheckIns(db, card.id)).get(id)?.get('2026-10-20')).toBe(5);
	});

	it('refuses dates outside the window or the span', async () => {
		const me = await makeUser();
		const card = await cardFor(me, await makeHabits(me.id, 8), new Date('2026-10-19T09:00:00Z'));
		const { id } = habitSquare(card);
		const refused = {
			ok: false,
			field: 'date',
			message: 'You can only log today and the 3 days before.'
		};
		for (const date of ['2026-10-16', '2026-10-18', '2026-10-21', 'not-a-date']) {
			expect(await logCheckIn(db, me, id, date, 1, OCT_20)).toEqual(refused);
		}
		expect(await db.select().from(checkIn)).toHaveLength(0);
	});

	it("another person's square, the center square or last month's card is not found", async () => {
		const me = await makeUser();
		const other = await makeUser();
		const mine = await cardFor(me, await makeHabits(me.id, 8), OCT_1);
		const theirs = await cardFor(other, await makeHabits(other.id, 8), OCT_1);
		const center = mine.squares.find((s) => s.isCenter)!;
		const september = await cardFor(
			me,
			await makeHabits(me.id, 8),
			new Date('2026-09-10T09:00:00Z')
		);
		for (const id of [habitSquare(theirs).id, center.id, habitSquare(september).id, 'nope']) {
			expect(await logCheckIn(db, me, id, '2026-10-20', 1, OCT_20)).toBeNull();
		}
	});

	it("uses the person's own today", async () => {
		const me = await makeUser('Pacific/Kiritimati');
		const card = await cardFor(me, await makeHabits(me.id, 8), OCT_1);
		// 2026-10-31T11:30Z is already November 1 in Kiritimati: no current card to log on.
		const at = new Date('2026-10-31T11:30:00Z');
		expect(await logCheckIn(db, me, habitSquare(card).id, '2026-10-31', 1, at)).toBeNull();
	});
});

describe('check-ins and card edits', () => {
	it("keeps kept squares' check-ins, drops the rest, and re-evaluates a changed target", async () => {
		const me = await makeUser();
		const habits = await makeHabits(me.id, 9, { period: 'month', countMode: 'days', target: 3 });
		const card = await cardFor(me, habits.slice(0, 8), OCT_1);
		const OCT_2 = new Date('2026-10-02T09:00:00Z');
		const kept = card.squares.find((s) => !s.isCenter && s.habitId === habits[0].id)!;
		const dropped = card.squares.find((s) => !s.isCenter && s.habitId === habits[7].id)!;
		for (const date of ['2026-10-01', '2026-10-02']) {
			await logCheckIn(db, me, kept.id, date, 1, OCT_2);
		}
		await logCheckIn(db, me, dropped.id, '2026-10-02', 1, OCT_2);

		const swap = plan([...habits.slice(0, 7), habits[8]], 3, {
			targets: { [habits[0].id]: 2 }
		});
		const updated = await updateCard(
			db,
			me,
			card.id,
			{ habitIds: swap.habitIds, targets: swap.targets, rewards, layout: swap.layout },
			OCT_2
		);
		if (!updated.ok) throw new Error(updated.message);

		const checkIns = await getCheckIns(db, card.id);
		expect(checkIns.get(kept.id)).toEqual(
			new Map([
				['2026-10-01', 1],
				['2026-10-02', 1]
			])
		);
		expect(checkIns.has(dropped.id)).toBe(false);
		const square = updated.card.squares.find((s) => s.id === kept.id);
		if (!square || square.isCenter) throw new Error('kept square missing');
		expect(evaluateSquare(square, updated.card, checkIns.get(kept.id)!, '2026-10-02').state).toBe(
			'complete'
		);
	});
});
