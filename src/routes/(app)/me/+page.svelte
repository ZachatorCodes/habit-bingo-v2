<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import Button from '#lib/components/Button.svelte';
	import EmojiPicker from '#lib/components/EmojiPicker.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	type Section = 'profile' | 'settings' | 'password' | 'methods' | 'delete';

	const errorsFor = (section: Section): Record<string, string> =>
		form?.section === section && 'errors' in form ? (form.errors ?? {}) : {};
	const valuesFor = (section: Section): Record<string, string> =>
		form?.section === section && 'values' in form ? (form.values ?? {}) : {};
	const savedIn = (section: Section) => form?.section === section && 'saved' in form;

	const profileErrors = $derived(errorsFor('profile'));
	const settingsErrors = $derived(errorsFor('settings'));
	const passwordErrors = $derived(errorsFor('password'));
	const methodErrors = $derived(errorsFor('methods'));
	const deleteErrors = $derived(errorsFor('delete'));

	// svelte-ignore state_referenced_locally
	let avatar = $state(data.profile.avatarEmoji);
	// svelte-ignore state_referenced_locally
	let timezone = $state(data.settings.timezone);
	// svelte-ignore state_referenced_locally
	let weekStartsOn = $state(data.settings.weekStartsOn);

	/**
	 * Applies the result, then moves focus to the first problem or the confirmation, so it is
	 * announced. Password forms are cleared afterwards; passwords never come back from the server.
	 */
	const focusResult =
		(reset: boolean): SubmitFunction =>
		({ formElement }) =>
		async ({ update }) => {
			await update({ reset });
			formElement
				.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"], [role="status"]')
				?.focus();
		};

	const card =
		'flex flex-col gap-4 rounded-2xl border-2 border-line bg-white p-5 shadow-[0_3px_0_var(--color-line)]';
	const select =
		'w-full rounded-2xl border-2 border-line bg-white px-4 py-2.5 text-ink shadow-[0_3px_0_var(--color-line)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink';
</script>

{#snippet saved(message: string)}
	<p role="status" tabindex="-1" class="rounded-xl bg-earn px-4 py-3 font-bold text-ink">
		<span aria-hidden="true">✓</span>
		{message}
	</p>
{/snippet}

{#snippet problem(message: string | undefined)}
	{#if message}
		<p role="alert" tabindex="-1" class="rounded-xl bg-risk px-4 py-3 font-bold text-ink">
			<span aria-hidden="true">⚠</span>
			{message}
		</p>
	{/if}
{/snippet}

<section class="mx-auto flex max-w-xl flex-col gap-8 px-4 py-10">
	<div>
		<h1 class="text-3xl leading-tight font-black">Me</h1>
		<p class="mt-2 text-lg text-ink/75">Your profile, settings and sign-in.</p>
	</div>

	<section aria-labelledby="profile-heading" class="flex flex-col gap-3">
		<h2 id="profile-heading" class="text-xl font-black">Profile</h2>
		<form method="POST" action="?/profile" class={card} use:enhance={focusResult(false)}>
			{#if savedIn('profile')}{@render saved('Profile saved.')}{/if}
			<div class="flex flex-col gap-1.5">
				<span class="font-extrabold">Username</span>
				<p class="text-lg font-bold">@{data.profile.displayUsername}</p>
				<p class="text-sm text-ink/75">Your username can't be changed.</p>
			</div>
			<TextField
				label="Display name"
				name="name"
				autocomplete="nickname"
				hint="How your friends will see you."
				value={valuesFor('profile').name ?? data.profile.name}
				error={profileErrors.name}
			/>
			<div>
				<EmojiPicker name="avatarEmoji" bind:value={avatar} options={data.avatars} label="Avatar" />
				{#if profileErrors.avatarEmoji}
					<p class="mt-1.5 text-sm font-bold text-ink">
						<span aria-hidden="true">⚠</span>
						{profileErrors.avatarEmoji}
					</p>
				{/if}
			</div>
			<Button type="submit" class="self-start">Save profile</Button>
		</form>
	</section>

	<section aria-labelledby="settings-heading" class="flex flex-col gap-3">
		<h2 id="settings-heading" class="text-xl font-black">Settings</h2>
		<form method="POST" action="?/settings" class={card} use:enhance={focusResult(false)}>
			{#if savedIn('settings')}{@render saved('Settings saved.')}{/if}
			<div class="flex flex-col gap-1.5">
				<label for="timezone" class="font-extrabold">Timezone</label>
				<select
					id="timezone"
					name="timezone"
					bind:value={timezone}
					aria-invalid={settingsErrors.timezone ? 'true' : undefined}
					aria-describedby={settingsErrors.timezone ? 'timezone-error' : undefined}
					class={select}
				>
					{#each data.timezones as zone (zone)}
						<option value={zone}>{zone.replaceAll('_', ' ')}</option>
					{/each}
				</select>
				{#if settingsErrors.timezone}
					<p id="timezone-error" class="text-sm font-bold text-ink">
						<span aria-hidden="true">⚠</span>
						{settingsErrors.timezone}
					</p>
				{/if}
			</div>
			<div
				role="radiogroup"
				aria-labelledby="week-start-label"
				aria-describedby={['week-start-hint', settingsErrors.weekStartsOn && 'week-start-error']
					.filter(Boolean)
					.join(' ')}
				class="flex flex-col gap-1.5"
			>
				<span id="week-start-label" class="font-extrabold">Week starts on</span>
				<p id="week-start-hint" class="text-sm text-ink/75">Applies from your next card.</p>
				<div class="flex gap-3">
					{#each [{ value: 'monday', label: 'Monday' }, { value: 'sunday', label: 'Sunday' }] as option (option.value)}
						<label
							class="flex cursor-pointer items-center gap-2 rounded-2xl border-2 border-line bg-white px-4 py-2 font-bold has-checked:border-ink has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink"
						>
							<input
								type="radio"
								name="weekStartsOn"
								value={option.value}
								bind:group={weekStartsOn}
								class="size-4 accent-ink"
							/>
							{option.label}
						</label>
					{/each}
				</div>
				{#if settingsErrors.weekStartsOn}
					<p id="week-start-error" class="text-sm font-bold text-ink">
						<span aria-hidden="true">⚠</span>
						{settingsErrors.weekStartsOn}
					</p>
				{/if}
			</div>
			<Button type="submit" class="self-start">Save settings</Button>
		</form>
	</section>

	<section aria-labelledby="password-heading" class="flex flex-col gap-3">
		<h2 id="password-heading" class="text-xl font-black">Password</h2>
		{#if data.methods.password}
			<form method="POST" action="?/changePassword" class={card} use:enhance={focusResult(true)}>
				{#if savedIn('password')}
					{@render saved('Password changed. Other devices are signed out.')}
				{/if}
				{@render problem(passwordErrors.form)}
				<TextField
					label="Current password"
					name="currentPassword"
					type="password"
					autocomplete="current-password"
					error={passwordErrors.currentPassword}
				/>
				<TextField
					label="New password"
					name="newPassword"
					type="password"
					autocomplete="new-password"
					hint="At least 10 characters. Changing it signs out your other devices."
					error={passwordErrors.newPassword}
				/>
				<Button type="submit" class="self-start">Change password</Button>
			</form>
		{:else}
			<form method="POST" action="?/setPassword" class={card} use:enhance={focusResult(true)}>
				{#if savedIn('password')}
					{@render saved('Password set. You can now sign in with your username.')}
				{/if}
				<p class="text-ink/75">Add a password so you can sign in with your username too.</p>
				<TextField
					label="New password"
					name="newPassword"
					type="password"
					autocomplete="new-password"
					hint="At least 10 characters."
					error={passwordErrors.newPassword}
				/>
				<Button type="submit" class="self-start">Set password</Button>
			</form>
		{/if}
	</section>

	{#if data.googleEnabled}
		<section aria-labelledby="methods-heading" class="flex flex-col gap-3">
			<h2 id="methods-heading" class="text-xl font-black">Sign-in methods</h2>
			<div class={card}>
				{#if savedIn('methods')}{@render saved('Google is unlinked.')}{/if}
				{@render problem(methodErrors.google ?? data.googleLinkError ?? undefined)}
				<div class="flex flex-wrap items-center justify-between gap-3">
					<p>
						<span class="font-extrabold">Password:</span>
						{data.methods.password ? 'set' : 'not set'}
					</p>
				</div>
				<div class="flex flex-wrap items-center justify-between gap-3">
					<p>
						<span class="font-extrabold">Google:</span>
						{data.methods.google ? 'linked' : 'not linked'}
					</p>
					{#if data.methods.google}
						<form method="POST" action="?/unlinkGoogle" use:enhance={focusResult(false)}>
							<Button type="submit" variant="secondary">Unlink Google</Button>
						</form>
					{:else}
						<!-- Not enhanced: it leaves for Google's sign-in page. -->
						<form method="POST" action="?/linkGoogle">
							<Button type="submit" variant="secondary">Link Google</Button>
						</form>
					{/if}
				</div>
			</div>
		</section>
	{/if}

	<section aria-labelledby="everywhere-heading" class="flex flex-col gap-3">
		<h2 id="everywhere-heading" class="text-xl font-black">Sign out everywhere</h2>
		<form method="POST" action="?/signOutEverywhere" class={card} use:enhance>
			<p class="text-ink/75">
				Lost a phone or used a shared computer? This signs you out on every device, including this
				one.
			</p>
			<Button type="submit" variant="secondary" class="self-start">Sign out everywhere</Button>
		</form>
	</section>

	<section aria-labelledby="delete-heading" class="flex flex-col gap-3">
		<h2 id="delete-heading" class="text-xl font-black">Delete account</h2>
		<form method="POST" action="?/deleteAccount" class={card} use:enhance={focusResult(true)}>
			<p class="text-ink/75">
				This deletes your account and everything in it, for good. It can't be undone.
			</p>
			<TextField
				label="Type your username to confirm"
				name="confirmUsername"
				autocomplete="off"
				hint={`Your username is @${data.profile.displayUsername}.`}
				error={deleteErrors.confirmUsername}
			/>
			<Button type="submit" class="self-start">Delete my account</Button>
		</form>
	</section>
</section>
