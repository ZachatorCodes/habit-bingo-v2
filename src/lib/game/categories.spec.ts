import { describe, expect, it } from 'vitest';
import { CATEGORIES, isCategoryId } from './categories';

describe('categories', () => {
	it('lists the nine categories in spec order with their emoji', () => {
		expect(CATEGORIES.map((c) => `${c.emoji} ${c.label}`)).toEqual([
			'💪 Fitness',
			'🥗 Health',
			'🧠 Mind',
			'🏠 Home',
			'👥 Social',
			'📚 Learning',
			'🎨 Creative',
			'💰 Money',
			'✨ Other'
		]);
		expect(CATEGORIES.map((c) => c.id)).toEqual([
			'fitness',
			'health',
			'mind',
			'home',
			'social',
			'learning',
			'creative',
			'money',
			'other'
		]);
	});

	it('recognizes category ids and rejects others', () => {
		expect(isCategoryId('fitness')).toBe(true);
		expect(isCategoryId('other')).toBe(true);
		expect(isCategoryId('Fitness')).toBe(false);
		expect(isCategoryId('sports')).toBe(false);
		expect(isCategoryId('')).toBe(false);
	});
});
