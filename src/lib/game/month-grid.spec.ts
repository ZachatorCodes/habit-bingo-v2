import { describe, expect, it } from 'vitest';
import { monthGrid } from './month-grid.ts';

describe('monthGrid', () => {
	it('pads the first monday-week row with blanks before Thursday the 1st', () => {
		expect(monthGrid('2026-10', 'monday')[0]).toEqual([
			null,
			null,
			null,
			'2026-10-01',
			'2026-10-02',
			'2026-10-03',
			'2026-10-04'
		]);
	});

	it('starts sunday weeks with 4 blanks when the 1st is a Thursday', () => {
		const first = monthGrid('2026-10', 'sunday')[0];
		expect(first.slice(0, 5)).toEqual([null, null, null, null, '2026-10-01']);
	});

	it('gives every row 7 cells and ends with blanks after the last day', () => {
		const grid = monthGrid('2026-10', 'monday');
		expect(grid.every((row) => row.length === 7)).toBe(true);
		const last = grid[grid.length - 1];
		expect(last.indexOf('2026-10-31')).toBe(5);
		expect(last[6]).toBeNull();
	});

	it('handles a month starting on Sunday for both week starts', () => {
		expect(monthGrid('2026-11', 'monday')[0].filter((c) => c === null)).toHaveLength(6);
		expect(monthGrid('2026-11', 'sunday')[0].filter((c) => c === null)).toHaveLength(0);
	});
});
