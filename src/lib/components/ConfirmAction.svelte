<script lang="ts">
	import { onMount } from 'svelte';

	/**
	 * A destructive form post. With JavaScript it confirms in a dialog first; without it the button
	 * posts the form directly.
	 */
	type Props = {
		action: string;
		label: string;
		ariaLabel?: string;
		title: string;
		text: string;
		confirm: string;
		/** Extra hidden form fields. */
		fields?: Record<string, string>;
	};
	let { action, label, ariaLabel, title, text, confirm, fields = {} }: Props = $props();

	let hydrated = $state(false);
	onMount(() => (hydrated = true));
	let dialog = $state<HTMLDialogElement>();
	const dialogTitle = $props.id();
	const buttonClass =
		'rounded-xl border-2 border-line bg-white px-3 py-1.5 font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink';
</script>

{#snippet hidden()}
	{#each Object.entries(fields) as [name, value] (name)}
		<input type="hidden" {name} {value} />
	{/each}
{/snippet}

{#if hydrated}
	<button
		type="button"
		aria-label={ariaLabel}
		onclick={() => dialog?.showModal()}
		class={buttonClass}>{label}</button
	>
	<dialog
		bind:this={dialog}
		aria-labelledby={dialogTitle}
		class="m-auto max-w-sm rounded-2xl border-2 border-ink bg-white p-5 text-ink shadow-[0_4px_0_var(--color-ink)] backdrop:bg-ink/40"
	>
		<h2 id={dialogTitle} class="text-xl font-black">{title}</h2>
		<p class="mt-2 text-ink/75">{text}</p>
		<form method="POST" {action} class="mt-5 flex flex-wrap justify-end gap-3">
			{@render hidden()}
			<button
				type="button"
				onclick={() => dialog?.close()}
				class="rounded-xl px-3 py-1.5 font-bold underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
				>Cancel</button
			>
			<button
				type="submit"
				class="rounded-xl border-2 border-ink bg-risk px-3 py-1.5 font-extrabold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
				>{confirm}</button
			>
		</form>
	</dialog>
{:else}
	<form method="POST" {action}>
		{@render hidden()}
		<button type="submit" aria-label={ariaLabel} class={buttonClass}>{label}</button>
	</form>
{/if}
