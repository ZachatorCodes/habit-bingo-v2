<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import Button from '#lib/components/Button.svelte';
	import EmojiPicker from '#lib/components/EmojiPicker.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const errors = $derived(form?.errors ?? {});

	// The server defaults (UTC, Monday) apply without JavaScript; the browser knows better.
	let timezone = $state('UTC');
	let weekStartsOn = $state('monday');
	// svelte-ignore state_referenced_locally
	let avatar = $state(form?.values?.avatarEmoji || data.avatarEmoji);

	onMount(() => {
		timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
		const locale = new Intl.Locale(navigator.language) as Intl.Locale & {
			weekInfo?: { firstDay: number };
			getWeekInfo?: () => { firstDay: number };
		};
		const firstDay = (locale.getWeekInfo?.() ?? locale.weekInfo)?.firstDay;
		weekStartsOn = firstDay === 7 ? 'sunday' : 'monday';
	});
</script>

<Seo
	title="Welcome"
	description="Finish setting up your Habit Bingo account."
	path="/onboarding"
	noindex
/>

<section class="mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
	<div>
		<h1 class="text-3xl leading-tight font-black">Welcome to Habit Bingo</h1>
		<p class="mt-2 text-lg text-ink/75">A few quick things so your card feels like yours.</p>
	</div>

	<form
		method="POST"
		class="flex flex-col gap-5 rounded-2xl border-2 border-line bg-white p-5 shadow-[0_3px_0_var(--color-line)]"
		use:enhance={({ formElement }) =>
			async ({ update }) => {
				await update({ reset: false });
				formElement.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')?.focus();
			}}
	>
		{#if errors.form || errors.timezone || errors.weekStartsOn}
			<p role="alert" tabindex="-1" class="rounded-xl bg-risk px-4 py-3 font-bold text-ink">
				<span aria-hidden="true">⚠</span>
				{errors.form ?? errors.timezone ?? errors.weekStartsOn}
			</p>
		{/if}
		{#if data.needsUsername}
			<TextField
				label="Username"
				name="username"
				autocomplete="username"
				hint="3–20 letters, numbers or underscores."
				value={form?.values?.username}
				error={errors.username}
			/>
		{/if}
		<TextField
			label="Display name"
			name="name"
			autocomplete="nickname"
			hint="How your friends will see you."
			value={form?.values?.name ?? data.name}
			error={errors.name}
		/>
		<EmojiPicker
			name="avatarEmoji"
			bind:value={avatar}
			options={data.avatars}
			label="Avatar"
			error={errors.avatarEmoji}
		/>
		<input type="hidden" name="timezone" value={timezone} />
		<input type="hidden" name="weekStartsOn" value={weekStartsOn} />
		<Button type="submit" class="mt-2 w-full">Let's go</Button>
	</form>
</section>
