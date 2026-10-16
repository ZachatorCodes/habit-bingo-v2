import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import BingoSquare from './BingoSquare.svelte';

describe('BingoSquare', () => {
	it('names the habit and state for screen readers', async () => {
		render(BingoSquare, { icon: 'book-open', label: 'Finish a book', state: 'complete' });
		await expect
			.element(page.getByRole('img', { name: 'Finish a book: complete' }))
			.toBeInTheDocument();
	});

	it('draws the icon as an svg, falling back for unknown names', async () => {
		const { container } = render(BingoSquare, { icon: 'bicycle', label: 'Bike', state: 'empty' });
		expect(container.querySelector('svg')).not.toBeNull();
		const unknown = render(BingoSquare, { icon: 'nope', label: 'Odd', state: 'empty' });
		expect(unknown.container.querySelector('svg')).not.toBeNull();
	});

	it.each([
		['complete', 'border-[3px]'],
		['held', 'border-solid'],
		['atRisk', 'border-dashed'],
		['lost', 'opacity-70'],
		['buildNext', 'border-dotted']
	] as const)('shows %s by its border style, with no corner icon', async (state, style) => {
		render(BingoSquare, { icon: 'bicycle', label: 'Bike', state });
		const square = page.getByRole('img').element();
		expect(square.getAttribute('data-state')).toBe(state);
		expect(square.className).toContain(style);
		expect(square.textContent).not.toMatch(/[✓🛡⚠✗✏]/u);
	});

	it('renders a progress bar at the given percent when in progress', async () => {
		render(BingoSquare, { icon: 'bicycle', label: 'Bike', state: 'inProgress', progress: 0.66 });
		await expect
			.element(page.getByRole('progressbar', { includeHidden: true }))
			.toHaveAttribute('aria-valuenow', '66');
		await expect
			.element(page.getByRole('img', { name: 'Bike: in progress, 66%' }))
			.toBeInTheDocument();
	});

	it('always shows the name, struck through when lost', async () => {
		render(BingoSquare, { icon: 'bicycle', label: 'Go biking', state: 'lost' });
		const name = page.getByText('Go biking').element();
		expect(name.className).toContain('line-through');
	});

	it('compact squares clamp the name to two lines', async () => {
		render(BingoSquare, {
			icon: 'bicycle',
			label: 'A very long habit name that keeps going',
			state: 'held',
			compact: true
		});
		expect(page.getByText(/A very long habit name/).element().className).toContain('line-clamp-2');
	});
});
