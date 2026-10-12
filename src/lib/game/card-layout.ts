import type { Direction, Period } from './habit-rules.ts';
import type { SquareState } from './square-state.ts';

export type CardSize = 3 | 5;

export function isCardSize(value: unknown): value is CardSize {
	return value === 3 || value === 5;
}

export const CARD_SIZES: Record<
	CardSize,
	{
		habits: number;
		squares: number;
		multiplier: number;
		sixtyThreshold: number;
		freePosition: number | null;
	}
> = {
	3: { habits: 9, squares: 9, multiplier: 1, sixtyThreshold: 5, freePosition: null },
	5: { habits: 24, squares: 25, multiplier: 2, sixtyThreshold: 15, freePosition: 12 }
};

/** Fisher-Yates shuffle of `items`, with a null (the FREE square) inserted at the free position. */
export function shuffleLayout<T>(
	items: readonly T[],
	size: CardSize,
	random: () => number
): (T | null)[] {
	const { habits, freePosition } = CARD_SIZES[size];
	if (items.length !== habits) {
		throw new RangeError(`A ${size}x${size} card needs ${habits} habits, got ${items.length}.`);
	}
	const shuffled: (T | null)[] = [...items];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	if (freePosition !== null) shuffled.splice(freePosition, 0, null);
	return shuffled;
}

/** Right length, null exactly at the free position, and a permutation of `items`. */
export function isValidLayout<T>(
	layout: readonly (T | null)[],
	items: readonly T[],
	size: CardSize
): boolean {
	const { squares, freePosition } = CARD_SIZES[size];
	if (layout.length !== squares || items.length !== CARD_SIZES[size].habits) return false;
	if (layout.some((entry, index) => (entry === null) !== (index === freePosition))) return false;
	const remaining = [...items];
	for (const entry of layout) {
		if (entry === null) continue;
		const at = remaining.indexOf(entry);
		if (at === -1) return false;
		remaining.splice(at, 1);
	}
	return true;
}

/** Placeholder until M4's live evaluation: earn squares start empty, protect squares start held. */
export function initialSquareState(
	square: { isFree: true } | { isFree: false; direction: Direction; period: Period }
): SquareState {
	if (square.isFree) return 'free';
	return square.direction === 'atLeast' && square.period === 'month' ? 'empty' : 'held';
}
