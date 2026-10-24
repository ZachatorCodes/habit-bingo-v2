import { describe, expect, it } from 'vitest';
import { highlightChanges, type HighlightState } from './feed.ts';

const state = (
	squares: HighlightState['squares'] = [],
	tiers: HighlightState['tiers'] = []
): HighlightState => ({ squares, tiers });
const sq = (
	id: string,
	s: HighlightState['squares'][number]['state'],
	direction: 'atLeast' | 'atMost' = 'atLeast'
) => ({
	id,
	direction,
	state: s
});

const ALL_TIERS = ['tier:bingo', 'tier:sixtyPercent', 'tier:blackout'];

describe('highlightChanges', () => {
	it('posts an at-least square that becomes complete and removes it when it stops', () => {
		const a = state([sq('a', 'inProgress')]);
		const b = state([sq('a', 'complete')]);
		expect(highlightChanges(a, b).post).toEqual(['square:a']);
		expect(highlightChanges(a, b).remove).not.toContain('square:a');
		expect(highlightChanges(b, a)).toEqual({ post: [], remove: ['square:a', ...ALL_TIERS] });
	});
	it('never posts an at-most square, and never tries to remove one', () => {
		const a = state([sq('a', 'inProgress', 'atMost')]);
		const b = state([sq('a', 'complete', 'atMost')]);
		expect(highlightChanges(a, b)).toEqual({ post: [], remove: ALL_TIERS });
		expect(highlightChanges(b, a)).toEqual({ post: [], remove: ALL_TIERS });
	});
	it('posts a newly reached tier and removes a lost one', () => {
		expect(highlightChanges(state([], []), state([], ['bingo']))).toEqual({
			post: ['tier:bingo'],
			remove: ['tier:sixtyPercent', 'tier:blackout']
		});
		expect(highlightChanges(state([], ['bingo']), state([], [])).remove).toContain('tier:bingo');
	});
	it('posts nothing for a tier held both before and after', () => {
		const held = state([sq('a', 'complete')], ['bingo']);
		expect(highlightChanges(held, held)).toEqual({
			post: [],
			remove: ['tier:sixtyPercent', 'tier:blackout']
		});
	});
	it('removes a tier lost without a check-in (the day moved on)', () => {
		// The tier was already gone before this check-in, so only the current state can clear it.
		const lost = state([sq('a', 'inProgress')], []);
		expect(highlightChanges(lost, lost).remove).toContain('tier:bingo');
	});
	it('treats a square missing from before as not complete', () => {
		expect(highlightChanges(state(), state([sq('a', 'complete')])).post).toEqual(['square:a']);
	});
});
