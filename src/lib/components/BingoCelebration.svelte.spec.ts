import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import BingoCelebration from './BingoCelebration.svelte';

const rewards = { bingo: 'Ice cream', sixty: 'Movie night', blackout: 'A weekend away' };

describe('BingoCelebration', () => {
	it('announces BINGO for a new line', async () => {
		render(BingoCelebration, {
			lines: [[0, 1, 2]],
			tiers: [],
			rewards,
			sixtyThreshold: 5,
			ondone: () => {}
		});
		await expect.element(page.getByRole('status')).toHaveTextContent('BINGO!');
	});

	it('reveals the reward for a newly reached tier', async () => {
		const ondone = vi.fn();
		render(BingoCelebration, {
			lines: [[0, 1, 2]],
			tiers: ['bingo', 'blackout'],
			rewards,
			sixtyThreshold: 5,
			ondone
		});
		const reveal = page.getByRole('dialog', { name: 'You earned a reward' });
		await expect.element(reveal).toHaveTextContent('Ice cream');
		await expect.element(reveal).toHaveTextContent('A weekend away');
		await page.getByRole('button', { name: 'Nice!' }).click();
		expect(ondone).toHaveBeenCalled();
	});

	it('finishes on its own when there is no reward to reveal', async () => {
		const ondone = vi.fn();
		render(BingoCelebration, {
			lines: [[0, 1, 2]],
			tiers: [],
			rewards,
			sixtyThreshold: 5,
			ondone,
			duration: 50
		});
		await expect.poll(() => ondone.mock.calls.length, { timeout: 2000 }).toBe(1);
	});
});
