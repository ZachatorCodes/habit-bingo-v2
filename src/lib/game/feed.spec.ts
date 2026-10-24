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

describe('highlightChanges', () => {
	it('posts an at-least square that becomes complete and removes it when it stops', () => {
		const a = state([sq('a', 'inProgress')]);
		const b = state([sq('a', 'complete')]);
		expect(highlightChanges(a, b)).toEqual({ post: ['square:a'], remove: [] });
		expect(highlightChanges(b, a)).toEqual({ post: [], remove: ['square:a'] });
	});
	it('never posts an at-most square', () => {
		const a = state([sq('a', 'inProgress', 'atMost')]);
		const b = state([sq('a', 'complete', 'atMost')]);
		expect(highlightChanges(a, b)).toEqual({ post: [], remove: [] });
		expect(highlightChanges(b, a)).toEqual({ post: [], remove: [] });
	});
	it('posts a newly reached tier and removes a lost one', () => {
		expect(highlightChanges(state([], []), state([], ['bingo']))).toEqual({
			post: ['tier:bingo'],
			remove: []
		});
		expect(highlightChanges(state([], ['bingo']), state([], []))).toEqual({
			post: [],
			remove: ['tier:bingo']
		});
	});
	it('posts nothing for a tier held both before and after', () => {
		const held = state([sq('a', 'complete')], ['bingo']);
		expect(highlightChanges(held, held)).toEqual({ post: [], remove: [] });
	});
	it('is empty for identical states', () => {
		const s = state([sq('a', 'inProgress')], []);
		expect(highlightChanges(s, s)).toEqual({ post: [], remove: [] });
	});
	it('treats a square missing from before as not complete', () => {
		expect(highlightChanges(state(), state([sq('a', 'complete')]))).toEqual({
			post: ['square:a'],
			remove: []
		});
	});
});
