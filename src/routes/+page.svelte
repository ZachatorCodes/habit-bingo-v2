<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '#lib/components/Button.svelte';
	import SampleCard from '#lib/components/SampleCard.svelte';
	import Seo from '#lib/components/Seo.svelte';

	const steps = [
		{
			emoji: '🎯',
			title: 'Build your card',
			text: 'Pick habits for a 3×3 or 5×5 card and set your own rewards.'
		},
		{
			emoji: '✅',
			title: 'Check in daily',
			text: 'Earn squares, protect your streaks, and watch the board fill up.'
		},
		{
			emoji: '🏆',
			title: 'Win with friends',
			text: 'Hit bingo, unlock rewards, and climb your group leaderboard.'
		}
	];
</script>

<Seo
	title="Turn your habits into bingo"
	description="Build a monthly bingo card of your habits, check them off every day, and race your friends to a blackout."
	path="/"
/>

<section
	class="mx-auto flex max-w-5xl flex-col items-center gap-10 px-4 pt-12 md:flex-row md:pt-20"
>
	<div class="flex-1 text-center md:text-left">
		<h1 class="text-4xl leading-tight font-black md:text-5xl">
			Turn your habits into a game of bingo.
		</h1>
		<p class="mt-4 text-lg text-ink/75">
			Build a monthly card, check off habits, and race your friends to a blackout.
		</p>
		<div class="mt-8 flex flex-col items-center gap-3 md:items-start">
			<Button href={resolve('/signin')}>Sign in</Button>
			<p class="text-ink/75">Invite-only beta.</p>
		</div>
	</div>
	<div class="flex w-full flex-1 justify-center">
		<SampleCard />
	</div>
</section>

<section class="mx-auto mt-16 grid max-w-5xl gap-4 px-4 sm:grid-cols-3">
	{#each steps as step (step.title)}
		<div class="rounded-2xl border-2 border-line bg-white p-5 shadow-[0_3px_0_var(--color-line)]">
			<div class="text-3xl" aria-hidden="true">{step.emoji}</div>
			<h2 class="mt-2 text-lg font-extrabold">{step.title}</h2>
			<p class="mt-1 text-ink/75">{step.text}</p>
		</div>
	{/each}
</section>
