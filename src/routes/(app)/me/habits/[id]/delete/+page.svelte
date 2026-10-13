<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '#lib/components/Button.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<section class="mx-auto flex max-w-md flex-col gap-4 px-4 py-12">
	<div class="text-4xl" aria-hidden="true">{data.habit.emoji}</div>
	<h1 class="text-3xl leading-tight font-black">Delete {data.habit.name} forever?</h1>
	<p class="text-lg text-ink/75">Your cards keep their copy of it. This can't be undone.</p>
	{#if form?.message}
		<p role="alert" class="rounded-xl bg-risk px-4 py-3 font-bold text-ink">
			<span aria-hidden="true">⚠</span>
			{form.message}
		</p>
	{/if}
	<form method="POST" class="flex flex-wrap gap-3">
		<Button type="submit">Delete forever</Button>
		<!-- eslint-disable svelte/no-navigation-without-resolve -- resolve() can't carry the ?archived=1 query -->
		<a
			href={`${resolve('/(app)/me/habits')}?archived=1`}
			class="rounded-2xl px-4 py-2.5 font-extrabold underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
			>Cancel</a
		>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	</form>
</section>
