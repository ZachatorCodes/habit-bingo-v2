<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '#lib/components/Button.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<!-- Check-ins arrive in M4. -->
<section class="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-12 text-center">
	<div class="text-5xl" aria-hidden="true">🎯</div>
	<h1 class="text-3xl leading-tight font-black">Today</h1>
	{#if data.hasCard}
		<p class="text-lg text-ink/75">Your {data.monthName} card is ready.</p>
		<Button href={resolve('/(app)/card')}>See your card</Button>
	{:else}
		<p class="text-lg text-ink/75">No card yet.</p>
		<Button href={resolve('/(app)/card/build')}>Build one</Button>
	{/if}
</section>
