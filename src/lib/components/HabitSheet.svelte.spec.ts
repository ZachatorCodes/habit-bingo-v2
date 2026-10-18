import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import HabitSheet, { type SheetData } from './HabitSheet.svelte';

const data: SheetData = {
	id: 'sq-1',
	icon: 'drop',
	name: 'Drink water',
	category: 'Health',
	rule: '8 times a day',
	countMode: 'times',
	state: 'atRisk',
	progress: 0,
	stateText: 'At risk: log a missed day',
	progressText: '3/8 today',
	today: '2026-10-20',
	day: '2026-10-20',
	days: ['2026-10-20', '2026-10-19', '2026-10-18', '2026-10-17'],
	count: 3,
	history: [
		{ date: '2026-10-20', count: 3 },
		{ date: '2026-10-19', count: 0 }
	]
};

describe('HabitSheet', () => {
	it('shows a stepper for times habits', async () => {
		render(HabitSheet, { data });
		await expect.element(page.getByText('Health · 8 times a day')).toBeVisible();
		await expect.element(page.getByText('At risk: log a missed day')).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Add one' })).toBeVisible();
		await expect.element(page.getByRole('status', { name: 'Count' })).toHaveTextContent('3');
		expect(page.getByRole('button', { name: 'Done that day' }).elements()).toHaveLength(0);
		await expect
			.element(page.getByRole('list', { name: 'History' }))
			.toHaveTextContent(/Tue 203\s*Mon 190/);
	});

	it('shows a toggle for days habits', async () => {
		render(HabitSheet, { data: { ...data, countMode: 'days', count: 0 } });
		const toggle = page.getByRole('button', { name: 'Done that day' });
		await expect.element(toggle).toHaveAttribute('aria-pressed', 'false');
		expect(page.getByRole('button', { name: 'Add one' }).elements()).toHaveLength(0);
	});

	it('labels the days and marks the selected one', async () => {
		render(HabitSheet, { data: { ...data, day: '2026-10-19' } });
		const days = page.getByRole('navigation', { name: 'Day' }).getByRole('link');
		expect(days.elements().map((a) => a.textContent?.trim())).toEqual([
			'Today',
			'Yesterday',
			'Sunday',
			'Saturday'
		]);
		await expect.element(days.nth(1)).toHaveAttribute('aria-current', 'date');
	});
});
