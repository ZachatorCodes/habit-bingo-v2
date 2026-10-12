import type { HabitInput } from './habits.ts';

/** Reads the habit form's fields; validation happens in the habits service. */
export async function readHabitForm(request: Request): Promise<HabitInput> {
	const data = await request.formData();
	const text = (key: string) => {
		const value = data.get(key);
		return typeof value === 'string' ? value : '';
	};
	return {
		emoji: text('emoji'),
		name: text('name'),
		category: text('category'),
		direction: text('direction'),
		period: text('period'),
		// Absent for per-day habits (the field is hidden); the service fills in the right mode.
		countMode: text('countMode') || undefined,
		target: text('target'),
		isPrivate: data.get('isPrivate') === 'on'
	};
}

/** Where to go after saving: the habit's category, with a flag for the confirmation message. */
export function libraryUrl(category: string, flag: 'created' | 'saved'): string {
	return `/me/habits?category=${encodeURIComponent(category)}&${flag}=1`;
}
