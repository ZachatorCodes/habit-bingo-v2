<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '#lib/components/Button.svelte';
	import DaySwitcher from '#lib/components/DaySwitcher.svelte';
	import TodayRow from '#lib/components/TodayRow.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const message = $derived(form && 'message' in form ? form.message : null);
	const groups = [
		{ key: 'anytime', heading: 'Anytime this month' },
		{ key: 'slip', heading: 'Log a slip' }
	] as const;
</script>

<section class="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
	<div class="flex flex-wrap items-baseline justify-between gap-2">
		<h1 class="text-3xl leading-tight font-black">Today</h1>
		{#if data.card}
			<a
				href={resolve('/(app)/card')}
				class="font-bold underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
				>See your {data.monthName} card</a
			>
		{/if}
	</div>

	{#if !data.card}
		<div class="flex flex-col items-center gap-4 py-8 text-center">
			<div class="text-5xl" aria-hidden="true">🎯</div>
			<p class="text-lg text-ink/75">No card yet.</p>
			<Button href={resolve('/(app)/card/build')}>Build one</Button>
		</div>
	{:else}
		{@const { day, days, today, sections } = data.card}
		<DaySwitcher {days} selected={day} {today} />
		{#if message}
			<p role="alert" class="rounded-xl bg-risk px-4 py-3 font-bold text-ink">
				<span aria-hidden="true">⚠</span>
				{message}
			</p>
		{/if}

		<section aria-labelledby="do-today" class="flex flex-col gap-3">
			<h2 id="do-today" class="text-xl font-black">Do today</h2>
			{#if sections.doToday.length === 0}
				<p class="rounded-2xl bg-earn px-4 py-3 font-bold text-ink">All done today 🎉</p>
			{:else}
				<ul class="flex flex-col gap-2">
					{#each sections.doToday as row (row.squareId)}
						<TodayRow {row} {day} keep={data.keep} />
					{/each}
				</ul>
			{/if}
			{#if sections.done.length > 0}
				<details aria-label="Done" class="rounded-2xl border-2 border-line bg-white/60 p-3">
					<summary class="cursor-pointer font-extrabold">Done ({sections.done.length})</summary>
					<ul class="mt-3 flex flex-col gap-2">
						{#each sections.done as row (row.squareId)}
							<TodayRow {row} {day} keep={data.keep} />
						{/each}
					</ul>
				</details>
			{/if}
		</section>

		{#each groups as group (group.key)}
			{#if sections[group.key].length > 0}
				<section aria-labelledby={group.key} class="flex flex-col gap-3">
					<h2 id={group.key} class="text-xl font-black">{group.heading}</h2>
					<ul class="flex flex-col gap-2">
						{#each sections[group.key] as row (row.squareId)}
							<TodayRow {row} {day} keep={data.keep} />
						{/each}
					</ul>
				</section>
			{/if}
		{/each}
	{/if}
</section>
