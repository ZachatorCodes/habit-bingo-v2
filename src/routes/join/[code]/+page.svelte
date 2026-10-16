<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Button from '#lib/components/Button.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import type { PageProps } from './$types';

	let { data, form, params }: PageProps = $props();

	const deadInviteMessages = {
		expired: 'This invite has expired.',
		usedUp: 'This invite has already been used.',
		notFound: "We couldn't find that invite."
	};

	const errors = $derived(form?.errors ?? {});
</script>

<Seo
	title="Join Habit Bingo"
	description="You've been invited to Habit Bingo. Create your account to start your first card."
	path={`/join/${encodeURIComponent(params.code)}`}
	noindex
/>

<section class="mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
	{#if data.status === 'group'}
		<div
			class="rounded-2xl border-2 border-line bg-white p-6 text-center shadow-[0_3px_0_var(--color-line)]"
		>
			<div class="text-5xl" aria-hidden="true">{data.group.emoji}</div>
			{#if data.member}
				<h1 class="mt-2 text-2xl font-black">You're already in {data.group.name}.</h1>
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- the /groups/[id] route lands in the next task, so resolve() cannot type it yet -->
				<Button href={`/groups/${data.group.id}`} class="mt-6">Open {data.group.name}</Button>
			{:else}
				<h1 class="mt-2 text-2xl font-black">Join {data.group.name}</h1>
				<p class="mt-2 text-ink/75">
					{data.memberCount}
					{data.memberCount === 1 ? 'member' : 'members'}
				</p>
				{#if form?.message}
					<p role="alert" class="mt-4 rounded-xl bg-risk px-4 py-3 font-bold text-ink">
						<span aria-hidden="true">⚠</span>
						{form.message}
					</p>
				{/if}
				<form method="POST" action="?/join" use:enhance>
					<Button type="submit" class="mt-6">Join</Button>
				</form>
			{/if}
		</div>
	{:else if data.status === 'valid'}
		<div>
			<h1 class="text-3xl leading-tight font-black">You're invited to Habit Bingo</h1>
			<p class="mt-2 text-lg text-ink/75">Pick a username your friends will recognize.</p>
		</div>

		{#if data.googleEnabled}
			<form method="POST" action="?/google">
				<Button type="submit" variant="secondary" class="w-full">Continue with Google</Button>
			</form>
			<p class="text-center font-bold text-ink/75">or</p>
		{/if}

		<form
			method="POST"
			action="?/signup"
			class="flex flex-col gap-4 rounded-2xl border-2 border-line bg-white p-5 shadow-[0_3px_0_var(--color-line)]"
			use:enhance={({ formElement }) =>
				async ({ update }) => {
					await update();
					formElement.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')?.focus();
				}}
		>
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
				hint="3–20 letters, numbers or underscores."
				value={form?.values?.username}
				error={errors.username}
			/>
			<TextField
				label="Display name"
				name="name"
				autocomplete="nickname"
				hint="How your friends will see you."
				value={form?.values?.name}
				error={errors.name}
			/>
			<TextField
				label="Password"
				name="password"
				type="password"
				autocomplete="new-password"
				hint="At least 10 characters."
				error={errors.password}
			/>
			<Button type="submit" class="mt-2 w-full">Create account</Button>
		</form>

		<p class="text-center text-ink/75">
			Already have an account?
			<!-- eslint-disable svelte/no-navigation-without-resolve -- resolve() cannot carry the ?next= query -->
			<a
				class="font-bold underline"
				href={`/signin?next=${encodeURIComponent(`/join/${params.code}`)}`}>Sign in</a
			>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		</p>
	{:else}
		<div
			class="rounded-2xl border-2 border-line bg-white p-6 text-center shadow-[0_3px_0_var(--color-line)]"
		>
			<div class="text-4xl" aria-hidden="true">💌</div>
			<h1 class="mt-2 text-2xl font-black">
				{data.status === 'groupDead' ? data.message : deadInviteMessages[data.status]}
			</h1>
			<p class="mt-2 text-ink/75">Ask the friend who invited you for a fresh link.</p>
			<Button href={resolve('/')} variant="secondary" class="mt-6">Go to the home page</Button>
		</div>
	{/if}
</section>
