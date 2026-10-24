// Which feed highlights a check-in newly earned or undid (spec §4). Pure; the server applies it.
import type { SquareState } from './square-state.ts';
import type { Tier } from './score.ts';

export const REACTIONS = ['heart', 'fire', 'hands-clapping', 'trophy', 'star', 'smiley'] as const;
export type ReactionIcon = (typeof REACTIONS)[number];

export type HighlightState = {
	squares: { id: string; direction: 'atLeast' | 'atMost'; state: SquareState }[];
	tiers: Tier[];
};

const TIERS: readonly Tier[] = ['bingo', 'sixtyPercent', 'blackout'];

/**
 * Event keys a highlight is stored under: `square:<id>` or `tier:<tier>`. Posts only what this
 * check-in newly made true; removes everything not true now, so a highlight lost while no one was
 * checking in (a held square slipping as the days pass) is cleared on the next check-in.
 */
export function highlightChanges(
	before: HighlightState,
	after: HighlightState
): { post: string[]; remove: string[] } {
	const done = (s: HighlightState) =>
		new Set(
			s.squares.filter((q) => q.direction === 'atLeast' && q.state === 'complete').map((q) => q.id)
		);
	const [was, is] = [done(before), done(after)];
	const post = [
		...[...is].filter((id) => !was.has(id)).map((id) => `square:${id}`),
		...after.tiers.filter((t) => !before.tiers.includes(t)).map((t) => `tier:${t}`)
	];
	const remove = [
		...after.squares
			.filter((q) => q.direction === 'atLeast' && !is.has(q.id))
			.map((q) => `square:${q.id}`),
		...TIERS.filter((t) => !after.tiers.includes(t)).map((t) => `tier:${t}`)
	];
	return { post, remove };
}
