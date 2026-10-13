/** Visual state of a card square (spec §3.5). Computed by the game module from M2 on. */
export type SquareState =
	'empty' | 'inProgress' | 'complete' | 'held' | 'atRisk' | 'lost' | 'free' | 'buildNext';
