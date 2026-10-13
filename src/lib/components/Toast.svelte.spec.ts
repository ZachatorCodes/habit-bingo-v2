import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Toast from './Toast.svelte';

describe('Toast', () => {
	it('announces the message politely, then hides it', async () => {
		render(Toast, { message: "Couldn't save that. Try again.", duration: 100 });
		const status = page.getByRole('status');
		await expect.element(status).toHaveTextContent("Couldn't save that. Try again.");
		await expect.poll(() => status.element().textContent?.trim(), { timeout: 2000 }).toBe('');
	});

	it('keeps an empty live region when there is nothing to say', async () => {
		render(Toast, { message: null });
		await expect.element(page.getByRole('status')).toBeInTheDocument();
		await expect.element(page.getByRole('status')).toHaveTextContent('');
	});
});
