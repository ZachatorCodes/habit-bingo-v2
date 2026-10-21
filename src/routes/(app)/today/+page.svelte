<script lang="ts">
	import Icon from '#lib/components/Icon.svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Confetti from 'phosphor-svelte/lib/Confetti';
	import Warning from 'phosphor-svelte/lib/Warning';
	import Button from '#lib/components/Button.svelte';
	import Hero from '#lib/components/Hero.svelte';
	import DaySwitcher from '#lib/components/DaySwitcher.svelte';
	import Toast from '#lib/components/Toast.svelte';
	import BingoCelebration from '#lib/components/BingoCelebration.svelte';
	import { newlyCompleted } from '#lib/celebrate-lines.ts';
	import { greeting, todaySummary } from '#lib/game/greeting.ts';
	import type { CardScore, Tier } from '#lib/game/score.ts';
	import TodayRow from '#lib/components/TodayRow.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const message = $derived(form && 'message' in form ? form.message : null);

	// A refused or failed check-in rolls back in its row and is announced here (spec §6).
	let toast = $state<{ id: number; text: string } | null>(null);
	const showError = (text: string) => (toast = { id: (toast?.id ?? 0) + 1, text });

	// BINGO! (spec §4.7): when a log here completes a new line or reward tier. Only gains in this tab
	// celebrate; a page load or a drop never does.
	let celebration = $state<{ lines: number[][]; tiers: Tier[] } | null>(null);
	let lastScore: CardScore | null = null;
	let lastCardId: string | null = null;
	$effect(() => {
		const score = data.card?.score;
		if (!score) return;
		// Switching to last month's days shows another card's score: not a gain.
		if (lastScore && lastCardId === data.card?.id) {
			const gained = newlyCompleted(lastScore, score);
			if (gained.lines.length > 0 || gained.tiers.length > 0) celebration = gained;
		}
		lastScore = score;
		lastCardId = data.card?.id ?? null;
	});

	const heading = 'mb-1 text-xs font-extrabold tracking-[0.02em]';
	const list = 'flex flex-col divide-y divide-line';
	const groups = [
		{ key: 'thisWeek', heading: 'This week' },
		{ key: 'anytime', heading: 'Anytime this month' },
		{ key: 'slip', heading: 'Log a slip' }
	] as const;
</script>

<Hero
	title={data.name ? `${greeting(data.hour)}, ${data.name}` : greeting(data.hour)}
	summary={data.card ? todaySummary(data.card.sections.doToday.length) : 'No card yet'}
>
	{#if !data.buildCard}
		<div class="mt-2 text-right">
			<a
				href={resolve('/(app)/card')}
				class="text-[13px] font-semibold underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-surface"
				>See your {data.monthName} card</a
			>
		</div>
	{/if}
</Hero>

<section class="relative -mt-[18px] rounded-[24px] bg-surface shadow-sheet">
	<div class="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6">
		{#if data.recap}
			<div
				class="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-earned-tile px-4 py-3"
			>
				<a
					href={resolve('/(app)/me/history/[month]', { month: data.recap.month })}
					data-sveltekit-preload-data="off"
					class="flex items-center gap-2 font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
					><Confetti
						weight="duotone"
						size={22}
						class="shrink-0 text-forest"
						aria-hidden="true"
					/>Your {data.recap.monthName} recap is ready</a
				>
				<form
					method="POST"
					action="?/dismissRecap{data.keep ?? ''}"
					use:enhance={() =>
						async ({ result, update }) => {
							if (result.type === 'redirect') await invalidateAll();
							else await update();
						}}
				>
					<input type="hidden" name="month" value={data.recap.month} />
					<button
						type="submit"
						class="rounded-xl px-2 py-1 font-bold underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
						>Dismiss</button
					>
				</form>
			</div>
		{/if}
		{#if data.buildCard}
			<div class="flex flex-col items-center gap-4 py-8 text-center">
				<p class="text-lg text-muted">Build this month's card to start checking in.</p>
				<Button href={resolve('/(app)/card/build')}>Build one</Button>
			</div>
		{/if}
		{#if data.headsUp?.length}
			<section aria-labelledby="heads-up" class="rounded-2xl bg-risk-tile px-4 py-3">
				<h2 id="heads-up" class="flex items-center gap-2 {heading}">
					<Warning weight="duotone" size={18} class="text-terracotta" aria-hidden="true" />Heads up
				</h2>
				<ul class="flex flex-col gap-1">
					{#each data.headsUp as nudge (nudge.text)}
						<li>
							<!-- eslint-disable svelte/no-navigation-without-resolve -- resolve() can't carry the ?day= query -->
							<a
								href={nudge.to.kind === 'sheet'
									? resolve('/(app)/card/squares/[id]', { id: nudge.to.squareId })
									: nudge.to.kind === 'day'
										? `${resolve('/(app)/today')}?day=${nudge.to.date}`
										: nudge.to.kind === 'next'
											? resolve('/(app)/card/next')
											: resolve('/(app)/card')}
								data-sveltekit-preload-data={nudge.to.kind === 'next' ? 'off' : undefined}
								class="block py-1 text-sm font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
								>{nudge.text}</a
							>
							<!-- eslint-enable svelte/no-navigation-without-resolve -->
						</li>
					{/each}
				</ul>
			</section>
		{/if}
		{#if data.card}
			{@const { day, days, today, sections } = data.card}
			<DaySwitcher {days} selected={day} {today} />
			{#if message}
				<p role="alert" class="rounded-2xl bg-risk-tile px-4 py-3 font-bold text-ink">
					<Icon name="warning" />
					{message}
				</p>
			{/if}

			<section aria-labelledby="do-today" class="flex flex-col">
				<h2 id="do-today" class={heading}>Do today</h2>
				{#if sections.doToday.length === 0}
					<p class="rounded-2xl bg-earned-tile px-4 py-3 font-bold text-ink">All done today</p>
				{:else}
					<ul class={list}>
						{#each sections.doToday as row (row.squareId)}
							<TodayRow {row} {day} keep={data.keep} onerror={showError} />
						{/each}
					</ul>
				{/if}
				{#if sections.done.length > 0}
					<details aria-label="Done" class="mt-2">
						<summary class="cursor-pointer {heading}">Done ({sections.done.length})</summary>
						<ul class={list}>
							{#each sections.done as row (row.squareId)}
								<TodayRow {row} {day} keep={data.keep} onerror={showError} />
							{/each}
						</ul>
					</details>
				{/if}
			</section>

			{#each groups as group (group.key)}
				{#if sections[group.key].length > 0}
					<section aria-labelledby={group.key} class="flex flex-col">
						<h2 id={group.key} class={heading}>{group.heading}</h2>
						<ul class={list}>
							{#each sections[group.key] as row (row.squareId)}
								<TodayRow {row} {day} keep={data.keep} onerror={showError} />
							{/each}
						</ul>
					</section>
				{/if}
			{/each}
		{/if}
	</div>
</section>

<Toast message={toast} />

{#if celebration && data.card}
	<!-- A new gain remounts it, so each celebration runs from the start. -->
	{#key celebration}
		<BingoCelebration
			lines={celebration.lines}
			tiers={celebration.tiers}
			rewards={data.card.rewards}
			sixtyThreshold={data.card.sixtyThreshold}
			ondone={() => (celebration = null)}
		/>
	{/key}
{/if}
