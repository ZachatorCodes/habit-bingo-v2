// Card-builder progress, saved after every step so closing the tab loses nothing. One draft per
// person; a draft from another month is forgotten, since the month decides which card it builds.
import { eq } from 'drizzle-orm';
import * as z from 'zod';
import type { CardSize } from '#lib/game/card-layout.ts';
import type { Rewards } from '#lib/server/cards.ts';
import type { Db } from '#lib/server/db/client.ts';
import { cardDraft } from '#lib/server/db/schema.ts';

export const STEPS = ['size', 'habits', 'targets', 'rewards', 'board'] as const;
export type Step = (typeof STEPS)[number];

export type CardDraft = {
	month: string;
	/** Set when changing this month's existing card instead of building a new one. */
	cardId: string | null;
	size: CardSize | null;
	habitIds: string[];
	/** Target overrides by habit id; a missing habit gets its prorated target. */
	targets: Record<string, number>;
	rewards: Rewards;
	/** Habit ids by board position, null at the FREE square. */
	layout: (string | null)[] | null;
	completed: Step[];
};

const draftSchema = z.object({
	month: z.string(),
	cardId: z.string().nullable(),
	size: z.union([z.literal(3), z.literal(5)]).nullable(),
	habitIds: z.array(z.string()),
	targets: z.record(z.string(), z.number()),
	rewards: z.object({ bingo: z.string(), sixty: z.string(), blackout: z.string() }),
	layout: z.array(z.string().nullable()).nullable(),
	completed: z.array(z.enum(STEPS))
});

export function emptyDraft(month: string): CardDraft {
	return {
		month,
		cardId: null,
		size: null,
		habitIds: [],
		targets: {},
		rewards: { bingo: '', sixty: '', blackout: '' },
		layout: null,
		completed: []
	};
}

export async function getDraft(db: Db, userId: string, month: string): Promise<CardDraft> {
	const [row] = await db.select().from(cardDraft).where(eq(cardDraft.userId, userId));
	if (!row) return emptyDraft(month);
	if (row.month === month) {
		const parsed = draftSchema.safeParse(row.data);
		if (parsed.success && parsed.data.month === month) return parsed.data;
	}
	await discardDraft(db, userId);
	return emptyDraft(month);
}

export async function saveDraft(db: Db, userId: string, draft: CardDraft): Promise<void> {
	const values = { month: draft.month, data: draft, updatedAt: new Date() };
	await db
		.insert(cardDraft)
		.values({ userId, ...values })
		.onConflictDoUpdate({ target: cardDraft.userId, set: values });
}

export async function discardDraft(db: Db, userId: string): Promise<void> {
	await db.delete(cardDraft).where(eq(cardDraft.userId, userId));
}

/** The builder's steps in order; changing an existing card keeps its size, so there is no size step. */
export function stepsFor(draft: CardDraft): Step[] {
	return draft.cardId ? STEPS.filter((step) => step !== 'size') : [...STEPS];
}

/** The first step not yet completed, or the last one when everything is. */
export function firstOpenStep(draft: CardDraft): Step {
	return stepsFor(draft).find((step) => !draft.completed.includes(step)) ?? 'board';
}

/** A step opens once every step before it is completed. */
export function canOpen(draft: CardDraft, step: Step): boolean {
	const steps = stepsFor(draft);
	const index = steps.indexOf(step);
	return index !== -1 && steps.slice(0, index).every((s) => draft.completed.includes(s));
}

/** Sets the habits; overrides of removed habits go, and the layout goes when the set changed. */
export function withHabits(draft: CardDraft, habitIds: string[]): CardDraft {
	const kept = new Set(habitIds);
	const before = new Set(draft.habitIds);
	const changed = kept.size !== before.size || habitIds.some((id) => !before.has(id));
	return {
		...draft,
		habitIds,
		targets: Object.fromEntries(Object.entries(draft.targets).filter(([id]) => kept.has(id))),
		layout: changed ? null : draft.layout
	};
}
