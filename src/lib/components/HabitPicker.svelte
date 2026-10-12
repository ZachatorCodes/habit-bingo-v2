<script lang="ts">
	import { CATEGORIES } from '#lib/game/categories.ts';
	import { describeRule } from '#lib/game/habit-rules.ts';
	import type { Habit } from '#lib/server/habits.ts';

	type Props = { habits: Habit[]; selected: string[]; need: number };
	let { habits, selected = $bindable(), need }: Props = $props();

	const groups = $derived(
		CATEGORIES.map((category) => ({
			category,
			habits: habits.filter((habit) => habit.category === category.id)
		})).filter((group) => group.habits.length > 0)
	);
</script>

<div class="flex flex-col gap-5">
	<p aria-live="polite" class="font-extrabold">{selected.length} of {need} picked</p>
	{#each groups as group (group.category.id)}
		<fieldset class="flex flex-col gap-2">
			<legend class="mb-1.5 text-lg font-black">
				<span aria-hidden="true">{group.category.emoji}</span>
				{group.category.label}
			</legend>
			{#each group.habits as habit (habit.id)}
				<label
					class="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-line bg-white p-3 shadow-[0_3px_0_var(--color-line)] has-[:checked]:border-ink has-[:checked]:bg-cream has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink"
				>
					<input
						type="checkbox"
						name="habitIds"
						value={habit.id}
						bind:group={selected}
						class="size-5 accent-ink"
					/>
					<span aria-hidden="true" class="text-2xl leading-none">{habit.emoji}</span>
					<span class="min-w-0 flex-1">
						<span class="block font-extrabold">{habit.name}</span>
						<span class="block text-sm text-ink/75">{describeRule(habit)}</span>
					</span>
				</label>
			{/each}
		</fieldset>
	{/each}
</div>
