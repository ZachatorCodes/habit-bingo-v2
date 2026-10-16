<script lang="ts">
	import { resolve } from '$app/paths';
	import CardBoard from '#lib/components/CardBoard.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import type { CardSize } from '#lib/game/card-layout.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
</script>

<Seo
	title={`@${data.member.displayUsername}`}
	description="A group member's card."
	path={`/groups/${data.groupId}/members/${data.userId}`}
	noindex
/>

<section class="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
	<div class="flex flex-col gap-2">
		<a
			href={resolve('/(app)/groups/[id]', { id: data.groupId })}
			class="font-bold underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
			>← Group</a
		>
		<h1 class="text-3xl leading-tight font-black">
			<span
				aria-hidden="true"
				class="inline-grid size-9 place-items-center rounded-full bg-earned-tile text-forest"
				><Icon name={data.member.avatarIcon} /></span
			>
			@{data.member.displayUsername}
		</h1>
		<h2 class="text-xl font-black">{data.monthName}</h2>
		{#if data.card}
			<p class="font-extrabold tabular-nums">
				{plural(data.card.score.points, 'point')} · {plural(data.card.score.lines.length, 'line')} ·
				{data.card.score.percent}% counting
			</p>
		{/if}
	</div>

	{#if data.card}
		<CardBoard size={data.card.size as CardSize} squares={data.card.squares} />
	{:else}
		<p class="text-lg text-ink/75">No {data.monthName} card yet.</p>
	{/if}
</section>
