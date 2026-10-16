import { describe, expect, it } from 'vitest';
import { CATEGORIES } from '#lib/game/categories.ts';
import {
	AVATAR_ICONS,
	CATEGORY_ICON,
	DEFAULT_AVATAR_ICON,
	FALLBACK_ICON,
	ICONS,
	isIconName
} from '#lib/icons.ts';

describe('icon registry', () => {
	it('has about 60 unique icons, every group a real category', () => {
		expect(ICONS.length).toBeGreaterThanOrEqual(54);
		expect(new Set(ICONS.map((i) => i.name)).size).toBe(ICONS.length);
		for (const icon of ICONS) expect(CATEGORIES.map((c) => c.id)).toContain(icon.group);
	});
	it('each category icon matches CATEGORY_ICON', () => {
		for (const c of CATEGORIES) expect(c.icon).toBe(CATEGORY_ICON[c.id]);
	});
	it('isIconName accepts curated names only', () => {
		expect(isIconName('book-open')).toBe(true);
		expect(isIconName('BookOpen')).toBe(false);
		expect(isIconName('')).toBe(false);
		expect(isIconName('<svg>')).toBe(false);
	});
	it('category, avatar, fallback and default icons are all curated', () => {
		expect(AVATAR_ICONS).toHaveLength(24);
		for (const n of [
			...Object.values(CATEGORY_ICON),
			...AVATAR_ICONS,
			FALLBACK_ICON,
			DEFAULT_AVATAR_ICON
		])
			expect(isIconName(n)).toBe(true);
	});
});
