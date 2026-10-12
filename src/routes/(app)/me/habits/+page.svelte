<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '#lib/components/Button.svelte';
	import CategoryFilter from '#lib/components/CategoryFilter.svelte';
	import HabitRow from '#lib/components/HabitRow.svelte';
	import StarterHabits from '#lib/components/StarterHabits.svelte';
	import { CATEGORIES } from '#lib/game/categories.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const groups = $derived(
		CATEGORIES.map((category) => ({
			category,
			habits: data.habits.filter((habit) => habit.category === category.id)
		})).filter((group) => group.habits.length > 0)
	);
	const selectedLabel = $derived(CATEGORIES.find((c) => c.id === data.category)?.label);
	/** This view's query, carried through form actions so posting keeps the same view. */
	const keep = $derived(
		[
			data.category ? `category=${data.category}` : '',
			data.archived ? 'archived=1' : '',
			data.welcome ? 'welcome=1' : ''
		]
			.filter(Boolean)
			.map((part) => `&${part}`)
			.join('')
	);
	const toggleQuery = $derived(
		data.archived
			? data.category
				? `?category=${data.category}`
				: ''
			: data.category
				? `?category=${data.category}&archived=1`
				: '?archived=1'
	);
</script>

<section class="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-3xl leading-tight font-black">Habit library</h1>
			<p class="mt-2 text-lg text-ink/75">
				{data.archived
					? 'Archived habits. Restore one to use it again.'
					: 'Everything you can put on a card.'}
			</p>
		</div>
		<Button href="/me/habits/new">New habit</Button>
	</div>

	{#if data.created}
		<p role="status" class="rounded-xl bg-earn px-4 py-3 font-bold text-ink">
			<span aria-hidden="true">✓</span> Habit added.
		</p>
	{:else if data.saved}
		<p role="status" class="rounded-xl bg-earn px-4 py-3 font-bold text-ink">
			<span aria-hidden="true">✓</span> Habit saved.
		</p>
	{/if}
	{#if form && 'message' in form && form.message}
		<p role="alert" class="rounded-xl bg-risk px-4 py-3 font-bold text-ink">
			<span aria-hidden="true">⚠</span>
			{form.message}
		</p>
	{/if}

	{#if data.welcome}
		<div class="rounded-2xl bg-cream p-4">
			<p class="text-lg font-black">Welcome! Start your habit library.</p>
			<p class="text-ink/75">Add a few habits now; you'll pick from them when you build a card.</p>
		</div>
	{/if}

	{#if !data.archived && (data.welcome || data.activeCount === 0)}
		<StarterHabits addedIds={data.addedIds} {keep} />
	{/if}

	<CategoryFilter selected={data.category} counts={data.counts} archived={data.archived} />

	{#if groups.length === 0}
		<div
			class="flex flex-col items-start gap-3 rounded-2xl border-2 border-dashed border-line bg-white p-6"
		>
			{#if selectedLabel}
				<p class="font-bold">No habits in {selectedLabel} yet.</p>
			{:else if data.archived}
				<p class="font-bold">Nothing archived.</p>
			{:else}
				<p class="font-bold">No habits yet.</p>
			{/if}
			{#if !data.archived}
				<Button href="/me/habits/new" variant="secondary">New habit</Button>
			{/if}
		</div>
	{:else}
		{#each groups as group (group.category.id)}
			<section aria-labelledby={`cat-${group.category.id}`} class="flex flex-col gap-3">
				<h2 id={`cat-${group.category.id}`} class="text-xl font-black">
					<span aria-hidden="true">{group.category.emoji}</span>
					{group.category.label}
				</h2>
				<ul class="flex flex-col gap-2">
					{#each group.habits as habit (habit.id)}
						<HabitRow {habit} archived={data.archived} {keep} />
					{/each}
				</ul>
			</section>
		{/each}
	{/if}

	<!-- A resolve()d path plus a query string, which the lint rule cannot follow. -->
	<!-- eslint-disable svelte/no-navigation-without-resolve -->
	<p>
		<a
			href={resolve('/(app)/me/habits') + toggleQuery}
			class="font-bold underline underline-offset-4"
			>{data.archived ? 'Show active habits' : `Show archived (${data.archivedCount})`}</a
		>
	</p>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->

	{#if data.welcome}
		<p>
			<a href={resolve('/(app)/card/build')} class="font-bold underline underline-offset-4"
				>Build your first card <span aria-hidden="true">→</span></a
			>
		</p>
	{/if}
</section>
