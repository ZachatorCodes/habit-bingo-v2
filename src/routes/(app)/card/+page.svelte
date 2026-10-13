<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Button from '#lib/components/Button.svelte';
	import CardBoard from '#lib/components/CardBoard.svelte';
	import { CARD_SIZES } from '#lib/game/card-layout.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const started = $derived(page.url.searchParams.get('started') === '1');
	const saved = $derived(page.url.searchParams.get('saved') === '1');
	const planned = $derived(page.url.searchParams.get('planned') === '1');
	const message = $derived(
		form && 'message' in form
			? form.message
			: page.url.searchParams.get('locked') === '1'
				? 'This card is locked.'
				: null
	);
</script>

<section class="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
	{#if data.card}
		<h1 class="text-3xl leading-tight font-black">{data.monthName} card</h1>
		{#if started}
			<p role="status" class="rounded-xl bg-earn px-4 py-3 font-bold text-ink">
				<span aria-hidden="true">✓</span> Card started!
			</p>
		{/if}
		{#if planned}
			<p role="status" class="rounded-xl bg-earn px-4 py-3 font-bold text-ink">
				<span aria-hidden="true">✓</span>
				{data.nextMonthName} card saved. It starts {data.nextMonthName} 1.
			</p>
		{/if}
		{#if saved}
			<p role="status" class="rounded-xl bg-earn px-4 py-3 font-bold text-ink">
				<span aria-hidden="true">✓</span> Changes saved.
			</p>
		{/if}
		{#if message}
			<p role="alert" class="rounded-xl bg-risk px-4 py-3 font-bold text-ink">
				<span aria-hidden="true">⚠</span>
				{message}
			</p>
		{/if}

		<CardBoard size={data.card.size} squares={data.card.squares} />

		<div>
			<h2 class="text-2xl font-black">Rewards</h2>
			<dl class="mt-2 flex flex-col gap-2">
				<div>
					<dt class="font-extrabold">First bingo</dt>
					<dd>{data.card.rewards.bingo}</dd>
				</div>
				<div>
					<dt class="font-extrabold">{CARD_SIZES[data.card.size].sixtyThreshold} squares</dt>
					<dd>{data.card.rewards.sixty}</dd>
				</div>
				<div>
					<dt class="font-extrabold">Blackout</dt>
					<dd>{data.card.rewards.blackout}</dd>
				</div>
			</dl>
		</div>

		{#if data.editable && data.deadline}
			<p class="text-ink/75">{data.deadline}.</p>
			<form method="POST" action="?/edit" use:enhance>
				<Button type="submit" variant="secondary">Edit card</Button>
			</form>
		{/if}
	{:else}
		<div class="flex flex-col items-center gap-4 text-center">
			<div class="text-5xl" aria-hidden="true">🎯</div>
			<h1 class="text-3xl leading-tight font-black">Your card</h1>
			<p class="text-lg text-ink/75">No card for {data.monthName} yet.</p>
			<Button href={resolve('/(app)/card/build')}
				>{data.hasDraft ? 'Continue building' : 'Build your card'}</Button
			>
		</div>
	{/if}
</section>
