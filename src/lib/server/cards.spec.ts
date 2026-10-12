import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { CARD_SIZES, type CardSize } from '#lib/game/card-layout.ts';
import type { Db } from '#lib/server/db/client.ts';
import { card, cardSquare, user } from '#lib/server/db/schema.ts';
import { createTestDb } from '#lib/server/db/test-db.ts';
import {
	currentMonth,
	getCard,
	isEditable,
	startCard,
	updateCard,
	validateRewards,
	type CardPlan,
	type Rewards
} from './cards';
import { archiveHabit, createHabit, updateHabit, type Habit } from './habits';

let db: Db;

type TestUser = { id: string; timezone: string; weekStartsOn: 'monday' | 'sunday' };

async function makeUser(
	timezone = 'UTC',
	weekStartsOn: 'monday' | 'sunday' = 'monday'
): Promise<TestUser> {
	const id = crypto.randomUUID();
	await db.insert(user).values({
		id,
		name: 'Someone',
		email: `${id}@users.invalid`,
		username: `u_${id.slice(0, 8)}`,
		displayUsername: `u_${id.slice(0, 8)}`,
		timezone,
		weekStartsOn
	});
	return { id, timezone, weekStartsOn };
}

async function makeHabit(userId: string, name: string, overrides: Record<string, unknown> = {}) {
	const result = await createHabit(db, userId, {
		emoji: '🚴',
		name,
		category: 'fitness',
		direction: 'atLeast',
		period: 'week',
		countMode: 'days',
		target: 3,
		isPrivate: false,
		...overrides
	});
	if (!result.ok) throw new Error(result.message);
	return result.habit;
}

async function makeHabits(userId: string, n: number): Promise<Habit[]> {
	const habits: Habit[] = [];
	for (let i = 0; i < n; i++) habits.push(await makeHabit(userId, `Habit ${i}`));
	return habits;
}

const rewards: Rewards = { bingo: 'Pizza', sixty: 'Movie night', blackout: 'Weekend away' };

function plan(habits: Habit[], size: CardSize = 3, extra: Partial<CardPlan> = {}): CardPlan {
	const ids = habits.map((h) => h.id);
	const layout: (string | null)[] = [...ids];
	const free = CARD_SIZES[size].freePosition;
	if (free !== null) layout.splice(free, 0, null);
	return { size, habitIds: ids, targets: {}, rewards, layout, ...extra };
}

function withoutSize(p: CardPlan): Omit<CardPlan, 'size'> {
	return { habitIds: p.habitIds, targets: p.targets, rewards: p.rewards, layout: p.layout };
}

const OCT_19 = new Date('2026-10-19T09:00:00Z');

async function started(u: TestUser, habits: Habit[], now = OCT_19, size: CardSize = 3) {
	const result = await startCard(db, u, plan(habits, size), now);
	if (!result.ok) throw new Error(result.message);
	return result.card;
}

beforeEach(async () => {
	db = await createTestDb();
});

describe('validateRewards', () => {
	it('trims and accepts 1 to 80 characters', () => {
		const result = validateRewards({ bingo: '  Pizza ', sixty: 'a', blackout: 'b'.repeat(80) });
		expect(result).toEqual({
			ok: true,
			value: { bingo: 'Pizza', sixty: 'a', blackout: 'b'.repeat(80) }
		});
	});
});

describe('currentMonth', () => {
	it("is the month in the person's time zone", () => {
		const now = new Date('2026-10-31T11:30:00Z');
		expect(currentMonth({ timezone: 'Pacific/Kiritimati' }, now)).toBe('2026-11');
		expect(currentMonth({ timezone: 'UTC' }, now)).toBe('2026-10');
	});
});

describe('startCard', () => {
	it('starts a 3×3 card: snapshots habits, prorates month targets, keeps overrides', async () => {
		const me = await makeUser();
		const read = await makeHabit(me.id, 'Read', { period: 'month', countMode: 'days', target: 10 });
		const others = await makeHabits(me.id, 8);
		const walk = others[0];
		const result = await startCard(
			db,
			me,
			plan([read, ...others], 3, { targets: { [walk.id]: 5 } }),
			OCT_19
		);
		if (!result.ok) throw new Error(result.message);
		const { card: built } = result;
		expect(built.month).toBe('2026-10');
		expect(built.size).toBe(3);
		expect(built.rewards).toEqual(rewards);
		expect(built.squares).toHaveLength(9);
		expect(built.squares.map((s) => s.position)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
		const readSquare = built.squares.find((s) => !s.isFree && s.habitId === read.id);
		expect(readSquare).toMatchObject({
			emoji: '🚴',
			name: 'Read',
			category: 'fitness',
			direction: 'atLeast',
			period: 'month',
			countMode: 'days',
			target: 4,
			isPrivate: false
		});
		const walkSquare = built.squares.find((s) => !s.isFree && s.habitId === walk.id);
		expect(walkSquare).toMatchObject({ target: 5 });
		expect(await getCard(db, me.id, '2026-10')).toEqual(built);
	});

	it('5×5 has a FREE square at position 12 and 24 habit squares', async () => {
		const me = await makeUser();
		const habits = await makeHabits(me.id, 24);
		const result = await startCard(db, me, plan(habits, 5), OCT_19);
		if (!result.ok) throw new Error(result.message);
		const { squares } = result.card;
		expect(squares).toHaveLength(25);
		expect(squares[12]).toMatchObject({ position: 12, isFree: true });
		expect(squares.filter((s) => !s.isFree)).toHaveLength(24);
	});

	it("uses the person's month, start date and week start", async () => {
		const me = await makeUser('Pacific/Kiritimati', 'sunday');
		const habits = await makeHabits(me.id, 9);
		const result = await startCard(db, me, plan(habits), new Date('2026-10-31T11:30:00Z'));
		if (!result.ok) throw new Error(result.message);
		expect(result.card).toMatchObject({
			month: '2026-11',
			startDate: '2026-11-01',
			weekStartsOn: 'sunday'
		});
	});

	it('editable for 48 hours, cut at the end of the month', async () => {
		const me = await makeUser();
		const habits = await makeHabits(me.id, 9);
		const mid = await started(me, habits, new Date('2026-10-10T12:00:00Z'));
		expect(mid.editableUntil.toISOString()).toBe('2026-10-12T12:00:00.000Z');

		const late = await makeUser('UTC');
		const lateHabits = await makeHabits(late.id, 9);
		const end = await started(late, lateHabits, new Date('2026-10-31T20:00:00Z'));
		expect(end.editableUntil.toISOString()).toBe('2026-11-01T00:00:00.000Z');
	});

	it('refuses a second card for the month', async () => {
		const me = await makeUser();
		const habits = await makeHabits(me.id, 9);
		await started(me, habits);
		const again = await startCard(db, me, plan(habits), OCT_19);
		expect(again).toMatchObject({
			ok: false,
			field: 'exists',
			message: 'You already have a card for October.'
		});
		expect(await db.select().from(card)).toHaveLength(1);
	});

	it('lets only one of two simultaneous starts win', async () => {
		const me = await makeUser();
		const habits = await makeHabits(me.id, 9);
		const results = await Promise.all([
			startCard(db, me, plan(habits), OCT_19),
			startCard(db, me, plan(habits), OCT_19)
		]);
		expect(results.filter((r) => r.ok)).toHaveLength(1);
		expect(results.filter((r) => !r.ok)).toMatchObject([{ field: 'exists' }]);
		expect(await db.select().from(card)).toHaveLength(1);
		expect(await db.select().from(cardSquare)).toHaveLength(9);
	});

	it('refuses habits that are not mine, archived, duplicated or the wrong count', async () => {
		const me = await makeUser();
		const other = await makeUser();
		const habits = await makeHabits(me.id, 10);
		const theirs = await makeHabit(other.id, 'Theirs');
		const nine = habits.slice(0, 9);
		const expectHabits = async (p: CardPlan) =>
			expect(await startCard(db, me, p, OCT_19)).toMatchObject({
				ok: false,
				field: 'habits',
				message: 'Pick from your habits.'
			});

		await expectHabits(plan([...nine.slice(0, 8), theirs]));
		await expectHabits(plan(habits.slice(0, 8)));
		await expectHabits(plan(habits.slice(0, 10)));
		await expectHabits(plan([...nine.slice(0, 8), nine[0]]));
		await archiveHabit(db, me.id, nine[8].id, OCT_19);
		await expectHabits(plan(nine));
		expect(await db.select().from(card)).toHaveLength(0);
	});

	it('refuses an out-of-range override and a bad layout', async () => {
		const me = await makeUser();
		const habits = await makeHabits(me.id, 9);
		expect(
			await startCard(db, me, plan(habits, 3, { targets: { [habits[2].id]: 8 } }), OCT_19)
		).toEqual({
			ok: false,
			field: 'targets',
			message: 'Pick a number from 1 to 7 for Habit 2.'
		});
		const broken = plan(habits);
		broken.layout[0] = broken.layout[1];
		expect(await startCard(db, me, broken, OCT_19)).toEqual({
			ok: false,
			field: 'layout',
			message: 'Shuffle the board again.'
		});
	});

	it('refuses empty or 81-character rewards', async () => {
		const me = await makeUser();
		const habits = await makeHabits(me.id, 9);
		expect(
			await startCard(db, me, plan(habits, 3, { rewards: { ...rewards, sixty: '   ' } }), OCT_19)
		).toEqual({ ok: false, field: 'sixty', message: 'Write a reward (up to 80 characters).' });
		expect(
			await startCard(
				db,
				me,
				plan(habits, 3, { rewards: { ...rewards, blackout: 'x'.repeat(81) } }),
				OCT_19
			)
		).toMatchObject({ ok: false, field: 'blackout' });
	});

	it('later library edits never change the card', async () => {
		const me = await makeUser();
		const habits = await makeHabits(me.id, 9);
		const before = await started(me, habits);
		await updateHabit(db, me.id, habits[0].id, {
			emoji: '🍎',
			name: 'Renamed',
			category: 'health',
			direction: 'atMost',
			period: 'day',
			target: 2,
			isPrivate: true
		});
		await archiveHabit(db, me.id, habits[1].id, OCT_19);
		expect(await getCard(db, me.id, '2026-10')).toEqual(before);
	});
});

describe('isEditable', () => {
	it('is true strictly before editableUntil', () => {
		const editableUntil = new Date('2026-10-21T09:00:00Z');
		expect(isEditable({ editableUntil }, new Date('2026-10-21T08:59:59Z'))).toBe(true);
		expect(isEditable({ editableUntil }, editableUntil)).toBe(false);
	});
});

describe('updateCard', () => {
	it('updates within the window, keeping square ids for habits that stay', async () => {
		const me = await makeUser();
		const habits = await makeHabits(me.id, 9);
		const extra = await makeHabit(me.id, 'Extra', { emoji: '📚', category: 'mind' });
		const before = await started(me, habits);
		const swapped = [...habits.slice(0, 8), extra];
		const layout = plan(swapped).layout.slice().reverse();
		const result = await updateCard(
			db,
			me,
			{
				habitIds: swapped.map((h) => h.id),
				targets: { [habits[0].id]: 6 },
				rewards: { ...rewards, bingo: 'Sushi' },
				layout
			},
			new Date('2026-10-19T10:00:00Z')
		);
		if (!result.ok) throw new Error(result.message);
		const after = result.card;
		expect(after.id).toBe(before.id);
		expect(after.rewards.bingo).toBe('Sushi');
		expect(after.editableUntil).toEqual(before.editableUntil);
		expect(after.squares.map((s) => (s.isFree ? null : s.habitId))).toEqual(layout);
		const keptBefore = before.squares.find((s) => !s.isFree && s.habitId === habits[0].id)!;
		const keptAfter = after.squares.find((s) => !s.isFree && s.habitId === habits[0].id)!;
		expect(keptAfter.id).toBe(keptBefore.id);
		expect(keptAfter).toMatchObject({ target: 6, name: 'Habit 0' });
		const droppedId = before.squares.find((s) => !s.isFree && s.habitId === habits[8].id)!.id;
		expect(after.squares.some((s) => s.id === droppedId)).toBe(false);
		expect(after.squares.find((s) => !s.isFree && s.habitId === extra.id)).toMatchObject({
			name: 'Extra',
			emoji: '📚'
		});
		expect(await db.select().from(cardSquare)).toHaveLength(9);
	});

	it('refuses updates after the window', async () => {
		const me = await makeUser();
		const habits = await makeHabits(me.id, 9);
		const before = await started(me, habits);
		expect(await updateCard(db, me, withoutSize(plan(habits)), before.editableUntil)).toEqual({
			ok: false,
			field: 'locked',
			message: 'This card is locked.'
		});
	});

	it('says so when there is no card yet', async () => {
		const me = await makeUser();
		const habits = await makeHabits(me.id, 9);
		expect(await updateCard(db, me, withoutSize(plan(habits)), OCT_19)).toEqual({
			ok: false,
			field: 'exists',
			message: "There's no card for October yet."
		});
	});

	it('validates like startCard', async () => {
		const me = await makeUser();
		const habits = await makeHabits(me.id, 9);
		await started(me, habits);
		const short = withoutSize(plan(habits.slice(0, 8)));
		expect(await updateCard(db, me, short, OCT_19)).toMatchObject({ ok: false, field: 'habits' });
	});
});

describe('ownership', () => {
	it("never returns another user's card; deleting a user deletes their cards", async () => {
		const me = await makeUser();
		const other = await makeUser();
		const habits = await makeHabits(me.id, 9);
		await started(me, habits);
		expect(await getCard(db, other.id, '2026-10')).toBeNull();
		expect(await getCard(db, me.id, '2026-09')).toBeNull();
		await db.delete(user).where(eq(user.id, me.id));
		expect(await db.select().from(card)).toHaveLength(0);
		expect(await db.select().from(cardSquare)).toHaveLength(0);
	});
});
