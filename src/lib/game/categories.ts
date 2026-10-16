/** The fixed habit categories (spec §3.2), in display order. */
export const CATEGORIES = [
	{ id: 'fitness', icon: 'barbell', label: 'Fitness' },
	{ id: 'health', icon: 'heartbeat', label: 'Health' },
	{ id: 'mind', icon: 'brain', label: 'Mind' },
	{ id: 'home', icon: 'house', label: 'Home' },
	{ id: 'social', icon: 'users-three', label: 'Social' },
	{ id: 'learning', icon: 'graduation-cap', label: 'Learning' },
	{ id: 'creative', icon: 'palette', label: 'Creative' },
	{ id: 'money', icon: 'piggy-bank', label: 'Money' },
	{ id: 'other', icon: 'sparkle', label: 'Other' }
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];

const IDS: ReadonlySet<string> = new Set(CATEGORIES.map((category) => category.id));

export function isCategoryId(value: string): value is CategoryId {
	return IDS.has(value);
}
