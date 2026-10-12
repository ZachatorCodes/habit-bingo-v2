import { page, userEvent } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import EmojiPicker from './EmojiPicker.svelte';

const options = ['🙂', '😎', '🤓'] as const;

describe('EmojiPicker', () => {
	it('is a radiogroup with one radio per emoji, labelled by the emoji', async () => {
		render(EmojiPicker, { name: 'avatarEmoji', value: '😎', options, label: 'Avatar' });
		await expect.element(page.getByRole('radiogroup', { name: 'Avatar' })).toBeVisible();
		for (const emoji of options) {
			await expect.element(page.getByRole('radio', { name: emoji })).toBeInTheDocument();
		}
		await expect.element(page.getByRole('radio', { name: '😎' })).toBeChecked();
		await expect.element(page.getByRole('radio', { name: '🙂' })).not.toBeChecked();
	});

	it('submits the chosen emoji under its name', async () => {
		render(EmojiPicker, { name: 'avatarEmoji', value: '🙂', options, label: 'Avatar' });
		await page.getByRole('radio', { name: '🤓' }).click();
		const input = page.getByRole('radio', { name: '🤓' }).element() as HTMLInputElement;
		expect(input.name).toBe('avatarEmoji');
		expect(input.value).toBe('🤓');
		expect(input.checked).toBe(true);
	});

	it('moves the choice with the arrow keys', async () => {
		render(EmojiPicker, { name: 'avatarEmoji', value: '🙂', options, label: 'Avatar' });
		(page.getByRole('radio', { name: '🙂' }).element() as HTMLElement).focus();
		await userEvent.keyboard('{ArrowRight}');
		await expect.element(page.getByRole('radio', { name: '😎' })).toBeChecked();
		await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
		await expect.element(page.getByRole('radio', { name: '🤓' })).toBeChecked();
	});

	it('marks the group invalid and links the error when one is given', async () => {
		render(EmojiPicker, {
			name: 'avatarEmoji',
			value: '',
			options,
			label: 'Avatar',
			error: 'Pick an avatar.'
		});
		const group = page.getByRole('radiogroup', { name: 'Avatar' });
		await expect.element(group).toHaveAttribute('aria-invalid', 'true');
		await expect.element(group).toHaveAccessibleDescription(/Pick an avatar./);
	});

	it('has no error state without an error', async () => {
		render(EmojiPicker, { name: 'avatarEmoji', value: '🙂', options, label: 'Avatar' });
		await expect
			.element(page.getByRole('radiogroup', { name: 'Avatar' }))
			.not.toHaveAttribute('aria-invalid');
	});
});
