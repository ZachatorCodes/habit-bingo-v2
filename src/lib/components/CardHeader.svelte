<script lang="ts">
	import type { Snippet } from 'svelte';
	import { CARD_SIZES, type CardSize } from '#lib/game/card-layout.ts';
	import { nextTier, squaresToLine, type CardScore, type Tier } from '#lib/game/score.ts';
	import type { SquareState } from '#lib/game/square-state.ts';
	import type { Rewards } from '#lib/server/cards.ts';
	import Hero from './Hero.svelte';
	import Icon from './Icon.svelte';

	type Props = {
		monthName: string;
		daysLeft: number;
		score: CardScore;
		size: CardSize;
		rewards: Rewards;
		/** Every square's state in board order, for the line status. */
		states: SquareState[];
		/** The board and anything that belongs on the sheet above the reward rows. */
		children?: Snippet;
	};

	let { monthName, daysLeft, score, size, rewards, states, children }: Props = $props();

	const tiers = $derived<{ tier: Tier; label: string; reward: string }[]>([
		{ tier: 'bingo', label: 'Bingo', reward: rewards.bingo },
		{
			tier: 'sixtyPercent',
			label: `${CARD_SIZES[size].sixtyThreshold} squares`,
			reward: rewards.sixty
		},
		{ tier: 'blackout', label: 'Blackout', reward: rewards.blackout }
	]);
	const toLine = $derived(squaresToLine(size, states));
	const lineText = $derived(
		toLine === null
			? 'No lines left this month'
			: toLine === 0
				? 'Bingo!'
				: `${toLine} ${toLine === 1 ? 'square' : 'squares'} from a line`
	);
	const next = $derived(nextTier(score.tiers));
	const nextReward = $derived(
		next === 'bingo' ? rewards.bingo : next === 'sixtyPercent' ? rewards.sixty : rewards.blackout
	);
</script>

<Hero title="{monthName} card" summary="{daysLeft} {daysLeft === 1 ? 'day' : 'days'} left" />

<section class="relative -mt-[18px] rounded-[24px] bg-surface shadow-sheet">
	<div class="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6">
		<div class="flex items-end justify-between gap-4">
			<p class="text-[26px] leading-none font-extrabold text-forest tabular-nums">
				<span aria-hidden="true"
					>{score.points}<span class="ml-1 text-xs font-semibold text-muted">pts</span></span
				><span class="sr-only">{score.points} {score.points === 1 ? 'point' : 'points'}</span>
			</p>
			<div class="text-right text-[13px] font-semibold">
				<p>{lineText}</p>
				{#if next}<p class="text-muted">Next reward: {nextReward}</p>{/if}
			</div>
		</div>

		{@render children?.()}

		<div class="flex flex-col">
			<p class="mb-1 text-xs font-extrabold tracking-[0.02em]">{score.percent}% counting</p>
			<ul aria-label="Rewards" class="flex flex-col divide-y divide-line">
				{#each tiers as { tier, label, reward } (tier)}
					<li class="flex items-baseline justify-between gap-3 py-2 text-sm">
						<span class="font-bold">{label}</span>
						<span class="text-muted">{reward}</span>
						{#if score.tiers.includes(tier)}
							<span class="inline-flex items-center gap-1 font-extrabold text-forest"
								><Icon name="check-circle" /> Reached</span
							>
						{/if}
					</li>
				{/each}
			</ul>
		</div>
	</div>
</section>
