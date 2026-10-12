<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Button from '#lib/components/Button.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const problems = {
		expired: 'This reset link has expired.',
		used: 'This reset link has already been used.',
		notFound: "We couldn't find that reset link."
	};

	// A link that died while the form was open (used elsewhere, or expired) wins over the load.
	const status = $derived(form && 'status' in form && form.status ? form.status : data.status);
	const errors = $derived<Record<string, string>>(
		(form && 'errors' in form ? form.errors : undefined) ?? {}
	);
</script>

<svelte:head>
	<meta name="referrer" content="strict-origin" />
</svelte:head>

<!-- The token stays out of the canonical URL. -->
<Seo
	title="Reset your password"
	description="Set a new password for your Habit Bingo account."
	path="/reset"
	noindex
/>

<section class="mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
	{#if status === 'valid'}
		<div>
			<h1 class="text-3xl leading-tight font-black">Choose a new password</h1>
			<p class="mt-2 text-lg text-ink/75">
				This signs you out on every device. Then sign in with the new password.
			</p>
		</div>
		<form
			method="POST"
			class="flex flex-col gap-4 rounded-2xl border-2 border-line bg-white p-5 shadow-[0_3px_0_var(--color-line)]"
			use:enhance={({ formElement }) =>
				async ({ update }) => {
					await update();
					formElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
				}}
		>
			<TextField
				label="New password"
				name="newPassword"
				type="password"
				autocomplete="new-password"
				hint="At least 10 characters."
				error={errors.newPassword}
			/>
			<Button type="submit" class="mt-2 w-full">Set new password</Button>
		</form>
	{:else}
		<div
			class="rounded-2xl border-2 border-line bg-white p-6 text-center shadow-[0_3px_0_var(--color-line)]"
		>
			<div class="text-4xl" aria-hidden="true">🔑</div>
			<h1 class="mt-2 text-2xl font-black">{problems[status]}</h1>
			<p class="mt-2 text-ink/75">Ask an admin for a fresh link.</p>
			<Button href={resolve('/signin')} variant="secondary" class="mt-6">Go to sign in</Button>
		</div>
	{/if}
</section>
