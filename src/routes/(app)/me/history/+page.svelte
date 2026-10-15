<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<section class="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
	<h1 class="text-3xl leading-tight font-black">History</h1>
	{#if data.months.length === 0}
		<p class="text-lg text-ink/75">
			No finished months yet. Your first recap arrives on the 4th of next month.
		</p>
	{:else}
		<!-- Opening a recap marks it seen, so a hover must not load it. -->
		<ul class="flex flex-col gap-2" data-sveltekit-preload-data="off">
			{#each data.months as { month, name, points, tiers } (month)}
				<li>
					<a
						href={resolve('/(app)/me/history/[month]', { month })}
						class="block rounded-2xl border-2 border-line bg-white p-4 font-bold tabular-nums focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
					>
						{[name, `${points} point${points === 1 ? '' : 's'}`, tiers.join(', ')]
							.filter(Boolean)
							.join(' · ')}
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>
