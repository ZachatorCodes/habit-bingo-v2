import { describe, expect, it } from 'vitest';
import { rankRows } from './leaderboard.ts';

const row = (id: string, points: number | null) => ({ id, points });

describe('rankRows', () => {
	it('sorts by points with competition ranks, no-card rows last', () => {
		const out = rankRows([row('a', 10), row('b', 30), row('c', 30), row('d', null), row('e', 5)]);
		expect(out.map((r) => [r.id, r.rank])).toEqual([
			['b', 1],
			['c', 1],
			['a', 3],
			['e', 4],
			['d', null]
		]);
	});

	it('keeps input order when every row has no card', () => {
		const out = rankRows([row('a', null), row('b', null)]);
		expect(out.map((r) => [r.id, r.rank])).toEqual([
			['a', null],
			['b', null]
		]);
	});

	it('returns [] for empty input', () => {
		expect(rankRows([])).toEqual([]);
	});

	it('keeps input order among ties', () => {
		const out = rankRows([row('x', 7), row('y', 7), row('z', 7)]);
		expect(out.map((r) => r.id)).toEqual(['x', 'y', 'z']);
		expect(out.every((r) => r.rank === 1)).toBe(true);
	});
});
