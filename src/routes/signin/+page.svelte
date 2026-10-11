<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '#lib/components/Button.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const errors = $derived(form?.errors ?? {});
</script>

<Seo
	title="Sign in"
	description="Sign in to Habit Bingo to check in on today's habits."
	path="/signin"
	noindex
/>

<section class="mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
	<div>
		<h1 class="text-3xl leading-tight font-black">Welcome back</h1>
		<p class="mt-2 text-lg text-ink/75">Sign in to check in on today's habits.</p>
	</div>

	{#if data.googleEnabled}
		<!-- The Google action is wired in Task 7. -->
		<form method="POST" action="?/google">
			<input type="hidden" name="next" value={data.next} />
			<Button type="submit" variant="secondary" class="w-full">Continue with Google</Button>
		</form>
		<p class="text-center font-bold text-ink/75">or</p>
	{/if}

	<form
		method="POST"
		action="?/signin"
		class="flex flex-col gap-4 rounded-2xl border-2 border-line bg-white p-5 shadow-[0_3px_0_var(--color-line)]"
		use:enhance={({ formElement }) =>
			async ({ update }) => {
				await update();
				formElement.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')?.focus();
			}}
	>
		<!-- The form action replaces the query string, so ?next= travels in the body. -->
		<input type="hidden" name="next" value={data.next} />
		{#if errors.form}
			<p role="alert" tabindex="-1" class="rounded-xl bg-risk px-4 py-3 font-bold text-ink">
				<span aria-hidden="true">⚠</span>
				{errors.form}
			</p>
		{/if}
		<TextField
			label="Username"
			name="username"
			autocomplete="username"
			value={form?.values?.username}
			error={errors.username}
		/>
		<TextField
			label="Password"
			name="password"
			type="password"
			autocomplete="current-password"
			error={errors.password}
		/>
		<Button type="submit" class="mt-2 w-full">Sign in</Button>
	</form>

	<p class="text-center text-ink/75">Forgot your password? Ask an admin for a reset link.</p>
</section>
