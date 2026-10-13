<script lang="ts">
	import { CARD_SIZES, type CardSize } from '#lib/game/card-layout.ts';
	import type { CardScore, Tier } from '#lib/game/score.ts';
	import type { Rewards } from '#lib/server/cards.ts';

	type Props = { monthName: string; score: CardScore; size: CardSize; rewards: Rewards };

	let { monthName, score, size, rewards }: Props = $props();

	const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
	const tiers = $derived<{ tier: Tier; label: string; reward: string }[]>([
		{ tier: 'bingo', label: 'Bingo', reward: rewards.bingo },
		{
			tier: 'sixtyPercent',
			label: `${CARD_SIZES[size].sixtyThreshold} squares`,
			reward: rewards.sixty
		},
		{ tier: 'blackout', label: 'Blackout', reward: rewards.blackout }
	]);
</script>

<header class="flex flex-col gap-3">
	<h1 class="text-3xl leading-tight font-black">{monthName} card</h1>
	<p class="flex flex-wrap gap-x-4 gap-y-1 font-extrabold">
		<span>{score.percent}% counting</span>
		<span>{plural(score.lines.length, 'bingo')}</span>
		<span>{plural(score.points, 'point')}</span>
	</p>
	<ul aria-label="Rewards" class="flex flex-wrap gap-2">
		{#each tiers as { tier, label, reward } (tier)}
			{@const reached = score.tiers.includes(tier)}
			<li
				class={[
					'flex flex-col rounded-2xl border-2 px-3 py-2 text-sm',
					reached ? 'border-earn-edge bg-earn' : 'border-line bg-white'
				]}
			>
				<span class="font-extrabold">{label}</span>
				<span>{reward}</span>
				{#if reached}
					<span class="font-extrabold"><span aria-hidden="true">✓</span> Reached</span>
				{/if}
			</li>
		{/each}
	</ul>
</header>
