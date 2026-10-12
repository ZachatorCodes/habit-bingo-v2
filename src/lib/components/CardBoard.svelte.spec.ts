import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { SquareState } from '#lib/game/square-state.ts';
import CardBoard from './CardBoard.svelte';

function squares(count: number, free: number | null = null) {
	return Array.from({ length: count }, (_, i) => ({
		emoji: '🧘',
		name: i === free ? 'Free' : `Habit ${i}`,
		state: (i === free ? 'free' : 'held') as SquareState
	}));
}

describe('CardBoard', () => {
	it('renders size × size squares with FREE in the 5×5 center', async () => {
		render(CardBoard, { size: 5, squares: squares(25, 12) });
		await expect.element(page.getByRole('img').first()).toBeVisible();
		expect(page.getByRole('img').elements()).toHaveLength(25);
		await expect.element(page.getByText('FREE')).toBeVisible();
		expect(page.getByRole('img').nth(12).element().getAttribute('data-state')).toBe('free');
	});

	it('renders nine squares on a 3×3 card', async () => {
		render(CardBoard, { size: 3, squares: squares(9) });
		expect(page.getByRole('img').elements()).toHaveLength(9);
	});

	it('names each square with its state in text', async () => {
		render(CardBoard, {
			size: 3,
			squares: [{ emoji: '🧘', name: 'Meditate', state: 'held' }, ...squares(8)]
		});
		await expect.element(page.getByRole('img', { name: 'Meditate: protected' })).toBeVisible();
	});
});
