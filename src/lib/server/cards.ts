// Monthly cards: a snapshot of nine or twenty-four habits, laid out on a board. Every query is
// scoped to the signed-in user.
import { and, asc, eq, inArray } from 'drizzle-orm';
import { monthName, monthOf, nextMonth } from '#lib/game/calendar.ts';
import { CARD_SIZES, isValidLayout, type CardSize } from '#lib/game/card-layout.ts';
import type { CategoryId } from '#lib/game/categories.ts';
import { normalizeRule, targetRange, type HabitRule } from '#lib/game/habit-rules.ts';
import { prorateTarget } from '#lib/game/proration.ts';
import { isUniqueViolation } from '#lib/server/auth/sign-up.ts';
import { localDate, startOfLocalDay } from '#lib/server/clock.ts';
import type { Db } from '#lib/server/db/client.ts';
import { card, cardSquare } from '#lib/server/db/schema.ts';
import { listHabits, type Habit } from '#lib/server/habits.ts';

const EDIT_WINDOW_MS = 48 * 3_600_000;

export type Rewards = { bingo: string; sixty: string; blackout: string };
type WeekStart = 'monday' | 'sunday';

export type CardSquare =
	| { id: string; position: number; isFree: true }
	| ({
			id: string;
			position: number;
			isFree: false;
			habitId: string | null;
			emoji: string;
			name: string;
			category: CategoryId;
			isPrivate: boolean;
	  } & HabitRule);

export type Card = {
	id: string;
	month: string;
	size: CardSize;
	startDate: string;
	editableUntil: Date;
	weekStartsOn: WeekStart;
	rewards: Rewards;
	squares: CardSquare[];
};

export type CardPlan = {
	size: CardSize;
	habitIds: string[];
	/** Overrides only; a missing habit gets its prorated target. */
	targets: Record<string, number>;
	rewards: Rewards;
	/** Habit ids by board position, null at the FREE square. */
	layout: (string | null)[];
};

export type CardError = {
	ok: false;
	field: 'exists' | 'locked' | 'habits' | 'targets' | 'layout' | keyof Rewards;
	message: string;
};

const REWARD_MESSAGE = 'Write a reward (up to 80 characters).';

export function validateRewards(input: Rewards): { ok: true; value: Rewards } | CardError {
	const value = { bingo: '', sixty: '', blackout: '' };
	for (const field of ['bingo', 'sixty', 'blackout'] as const) {
		const text = input[field].trim();
		if (text.length < 1 || text.length > 80) return { ok: false, field, message: REWARD_MESSAGE };
		value[field] = text;
	}
	return { ok: true, value };
}

export function currentMonth(user: { timezone: string }, now: Date): string {
	return monthOf(localDate(now, user.timezone));
}

export function isEditable(card: Pick<Card, 'editableUntil'>, now: Date): boolean {
	return now.getTime() < card.editableUntil.getTime();
}

function toCard(row: typeof card.$inferSelect, squares: (typeof cardSquare.$inferSelect)[]): Card {
	return {
		id: row.id,
		month: row.month,
		size: row.size as CardSize,
		startDate: row.startDate,
		editableUntil: row.editableUntil,
		weekStartsOn: row.weekStartsOn as WeekStart,
		rewards: { bingo: row.rewardBingo, sixty: row.rewardSixty, blackout: row.rewardBlackout },
		squares: squares
			.slice()
			.sort((a, b) => a.position - b.position)
			.map((s): CardSquare => {
				if (s.isFree) return { id: s.id, position: s.position, isFree: true };
				return {
					id: s.id,
					position: s.position,
					isFree: false,
					habitId: s.habitId,
					emoji: s.emoji!,
					name: s.name!,
					category: s.category as CategoryId,
					direction: s.direction as HabitRule['direction'],
					period: s.period as HabitRule['period'],
					countMode: s.countMode as HabitRule['countMode'],
					target: s.target!,
					isPrivate: s.isPrivate!
				};
			})
	};
}

export async function getCard(db: Db, userId: string, month: string): Promise<Card | null> {
	const [row] = await db
		.select()
		.from(card)
		.where(and(eq(card.userId, userId), eq(card.month, month)));
	if (!row) return null;
	const squares = await db
		.select()
		.from(cardSquare)
		.where(eq(cardSquare.cardId, row.id))
		.orderBy(asc(cardSquare.position));
	return toCard(row, squares);
}

type Resolved = {
	rewards: Rewards;
	/** Habit and final target by board position; null at the FREE square. */
	board: ({ habit: Habit; target: number } | null)[];
};

/** Checks a plan against the person's active habits and works out each square's target. */
async function resolvePlan(
	db: Db,
	userId: string,
	size: CardSize,
	plan: Omit<CardPlan, 'size'>,
	startDate: string
): Promise<{ ok: true; value: Resolved } | CardError> {
	const active = new Map((await listHabits(db, userId)).map((h) => [h.id, h]));
	const ids = plan.habitIds;
	if (
		ids.length !== CARD_SIZES[size].habits ||
		new Set(ids).size !== ids.length ||
		ids.some((id) => !active.has(id))
	) {
		return { ok: false, field: 'habits', message: 'Pick from your habits.' };
	}

	const targets = new Map<string, number>();
	for (const id of ids) {
		const habit = active.get(id)!;
		const override = Object.hasOwn(plan.targets, id) ? plan.targets[id] : undefined;
		if (override === undefined) {
			targets.set(id, prorateTarget(habit, startDate));
			continue;
		}
		const rule = normalizeRule({ ...habit, target: override });
		if (!rule.ok) {
			const { min, max } = targetRange(habit.direction, habit.period, habit.countMode);
			return {
				ok: false,
				field: 'targets',
				message: `Pick a number from ${min} to ${max} for ${habit.name}.`
			};
		}
		targets.set(id, rule.rule.target);
	}

	if (!isValidLayout(plan.layout, ids, size)) {
		return { ok: false, field: 'layout', message: 'Shuffle the board again.' };
	}
	const rewards = validateRewards(plan.rewards);
	if (!rewards.ok) return rewards;

	return {
		ok: true,
		value: {
			rewards: rewards.value,
			board: plan.layout.map((id) =>
				id === null ? null : { habit: active.get(id)!, target: targets.get(id)! }
			)
		}
	};
}

function snapshot(habit: Habit, target: number) {
	return {
		habitId: habit.id,
		emoji: habit.emoji,
		name: habit.name,
		category: habit.category,
		direction: habit.direction,
		period: habit.period,
		countMode: habit.countMode,
		target,
		isPrivate: habit.isPrivate
	};
}

export async function startCard(
	db: Db,
	user: { id: string; timezone: string; weekStartsOn: WeekStart },
	plan: CardPlan,
	now: Date
): Promise<{ ok: true; card: Card } | CardError> {
	const startDate = localDate(now, user.timezone);
	const month = monthOf(startDate);
	const resolved = await resolvePlan(db, user.id, plan.size, plan, startDate);
	if (!resolved.ok) return resolved;

	const monthEnd = startOfLocalDay(`${nextMonth(month)}-01`, user.timezone);
	const editableUntil = new Date(Math.min(now.getTime() + EDIT_WINDOW_MS, monthEnd.getTime()));
	const cardId = crypto.randomUUID();
	try {
		await db.transaction(async (tx) => {
			await tx.insert(card).values({
				id: cardId,
				userId: user.id,
				month,
				size: plan.size,
				startDate,
				editableUntil,
				weekStartsOn: user.weekStartsOn,
				rewardBingo: resolved.value.rewards.bingo,
				rewardSixty: resolved.value.rewards.sixty,
				rewardBlackout: resolved.value.rewards.blackout
			});
			await tx.insert(cardSquare).values(
				resolved.value.board.map((entry, position) => ({
					id: crypto.randomUUID(),
					cardId,
					position,
					isFree: entry === null,
					...(entry ? snapshot(entry.habit, entry.target) : {})
				}))
			);
		});
	} catch (error) {
		if (isUniqueViolation(error)) {
			return {
				ok: false,
				field: 'exists',
				message: `You already have a card for ${monthName(month)}.`
			};
		}
		throw error;
	}
	return { ok: true, card: (await getCard(db, user.id, month))! };
}

export async function updateCard(
	db: Db,
	user: { id: string; timezone: string },
	plan: Omit<CardPlan, 'size'>,
	now: Date
): Promise<{ ok: true; card: Card } | CardError> {
	const month = currentMonth(user, now);
	const existing = await getCard(db, user.id, month);
	if (!existing) {
		return { ok: false, field: 'exists', message: `There's no card for ${monthName(month)} yet.` };
	}
	if (!isEditable(existing, now)) {
		return { ok: false, field: 'locked', message: 'This card is locked.' };
	}
	const resolved = await resolvePlan(db, user.id, existing.size, plan, existing.startDate);
	if (!resolved.ok) return resolved;

	const keptIds = new Map<string, string>();
	for (const square of existing.squares) {
		if (!square.isFree && square.habitId) keptIds.set(square.habitId, square.id);
	}
	const planned = new Set(plan.habitIds);
	const dropped = existing.squares.filter(
		(s) => !s.isFree && (s.habitId === null || !planned.has(s.habitId))
	);

	await db.transaction(async (tx) => {
		await tx
			.update(card)
			.set({
				rewardBingo: resolved.value.rewards.bingo,
				rewardSixty: resolved.value.rewards.sixty,
				rewardBlackout: resolved.value.rewards.blackout,
				updatedAt: new Date()
			})
			.where(eq(card.id, existing.id));
		if (dropped.length > 0) {
			await tx.delete(cardSquare).where(
				inArray(
					cardSquare.id,
					dropped.map((s) => s.id)
				)
			);
		}
		// Park the surviving squares off the board so moving them can't hit the unique position.
		for (const square of existing.squares) {
			if (dropped.includes(square) || square.isFree) continue;
			await tx
				.update(cardSquare)
				.set({ position: -1 - square.position })
				.where(eq(cardSquare.id, square.id));
		}
		for (const [position, entry] of resolved.value.board.entries()) {
			if (entry === null) continue;
			const keptId = keptIds.get(entry.habit.id);
			if (keptId) {
				await tx
					.update(cardSquare)
					.set({ position, target: entry.target })
					.where(eq(cardSquare.id, keptId));
			} else {
				await tx.insert(cardSquare).values({
					id: crypto.randomUUID(),
					cardId: existing.id,
					position,
					isFree: false,
					...snapshot(entry.habit, entry.target)
				});
			}
		}
	});
	return { ok: true, card: (await getCard(db, user.id, month))! };
}
