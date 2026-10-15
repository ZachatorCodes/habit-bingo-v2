<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '#lib/components/Button.svelte';
	import CardBoard from '#lib/components/CardBoard.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
</script>

<section class="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
	<div class="flex flex-col gap-2">
		<a
			href={resolve('/(app)/me/history')}
			class="font-bold underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
			>← History</a
		>
		<h1 class="text-3xl leading-tight font-black">{data.monthName} recap</h1>
		<p class="font-extrabold tabular-nums">
			{plural(data.result.points, 'point')} · {plural(data.result.lines, 'line')} · {data.percent}%
			counting
		</p>
	</div>

	<CardBoard size={data.size} squares={data.board} />

	{#if data.rewards.length > 0}
		<section aria-labelledby="rewards" class="flex flex-col gap-2">
			<h2 id="rewards" class="text-xl font-black">Rewards earned</h2>
			<ul class="flex flex-col gap-1">
				{#each data.rewards as { label, reward } (label)}
					<li><span class="font-extrabold">{label}:</span> {reward}</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if data.highlight}
		<section aria-labelledby="highlight" class="flex flex-col gap-2">
			<h2 id="highlight" class="text-xl font-black">Most logged</h2>
			<p>
				<span aria-hidden="true">{data.highlight.emoji}</span>
				<span class="font-extrabold">{data.highlight.name}:</span>
				{plural(data.highlight.total, 'check-in')}
			</p>
		</section>
	{/if}

	<section aria-labelledby="categories" class="flex flex-col gap-2">
		<h2 id="categories" class="text-xl font-black">By category</h2>
		<ul class="flex flex-col gap-1">
			{#each data.categories as category (category.id)}
				<li class="tabular-nums">
					<span aria-hidden="true">{category.emoji}</span>
					{category.label}
					{category.counting} of {category.total}
				</li>
			{/each}
		</ul>
	</section>

	{#if data.buildCard}
		<div>
			<Button href={resolve('/(app)/card/build')}>Build {data.buildMonthName}'s card</Button>
		</div>
	{/if}
</section>
