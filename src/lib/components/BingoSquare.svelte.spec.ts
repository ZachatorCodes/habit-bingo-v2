import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import BingoSquare from './BingoSquare.svelte';

describe('BingoSquare', () => {
	it('names the habit and state for screen readers', async () => {
		render(BingoSquare, { emoji: '📚', label: 'Finish a book', state: 'complete' });
		await expect
			.element(page.getByRole('img', { name: 'Finish a book: complete' }))
			.toBeInTheDocument();
	});

	it.each([
		['complete', 'border-[3px]'],
		['held', 'border-solid'],
		['atRisk', 'border-dashed'],
		['lost', 'opacity-70'],
		['buildNext', 'border-dotted']
	] as const)('shows %s by its border style, with no corner icon', async (state, style) => {
		render(BingoSquare, { emoji: '🚴', label: 'Bike', state });
		const square = page.getByRole('img').element();
		expect(square.getAttribute('data-state')).toBe(state);
		expect(square.className).toContain(style);
		expect(square.textContent).not.toMatch(/[✓🛡⚠✗✏]/u);
	});

	it('renders a progress bar at the given percent when in progress', async () => {
		render(BingoSquare, { emoji: '🚴', label: 'Bike', state: 'inProgress', progress: 0.66 });
		await expect
			.element(page.getByRole('progressbar', { includeHidden: true }))
			.toHaveAttribute('aria-valuenow', '66');
		await expect
			.element(page.getByRole('img', { name: 'Bike: in progress, 66%' }))
			.toBeInTheDocument();
	});

	it('always shows the name, struck through when lost', async () => {
		render(BingoSquare, { emoji: '🚴', label: 'Go biking', state: 'lost' });
		const name = page.getByText('Go biking').element();
		expect(name.className).toContain('line-through');
	});

	it('compact squares clamp the name to two lines', async () => {
		render(BingoSquare, {
			emoji: '🚴',
			label: 'A very long habit name that keeps going',
			state: 'held',
			compact: true
		});
		expect(page.getByText(/A very long habit name/).element().className).toContain('line-clamp-2');
	});
});
