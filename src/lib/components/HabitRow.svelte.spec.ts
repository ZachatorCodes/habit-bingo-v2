import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { Habit } from '#lib/server/habits.ts';
import HabitRow from './HabitRow.svelte';

const bike: Habit = {
	id: 'h1',
	icon: 'bicycle',
	name: 'Bike',
	category: 'fitness',
	direction: 'atLeast',
	period: 'month',
	countMode: 'times',
	target: 3,
	isPrivate: false,
	archivedAt: null
};

describe('HabitRow', () => {
	it('shows the icon, name and rule sentence', async () => {
		const { container } = render(HabitRow, { habit: bike });
		expect(container.querySelector('svg')).not.toBeNull();
		await expect.element(page.getByText('Bike', { exact: true })).toBeInTheDocument();
		await expect.element(page.getByText('3 times a month')).toBeInTheDocument();
		await expect
			.element(page.getByRole('link', { name: 'Edit Bike' }))
			.toHaveAttribute('href', '/me/habits/h1');
		await expect.element(page.getByRole('button', { name: 'Archive Bike' })).toBeInTheDocument();
	});

	it('marks private habits with a lock and text, not color alone', async () => {
		const { container } = render(HabitRow, { habit: { ...bike, isPrivate: true } });
		await expect.element(page.getByText('Private')).toBeInTheDocument();
		expect(container.querySelectorAll('svg').length).toBe(2);
	});

	it('offers Restore instead of Archive for archived habits', async () => {
		render(HabitRow, { habit: { ...bike, archivedAt: new Date() }, archived: true });
		await expect.element(page.getByRole('button', { name: 'Restore Bike' })).toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: 'Archive Bike' }))
			.not.toBeInTheDocument();
	});
});
