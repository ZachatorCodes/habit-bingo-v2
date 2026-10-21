<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Button from '#lib/components/Button.svelte';
	import Hero from '#lib/components/Hero.svelte';
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

<Hero title="Create a group" summary="Pick a name and an icon, then share the invite link." />

<section class="relative -mt-[18px] rounded-[24px] bg-surface shadow-sheet">
	<div class="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-5">
		<a
			href={resolve('/(app)/groups')}
			class="inline-flex min-h-11 items-center gap-1 font-bold text-forest underline-offset-4 hover:underline"
			><span aria-hidden="true">←</span> Groups</a
		>

		<form
			method="POST"
			novalidate
			class="flex flex-col gap-5"
			use:enhance={({ formElement }) =>
				async ({ update }) => {
					await update({ reset: false });
					formElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
				}}
		>
			<TextField label="Name" name="name" value={form?.values?.name} error={errors.name} />
			<IconPicker name="icon" groups bind:value={icon} error={errors.icon} />
			<Button type="submit" class="w-full">Create group</Button>
		</form>
	</div>
</section>
