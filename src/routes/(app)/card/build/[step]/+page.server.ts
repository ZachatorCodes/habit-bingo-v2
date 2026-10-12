import { error, fail, redirect } from '@sveltejs/kit';
import { CATEGORIES, type CategoryId } from '#lib/game/categories.ts';
import { monthName } from '#lib/game/calendar.ts';
import { CARD_SIZES, isCardSize, type CardSize } from '#lib/game/card-layout.ts';
import { requireUser } from '#lib/server/auth/guards.ts';
import {
	STEPS,
	canOpen,
	discardDraft,
	firstOpenStep,
	getDraft,
	saveDraft,
	stepsFor,
	withHabits,
	type CardDraft,
	type Step
} from '#lib/server/card-drafts.ts';
import { currentMonth, getCard } from '#lib/server/cards.ts';
import { getDb } from '#lib/server/db/client.ts';
import { DEFAULT_HABIT_INPUT, readHabitForm } from '#lib/server/habit-form.ts';
import { createHabit, listHabits } from '#lib/server/habits.ts';
import type { Actions, PageServerLoad } from './$types';

function isStep(value: string): value is Step {
	return (STEPS as readonly string[]).includes(value);
}

/** The person, their database and this month's draft, or a redirect when a card already exists. */
async function builderContext(locals: App.Locals) {
	const user = requireUser(locals);
	const db = getDb();
	if (!db) error(503, 'The card builder is not available right now.');
	const month = currentMonth({ timezone: user.timezone ?? 'UTC' }, new Date());
	const [card, draft] = await Promise.all([
		getCard(db, user.id, month),
		getDraft(db, user.id, month)
	]);
	// A card for this month can only be changed through a draft that is editing it.
	if (card && draft.cardId !== card.id) redirect(303, '/card');
	return { user, db, month, card, draft };
}

/** The draft with the given step marked done. */
function complete(draft: CardDraft, step: Step): CardDraft {
	const done = new Set([...draft.completed, step]);
	return { ...draft, completed: stepsFor(draft).filter((s) => done.has(s)) };
}

/** The draft with the given step and every later one open again, because something upstream changed. */
function reopen(draft: CardDraft, step: Step): CardDraft {
	const before = stepsFor(draft).slice(0, stepsFor(draft).indexOf(step));
	return { ...draft, completed: before.filter((s) => draft.completed.includes(s)) };
}

function nextStep(draft: CardDraft, step: Step): Step {
	const steps = stepsFor(draft);
	return steps[Math.min(steps.indexOf(step) + 1, steps.length - 1)];
}

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!isStep(params.step)) error(404, 'Not found');
	const { user, db, month, card, draft } = await builderContext(locals);
	if (!canOpen(draft, params.step)) redirect(303, `/card/build/${firstOpenStep(draft)}`);

	const size: CardSize | null = draft.size ?? card?.size ?? null;
	const habits = await listHabits(db, user.id);
	const counts = Object.fromEntries(CATEGORIES.map((c) => [c.id, 0])) as Record<CategoryId, number>;
	for (const habit of habits) counts[habit.category] += 1;
	return {
		step: params.step,
		steps: stepsFor(draft),
		draft,
		monthName: monthName(month),
		habits,
		counts,
		/** How many habits the card holds; null until a size is picked. */
		need: size === null ? null : CARD_SIZES[size].habits,
		values: DEFAULT_HABIT_INPUT
	};
};

export const actions: Actions = {
	size: async ({ locals, request }) => {
		const { user, db, draft } = await builderContext(locals);
		if (draft.cardId) redirect(303, `/card/build/${firstOpenStep(draft)}`);
		const raw = Number((await request.formData()).get('size'));
		if (!isCardSize(raw)) return fail(400, { message: 'Pick a size.' });

		// A new size needs a new number of habits, so everything after it is open again.
		const changed = draft.size !== raw;
		const sized = { ...draft, size: raw, layout: changed ? null : draft.layout };
		const next = complete(changed ? reopen(sized, 'size') : sized, 'size');
		await saveDraft(db, user.id, next);
		redirect(303, `/card/build/${nextStep(next, 'size')}`);
	},

	habits: async ({ locals, request }) => {
		const { user, db, card, draft } = await builderContext(locals);
		if (!canOpen(draft, 'habits')) redirect(303, `/card/build/${firstOpenStep(draft)}`);
		const size: CardSize | null = draft.size ?? card?.size ?? null;
		if (size === null) redirect(303, '/card/build/size');

		const ids = (await request.formData())
			.getAll('habitIds')
			.filter((id): id is string => typeof id === 'string');
		const need = CARD_SIZES[size].habits;
		if (ids.length !== need || new Set(ids).size !== need) {
			return fail(400, { message: `Pick exactly ${need} habits.`, selected: ids });
		}
		const mine = new Set((await listHabits(db, user.id)).map((h) => h.id));
		if (ids.some((id) => !mine.has(id))) {
			return fail(400, { message: 'Pick from your habits.', selected: ids });
		}

		const before = new Set(draft.habitIds);
		const same = before.size === need && ids.every((id) => before.has(id));
		const picked = withHabits(draft, ids);
		const next = complete(same ? picked : reopen(picked, 'habits'), 'habits');
		await saveDraft(db, user.id, next);
		redirect(303, `/card/build/${nextStep(next, 'habits')}`);
	},

	createHabit: async ({ locals, request }) => {
		const { user, db, draft } = await builderContext(locals);
		const values = await readHabitForm(request);
		const result = await createHabit(db, user.id, values);
		if (!result.ok) {
			return fail(400, { values, errors: { [result.field]: result.message } });
		}
		// The new habit joins the selection; the person may now have more picked than the card holds,
		// which the Habits step explains when they continue.
		const next = reopen(withHabits(draft, [...draft.habitIds, result.habit.id]), 'habits');
		await saveDraft(db, user.id, next);
		return { createdHabitId: result.habit.id };
	},

	discard: async ({ locals }) => {
		const { user, db } = await builderContext(locals);
		await discardDraft(db, user.id);
		redirect(303, '/card/build');
	}
};
