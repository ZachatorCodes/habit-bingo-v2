<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	type Props = {
		label: string;
		name: string;
		type?: 'text' | 'password';
		value?: string;
		error?: string;
		autocomplete?: HTMLInputAttributes['autocomplete'];
		hint?: string;
	};

	let { label, name, type = 'text', value = '', error, autocomplete, hint }: Props = $props();

	const id = $props.id();
	const hintId = `${id}-hint`;
	const errorId = `${id}-error`;
	const describedBy = $derived(
		[hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined
	);
</script>

<div class="flex flex-col gap-1.5">
	<label for={id} class="font-extrabold">{label}</label>
	{#if hint}
		<p id={hintId} class="text-sm text-ink/75">{hint}</p>
	{/if}
	<input
		{id}
		{name}
		{type}
		{value}
		{autocomplete}
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={describedBy}
		class={[
			'w-full rounded-2xl border-2 bg-white px-4 py-2.5 text-ink shadow-[0_3px_0_var(--color-line)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink',
			error ? 'border-accent-edge' : 'border-line'
		]}
	/>
	{#if error}
		<p id={errorId} class="text-sm font-bold text-ink">
			<span aria-hidden="true">⚠</span>
			{error}
		</p>
	{/if}
</div>
