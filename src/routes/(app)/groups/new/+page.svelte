<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Button from '#lib/components/Button.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	const errors = $derived<Record<string, string>>(form?.errors ?? {});
</script>

<Seo title="Create a group" description="Start a Habit Bingo group." path="/groups/new" noindex />

<section class="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
	<a href={resolve('/(app)/groups')} class="font-bold underline-offset-4 hover:underline"
		><span aria-hidden="true">←</span> Groups</a
	>
	<h1 class="text-3xl leading-tight font-black">Create a group</h1>

	<form
		method="POST"
		novalidate
		class="rounded-2xl border-2 border-line bg-white p-5 shadow-[0_3px_0_var(--color-line)]"
		use:enhance={({ formElement }) =>
			async ({ update }) => {
				await update({ reset: false });
				formElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
			}}
	>
		<div class="flex items-end gap-3" data-field-row>
			<div class="w-16 shrink-0">
				<TextField
					label="Emoji"
					name="emoji"
					value={form?.values?.emoji}
					error={errors.emoji}
					inputClass="h-12 px-0 text-center text-2xl leading-6"
				/>
			</div>
			<div class="min-w-0 flex-1">
				<TextField label="Name" name="name" value={form?.values?.name} error={errors.name} />
			</div>
		</div>
		<Button type="submit" class="mt-5 w-full">Create group</Button>
	</form>
</section>
