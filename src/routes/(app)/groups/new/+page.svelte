<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Button from '#lib/components/Button.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import IconPicker from '#lib/components/IconPicker.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	// svelte-ignore state_referenced_locally
	let icon = $state(form?.values?.icon || 'users-three');
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
		<div class="flex flex-col gap-5">
			<TextField label="Name" name="name" value={form?.values?.name} error={errors.name} />
			<IconPicker name="icon" groups bind:value={icon} error={errors.icon} />
		</div>
		<Button type="submit" class="mt-5 w-full">Create group</Button>
	</form>
</section>
