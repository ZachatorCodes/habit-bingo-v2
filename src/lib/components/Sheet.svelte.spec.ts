import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';
import Sheet from './Sheet.svelte';

const body = createRawSnippet(() => ({ render: () => '<p>Sheet body</p>' }));

describe('Sheet', () => {
	it('opens as a modal dialog named by its title', async () => {
		render(Sheet, { title: 'Go biking', onclose: () => {}, children: body });
		const dialog = page.getByRole('dialog', { name: 'Go biking' });
		await expect.element(dialog).toBeVisible();
		expect(dialog.element().hasAttribute('open')).toBe(true);
		await expect.element(page.getByText('Sheet body')).toBeVisible();
	});

	it('closes with the Close button and with Escape', async () => {
		const onclose = vi.fn();
		render(Sheet, { title: 'Go biking', onclose, children: body });
		await page.getByRole('button', { name: 'Close' }).click();
		expect(onclose).toHaveBeenCalledTimes(1);
		await userEvent.keyboard('{Escape}');
		expect(onclose).toHaveBeenCalledTimes(2);
	});

	it('returns focus to what opened it', async () => {
		const opener = document.createElement('button');
		opener.textContent = 'Opener';
		document.body.append(opener);
		opener.focus();
		const screen = render(Sheet, { title: 'Go biking', onclose: () => {}, children: body });
		await expect.element(page.getByRole('dialog')).toBeVisible();
		screen.unmount();
		expect(document.activeElement).toBe(opener);
		opener.remove();
	});
});
