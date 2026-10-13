<script lang="ts">
	import { resolve } from '$app/paths';
	import HabitSheet from '#lib/components/HabitSheet.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<!-- The habit sheet as a page: without JavaScript, or when opened directly. -->
<section class="mx-auto flex max-w-lg flex-col gap-2 px-4 py-10">
	<a
		href={resolve('/(app)/card')}
		class="self-start font-bold underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
		>Back to card</a
	>
	<h1 class="text-3xl leading-tight font-black">{data.sheet.name}</h1>
	<HabitSheet data={data.sheet} />
</section>
