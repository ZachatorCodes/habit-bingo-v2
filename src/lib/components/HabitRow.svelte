<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { describeRule } from '#lib/game/habit-rules.ts';
	import type { Habit } from '#lib/server/habits.ts';

	type Props = { habit: Habit; archived?: boolean };
	let { habit, archived = false }: Props = $props();

	const action = $derived(archived ? 'restore' : 'archive');
	const actionLabel = $derived(archived ? 'Restore' : 'Archive');
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
	<form method="POST" action={`?/${action}`} use:enhance>
		<input type="hidden" name="id" value={habit.id} />
		<button
			type="submit"
			aria-label={`${actionLabel} ${habit.name}`}
			class="rounded-xl border-2 border-line bg-white px-3 py-1.5 font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
			>{actionLabel}</button
		>
	</form>
</li>
