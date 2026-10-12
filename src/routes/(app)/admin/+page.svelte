<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import Button from '#lib/components/Button.svelte';
	import CopyField from '#lib/components/CopyField.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	type Section = 'invite' | 'reset';

	const errorsFor = (section: Section): Record<string, string> =>
		form?.section === section && 'errors' in form ? (form.errors ?? {}) : {};
	const valuesFor = (section: Section): Record<string, string> =>
		form?.section === section && 'values' in form ? (form.values ?? {}) : {};

	const inviteErrors = $derived(errorsFor('invite'));
	const resetErrors = $derived(errorsFor('reset'));
	const inviteLink = $derived(form && 'inviteLink' in form ? form.inviteLink : undefined);
	const reset = $derived(
		form && 'resetLink' in form && form.resetLink
			? { link: form.resetLink, username: form.resetUsername ?? '' }
			: undefined
	);

	const statusLabels = { valid: 'Active', expired: 'Expired', usedUp: 'Used up' } as const;

	/** Moves focus to the first problem or the new link, so it is announced. */
	const focusResult: SubmitFunction =
		({ formElement }) =>
		async ({ update }) => {
			await update({ reset: false });
			formElement
				.closest('section')
				?.querySelector<HTMLElement>('[aria-invalid="true"], [data-result] input')
				?.focus();
		};

	const card =
		'flex flex-col gap-4 rounded-2xl border-2 border-line bg-white p-5 shadow-[0_3px_0_var(--color-line)]';
</script>

<!-- The (app) layout supplies the noindex Seo tags. -->

<section class="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10">
	<div>
		<h1 class="text-3xl leading-tight font-black">Admin</h1>
		<p class="mt-2 text-lg text-ink/75">Invite people and help them back into their accounts.</p>
	</div>

	<section aria-labelledby="invites-heading" class="flex flex-col gap-3">
		<h2 id="invites-heading" class="text-xl font-black">Invites</h2>
		<form method="POST" action="?/createInvite" novalidate class={card} use:enhance={focusResult}>
			<div class="grid gap-4 sm:grid-cols-2">
				<TextField
					label="Expires in (days)"
					name="expiresInDays"
					type="number"
					min={data.limits.expiresInDays.min}
					max={data.limits.expiresInDays.max}
					hint="1 to 30 days."
					value={valuesFor('invite').expiresInDays ?? data.limits.expiresInDays.default}
					error={inviteErrors.expiresInDays}
				/>
				<TextField
					label="Max uses"
					name="maxUses"
					type="number"
					min={data.limits.maxUses.min}
					max={data.limits.maxUses.max}
					hint="1 to 50 people."
					value={valuesFor('invite').maxUses ?? data.limits.maxUses.default}
					error={inviteErrors.maxUses}
				/>
			</div>
			<Button type="submit" class="self-start">Create invite</Button>
			{#if inviteLink}
				<div data-result class="flex flex-col gap-2 rounded-xl bg-earn/40 p-4">
					<CopyField label="New invite link" value={inviteLink} copyLabel="Copy invite link" />
				</div>
			{/if}
		</form>

		{#if data.invites.length > 0}
			<div class="overflow-x-auto rounded-2xl border-2 border-line bg-white">
				<table class="w-full text-left text-sm">
					<caption class="sr-only">Invites</caption>
					<thead class="border-b-2 border-line">
						<tr>
							<th scope="col" class="px-4 py-2 font-extrabold">Code</th>
							<th scope="col" class="px-4 py-2 font-extrabold">Status</th>
							<th scope="col" class="px-4 py-2 font-extrabold">Uses</th>
							<th scope="col" class="px-4 py-2 font-extrabold">Expires</th>
						</tr>
					</thead>
					<tbody>
						{#each data.invites as invite (invite.code)}
							<tr class="border-b border-line/60 last:border-0">
								<th scope="row" class="px-4 py-2 font-mono font-normal">{invite.code}</th>
								<td class="px-4 py-2 font-bold">
									<span aria-hidden="true">{invite.status === 'valid' ? '●' : '○'}</span>
									{statusLabels[invite.status]}
								</td>
								<td class="px-4 py-2">{invite.uses} of {invite.maxUses}</td>
								<td class="px-4 py-2">{invite.expires}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="text-ink/75">No invites yet.</p>
		{/if}
	</section>

	<section aria-labelledby="reset-heading" class="flex flex-col gap-3">
		<h2 id="reset-heading" class="text-xl font-black">Reset a password</h2>
		<form method="POST" action="?/resetLink" class={card} use:enhance={focusResult}>
			<TextField
				label="Username"
				name="username"
				autocomplete="off"
				hint="The person who is locked out."
				value={valuesFor('reset').username}
				error={resetErrors.username}
			/>
			<Button type="submit" class="self-start">Create reset link</Button>
			{#if reset}
				<div data-result class="flex flex-col gap-2 rounded-xl bg-earn/40 p-4">
					<CopyField label="Reset link" value={reset.link} copyLabel="Copy reset link" />
					<p class="font-bold">Send this link to them yourself. It works once, for 24 hours.</p>
					<p class="text-sm text-ink/75">
						For @{reset.username}. It won't be shown again. Using it signs them out everywhere.
					</p>
				</div>
			{/if}
		</form>
	</section>
</section>
