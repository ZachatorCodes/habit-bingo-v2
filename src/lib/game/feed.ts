// Which feed highlights a check-in newly earned or undid (spec §4). Pure; the server applies it.
import type { SquareState } from './square-state.ts';
import type { Tier } from './score.ts';

export const REACTIONS = ['heart', 'fire', 'hands-clapping', 'trophy', 'star', 'smiley'] as const;
export type ReactionIcon = (typeof REACTIONS)[number];

export type HighlightState = {
	squares: { id: string; direction: 'atLeast' | 'atMost'; state: SquareState }[];
	tiers: Tier[];
};

/** Event keys a highlight is stored under: `square:<id>` or `tier:<tier>`. */
export function highlightChanges(
	before: HighlightState,
	after: HighlightState
): { post: string[]; remove: string[] } {
	const post: string[] = [];
	const remove: string[] = [];
	const done = (s: HighlightState) =>
		new Set(
			s.squares.filter((q) => q.direction === 'atLeast' && q.state === 'complete').map((q) => q.id)
		);
	const [was, is] = [done(before), done(after)];
	for (const id of is) if (!was.has(id)) post.push(`square:${id}`);
	for (const id of was) if (!is.has(id)) remove.push(`square:${id}`);
	for (const t of after.tiers) if (!before.tiers.includes(t)) post.push(`tier:${t}`);
	for (const t of before.tiers) if (!after.tiers.includes(t)) remove.push(`tier:${t}`);
	return { post, remove };
}
