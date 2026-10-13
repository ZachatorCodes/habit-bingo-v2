<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { describeRule } from '#lib/game/habit-rules.ts';
	import type { Habit } from '#lib/server/habits.ts';

	type Props = {
		habit: Habit;
		archived?: boolean;
		/**
		 * The page's own query (e.g. "&category=fitness"), appended to form actions: an action URL
		 * like "?/archive" replaces the query, so without it the page would lose its view after posting.
		 */
		keep?: string;
	};
	let { habit, archived = false, keep = '' }: Props = $props();

	const action = $derived(archived ? 'restore' : 'archive');
	const actionLabel = $derived(archived ? 'Restore' : 'Archive');

	// Deleting confirms in a dialog once JavaScript runs; before that (or without it) the Delete
	// link opens a confirmation page instead.
	let hydrated = $state(false);
	onMount(() => (hydrated = true));
	let dialog = $state<HTMLDialogElement>();
	const deleteClass =
		'rounded-xl px-3 py-1.5 font-bold text-ink/75 underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink';
	const dialogTitle = $props.id();
	const deleteHref = $derived(resolve('/(app)/me/habits/[id]/delete', { id: habit.id }));
</script>

<li
	class="flex items-center gap-3 rounded-2xl border-2 border-line bg-white p-3 shadow-[0_3px_0_var(--color-line)]"
>
	<span aria-hidden="true" class="text-3xl leading-none">{habit.emoji}</span>
	<div class="min-w-0 flex-1">
		<p class="flex flex-wrap items-center gap-2 font-extrabold">
			<span>{habit.name}</span>
			{#if habit.isPrivate}
				<span class="rounded-full bg-cream px-2 py-0.5 text-xs font-bold text-ink">
					<span aria-hidden="true">🔒</span> Private
				</span>
			{/if}
		</p>
		<p class="text-sm text-ink/75">{describeRule(habit)}</p>
	</div>
	{#if !archived}
		<a
			href={resolve('/(app)/me/habits/[id]', { id: habit.id })}
			aria-label={`Edit ${habit.name}`}
			class="rounded-xl px-3 py-1.5 font-bold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
			>Edit</a
		>
	{/if}
	<form method="POST" action={`?/${action}${keep}`} use:enhance>
		<input type="hidden" name="id" value={habit.id} />
		<button
			type="submit"
			aria-label={`${actionLabel} ${habit.name}`}
			class="rounded-xl border-2 border-line bg-white px-3 py-1.5 font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
			>{actionLabel}</button
		>
	</form>
	{#if archived}
		{#if hydrated}
			<button
				type="button"
				aria-label={`Delete ${habit.name}`}
				onclick={() => dialog?.showModal()}
				class={deleteClass}>Delete</button
			>
			<dialog
				bind:this={dialog}
				aria-labelledby={dialogTitle}
				class="m-auto max-w-sm rounded-2xl border-2 border-ink bg-white p-5 text-ink shadow-[0_4px_0_var(--color-ink)] backdrop:bg-ink/40"
			>
				<h2 id={dialogTitle} class="text-xl font-black">Delete {habit.name} forever?</h2>
				<p class="mt-2 text-ink/75">Your cards keep their copy of it. This can't be undone.</p>
				<form method="POST" action={deleteHref} class="mt-5 flex flex-wrap justify-end gap-3">
					<button
						type="button"
						onclick={() => dialog?.close()}
						class="rounded-xl px-3 py-1.5 font-bold underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
						>Cancel</button
					>
					<button
						type="submit"
						class="rounded-xl border-2 border-ink bg-risk px-3 py-1.5 font-extrabold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
						>Delete forever</button
					>
				</form>
			</dialog>
		{:else}
			<a href={deleteHref} aria-label={`Delete ${habit.name}`} class={deleteClass}>Delete</a>
		{/if}
	{/if}
</li>
