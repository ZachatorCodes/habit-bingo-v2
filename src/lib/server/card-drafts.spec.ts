import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '#lib/server/db/client.ts';
import { cardDraft, user } from '#lib/server/db/schema.ts';
import { createTestDb } from '#lib/server/db/test-db.ts';
import {
	STEPS,
	type Step,
	canOpen,
	discardDraft,
	emptyDraft,
	firstOpenStep,
	getDraft,
	saveDraft,
	stepsFor,
	withHabits
} from './card-drafts';

let db: Db;
let userId: string;

beforeEach(async () => {
	db = await createTestDb();
	userId = crypto.randomUUID();
	await db.insert(user).values({
		id: userId,
		name: 'Someone',
		email: `${userId}@users.invalid`,
		username: `u_${userId.slice(0, 8)}`,
		displayUsername: `u_${userId.slice(0, 8)}`
	});
});

describe('card drafts', () => {
	it('starts empty and saves progress', async () => {
		expect(await getDraft(db, userId, '2026-10')).toEqual(emptyDraft('2026-10'));
		const draft = { ...emptyDraft('2026-10'), size: 3 as const, completed: ['size' as const] };
		await saveDraft(db, userId, draft);
		expect(await getDraft(db, userId, '2026-10')).toEqual(draft);
		const next = { ...draft, habitIds: ['a', 'b'] };
		await saveDraft(db, userId, next);
		expect(await getDraft(db, userId, '2026-10')).toEqual(next);
		await discardDraft(db, userId);
		expect(await getDraft(db, userId, '2026-10')).toEqual(emptyDraft('2026-10'));
	});

	it('forgets a draft from another month', async () => {
		await saveDraft(db, userId, { ...emptyDraft('2026-09'), size: 5 });
		expect(await getDraft(db, userId, '2026-10')).toEqual(emptyDraft('2026-10'));
		expect(await db.select().from(cardDraft).where(eq(cardDraft.userId, userId))).toHaveLength(0);
	});

	it('forgets a draft that no longer parses', async () => {
		await db.insert(cardDraft).values({ userId, month: '2026-10', data: { size: 7, nonsense: 1 } });
		expect(await getDraft(db, userId, '2026-10')).toEqual(emptyDraft('2026-10'));
		expect(await db.select().from(cardDraft).where(eq(cardDraft.userId, userId))).toHaveLength(0);
	});

	it('orders steps and finds the first open one', () => {
		expect(STEPS).toEqual(['size', 'habits', 'targets', 'rewards', 'board']);
		const draft = emptyDraft('2026-10');
		expect(stepsFor(draft)).toEqual([...STEPS]);
		expect(firstOpenStep(draft)).toBe('size');
		expect(canOpen(draft, 'size')).toBe(true);
		expect(canOpen(draft, 'habits')).toBe(false);

		const done = {
			...draft,
			completed: ['size', 'habits'] as Step[]
		};
		expect(firstOpenStep(done)).toBe('targets');
		expect(canOpen(done, 'targets')).toBe(true);
		expect(canOpen(done, 'rewards')).toBe(false);
		expect(firstOpenStep({ ...done, completed: [...STEPS] })).toBe('board');

		const editing = { ...draft, cardId: 'card-1' };
		expect(stepsFor(editing)).toEqual(['habits', 'targets', 'rewards', 'board']);
		expect(firstOpenStep(editing)).toBe('habits');
		expect(canOpen(editing, 'habits')).toBe(true);
		expect(canOpen(editing, 'targets')).toBe(false);
	});

	it('changing habits drops their overrides and the layout', () => {
		const draft = {
			...emptyDraft('2026-10'),
			habitIds: ['a', 'b', 'c'],
			targets: { a: 2, b: 3 },
			layout: ['a', 'b', 'c']
		};
		const same = withHabits(draft, ['c', 'b', 'a']);
		expect(same.layout).toEqual(['a', 'b', 'c']);
		expect(same.habitIds).toEqual(['c', 'b', 'a']);
		const changed = withHabits(draft, ['a', 'c', 'd']);
		expect(changed.targets).toEqual({ a: 2 });
		expect(changed.layout).toBeNull();
		expect(changed.habitIds).toEqual(['a', 'c', 'd']);
	});
});
