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
		['empty', 'open'],
		['inProgress', 'progress'],
		['complete', 'earned'],
		['held', 'protected'],
		['atRisk', 'risk'],
		['lost', 'lost']
	] as const)('%s renders the %s ring', (state, variant) => {
		const c = render(BingoSquare, { icon: 'drop', label: 'Water', state }).container;
		expect(c.querySelector('[data-variant]')!.getAttribute('data-variant')).toBe(variant);
	});

	it('announces name and state, ring hidden', async () => {
		render(BingoSquare, { icon: 'drop', label: 'Water', state: 'held' });
		await expect.element(page.getByRole('img', { name: 'Water: protected' })).toBeInTheDocument();
	});

	it('free shows "Free" and no ring', () => {
		const c = render(BingoSquare, { icon: 'drop', label: 'Free', state: 'free' }).container;
		expect(c.textContent).toContain('Free');
		expect(c.querySelector('[data-variant]')).toBeNull();
	});

	it('buildNext shows the rocket and "Next month"', () => {
		const c = render(BingoSquare, { icon: 'x', label: 'Build', state: 'buildNext' }).container;
		expect(c.textContent).toContain('Next month');
		expect(c.querySelector('svg')).not.toBeNull();
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
