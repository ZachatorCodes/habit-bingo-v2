import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CardHeader from './CardHeader.svelte';

const rewards = { bingo: 'Ice cream', sixty: 'Movie night', blackout: 'A weekend away' };
const score = (overrides = {}) => ({
	counting: 4,
	percent: 44,
	lines: [] as number[][],
	tiers: [] as ('bingo' | 'sixtyPercent' | 'blackout')[],
	points: 120,
	...overrides
});

describe('CardHeader', () => {
	it('shows the month, percent counting, bingos and points', async () => {
		render(CardHeader, { monthName: 'October', score: score(), size: 3, rewards });
		await expect
			.element(page.getByRole('heading', { level: 1, name: 'October card' }))
			.toBeVisible();
		await expect.element(page.getByText('44% counting')).toBeVisible();
		await expect.element(page.getByText('0 bingos')).toBeVisible();
		await expect.element(page.getByText('120 points')).toBeVisible();
	});

	it('uses singulars', async () => {
		render(CardHeader, {
			monthName: 'October',
			score: score({ lines: [[0, 1, 2]], points: 1 }),
			size: 3,
			rewards
		});
		await expect.element(page.getByText('1 bingo', { exact: true })).toBeVisible();
		await expect.element(page.getByText('1 point', { exact: true })).toBeVisible();
	});

	it('lists the three tiers with their rewards and marks reached ones in text', async () => {
		render(CardHeader, {
			monthName: 'October',
			score: score({ tiers: ['bingo'] }),
			size: 5,
			rewards
		});
		const tiers = page.getByRole('list', { name: 'Rewards' }).getByRole('listitem');
		expect(tiers.elements().map((li) => li.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
			'Bingo Ice cream ✓ Reached',
			'15 squares Movie night',
			'Blackout A weekend away'
		]);
	});
});
