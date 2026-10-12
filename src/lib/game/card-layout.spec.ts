import { describe, expect, it } from 'vitest';
import {
	CARD_SIZES,
	initialSquareState,
	isCardSize,
	isValidLayout,
	shuffleLayout
} from './card-layout';

const items = (n: number) => Array.from({ length: n }, (_, i) => `h${i}`);

/** Deterministic pseudo-random sequence. */
function seeded(seed: number) {
	let s = seed;
	return () => {
		s = (s * 1664525 + 1013904223) % 4294967296;
		return s / 4294967296;
	};
}

describe('card sizes', () => {
	it('sizes match the spec', () => {
		expect(CARD_SIZES).toEqual({
			3: { habits: 9, squares: 9, multiplier: 1, sixtyThreshold: 5, freePosition: null },
			5: { habits: 24, squares: 25, multiplier: 2, sixtyThreshold: 15, freePosition: 12 }
		});
		expect(isCardSize(3)).toBe(true);
		expect(isCardSize(5)).toBe(true);
		expect(isCardSize(4)).toBe(false);
		expect(isCardSize('5')).toBe(false);
	});
});

describe('shuffleLayout', () => {
	it('shuffles every item exactly once, deterministically for a given random', () => {
		const a = shuffleLayout(items(9), 3, seeded(1));
		const b = shuffleLayout(items(9), 3, seeded(1));
		expect(a).toEqual(b);
		expect([...a].sort()).toEqual(items(9));
		expect(a).not.toEqual(items(9));
	});

	it('does not mutate its input', () => {
		const input = items(9);
		shuffleLayout(input, 3, seeded(2));
		expect(input).toEqual(items(9));
	});

	it('puts FREE at index 12 on 5x5 only', () => {
		const five = shuffleLayout(items(24), 5, seeded(3));
		expect(five).toHaveLength(25);
		expect(five[12]).toBeNull();
		expect(five.filter((x) => x === null)).toHaveLength(1);
		expect(five.filter((x) => x !== null).sort()).toEqual(items(24).sort());
		const three = shuffleLayout(items(9), 3, seeded(3));
		expect(three).toHaveLength(9);
		expect(three.includes(null)).toBe(false);
	});

	it('refuses the wrong number of items', () => {
		expect(() => shuffleLayout(items(8), 3, Math.random)).toThrow(RangeError);
		expect(() => shuffleLayout(items(9), 5, Math.random)).toThrow(RangeError);
	});
});

describe('isValidLayout', () => {
	it('accepts a shuffle', () => {
		expect(isValidLayout(shuffleLayout(items(9), 3, seeded(4)), items(9), 3)).toBe(true);
		expect(isValidLayout(shuffleLayout(items(24), 5, seeded(4)), items(24), 5)).toBe(true);
	});

	it('rejects bad layouts', () => {
		const three = shuffleLayout(items(9), 3, seeded(5));
		const five = shuffleLayout(items(24), 5, seeded(5));
		expect(isValidLayout(three.slice(1), items(9), 3)).toBe(false);
		expect(isValidLayout([...three.slice(1), three[1]], items(9), 3)).toBe(false);
		expect(isValidLayout([...three.slice(1), 'other'], items(9), 3)).toBe(false);
		const offCenter = [...five];
		[offCenter[12], offCenter[0]] = [offCenter[0], offCenter[12]];
		expect(isValidLayout(offCenter, items(24), 5)).toBe(false);
		const noNull = [...five];
		noNull[12] = 'h0';
		expect(isValidLayout(noNull, items(24), 5)).toBe(false);
		const nullOn3 = [...three];
		nullOn3[0] = null;
		expect(isValidLayout(nullOn3, items(9), 3)).toBe(false);
	});
});

describe('initialSquareState', () => {
	it('initial states: earn empty, protect held, free free', () => {
		expect(initialSquareState({ isFree: true })).toBe('free');
		const sq = (direction: 'atLeast' | 'atMost', period: 'day' | 'week' | 'month') => ({
			isFree: false as const,
			direction,
			period
		});
		expect(initialSquareState(sq('atLeast', 'month'))).toBe('empty');
		expect(initialSquareState(sq('atLeast', 'week'))).toBe('held');
		expect(initialSquareState(sq('atLeast', 'day'))).toBe('held');
		expect(initialSquareState(sq('atMost', 'month'))).toBe('held');
		expect(initialSquareState(sq('atMost', 'day'))).toBe('held');
	});
});
