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
		['complete', '✓'],
		['held', '🛡'],
		['atRisk', '⚠'],
		['lost', '✗'],
		['free', 'FREE']
	] as const)('shows a %s marker that does not rely on color', async (state, marker) => {
		render(BingoSquare, { emoji: '🚴', label: 'Bike', state });
		await expect.element(page.getByText(marker, { exact: true })).toBeInTheDocument();
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

	it('shows the habit name only when showLabel is set', async () => {
		render(BingoSquare, { emoji: '🚴', label: 'Go biking', state: 'empty', showLabel: true });
		await expect.element(page.getByText('Go biking')).toBeInTheDocument();
	});
});
