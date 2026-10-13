<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Button from '#lib/components/Button.svelte';
	import CardBoard from '#lib/components/CardBoard.svelte';
	import CardHeader from '#lib/components/CardHeader.svelte';
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
		<CardHeader
			monthName={data.monthName}
			score={data.card.score}
			size={data.card.size}
			rewards={data.card.rewards}
		/>
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
