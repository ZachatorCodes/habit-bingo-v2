/** The fixed habit categories (spec §3.2), in display order. */
export const CATEGORIES = [
	{ id: 'fitness', emoji: '💪', label: 'Fitness' },
	{ id: 'health', emoji: '🥗', label: 'Health' },
	{ id: 'mind', emoji: '🧠', label: 'Mind' },
	{ id: 'home', emoji: '🏠', label: 'Home' },
	{ id: 'social', emoji: '👥', label: 'Social' },
	{ id: 'learning', emoji: '📚', label: 'Learning' },
	{ id: 'creative', emoji: '🎨', label: 'Creative' },
	{ id: 'money', emoji: '💰', label: 'Money' },
	{ id: 'other', emoji: '✨', label: 'Other' }
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];

const IDS: ReadonlySet<string> = new Set(CATEGORIES.map((category) => category.id));

export function isCategoryId(value: string): value is CategoryId {
	return IDS.has(value);
}
