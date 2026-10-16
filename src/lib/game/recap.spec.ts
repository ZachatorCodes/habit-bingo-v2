import { describe, expect, it } from 'vitest';
import { categoryBreakdown, isFinal, mostLogged } from './recap.ts';

describe('isFinal', () => {
	it('is final from the 4th of the next month (spec §3.8)', () => {
		expect(isFinal('2026-10', '2026-10-31')).toBe(false);
		expect(isFinal('2026-10', '2026-11-03')).toBe(false);
		expect(isFinal('2026-10', '2026-11-04')).toBe(true);
		expect(isFinal('2026-09', '2026-11-01')).toBe(true);
		expect(isFinal('2026-12', '2027-01-04')).toBe(true);
	});
});

describe('mostLogged', () => {
	const bike = { id: 'a', icon: 'bicycle', name: 'Go biking' };
	const water = { id: 'b', icon: 'drop', name: 'Drink water' };
	const days = (entries: Record<string, number>) => new Map(Object.entries(entries));

	it('sums every day and picks the highest total', () => {
		const checkIns = new Map([
			['a', days({ '2026-10-01': 6, '2026-10-02': 8 })],
			['b', days({ '2026-10-01': 9 })]
		]);
		expect(mostLogged([water, bike], checkIns)).toEqual({
			icon: 'bicycle',
			name: 'Go biking',
			total: 14
		});
	});

	it('a tie goes to the earlier square', () => {
		const checkIns = new Map([
			['a', days({ '2026-10-01': 2 })],
			['b', days({ '2026-10-03': 2 })]
		]);
		expect(mostLogged([water, bike], checkIns)?.name).toBe('Drink water');
	});

	it('is null when nothing was logged', () => {
		expect(mostLogged([water, bike], new Map())).toBeNull();
		expect(mostLogged([], new Map())).toBeNull();
	});
});

describe('categoryBreakdown', () => {
	it('counts each category in display order, only those present', () => {
		expect(
			categoryBreakdown([
				{ category: 'mind', state: 'held' },
				{ category: 'fitness', state: 'complete' },
				{ category: 'fitness', state: 'lost' },
				{ category: 'fitness', state: 'held' },
				{ category: 'fitness', state: 'inProgress' },
				{ category: 'mind', state: 'atRisk' },
				{ category: 'mind', state: 'empty' }
			])
		).toEqual([
			{ id: 'fitness', icon: 'barbell', label: 'Fitness', counting: 2, total: 4 },
			{ id: 'mind', icon: 'brain', label: 'Mind', counting: 2, total: 3 }
		]);
		expect(categoryBreakdown([])).toEqual([]);
	});
});
