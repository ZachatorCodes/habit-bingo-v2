/** Visual state of a card square (spec §3.5). Computed by the game module from M2 on. */
export type SquareState =
	'empty' | 'inProgress' | 'complete' | 'held' | 'atRisk' | 'lost' | 'free' | 'buildNext';

/** A square's state alone counts toward lines, tiers and blackout when complete, held or at risk (§3.5). */
export function counts(state: SquareState): boolean {
	return state === 'complete' || state === 'free' || state === 'held' || state === 'atRisk';
}
