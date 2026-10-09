<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Button from '#lib/components/Button.svelte';

	const notFound = $derived(page.status === 404);
</script>

<svelte:head>
	<title>{notFound ? 'Page not found' : 'Something went wrong'} · Habit Bingo</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="mx-auto flex max-w-md flex-col items-center px-4 pt-20 text-center">
	<div class="text-5xl" aria-hidden="true">{notFound ? '🧭' : '🙈'}</div>
	<h1 class="mt-4 text-3xl font-black">{notFound ? 'Page not found' : 'Something went wrong'}</h1>
	<p class="mt-3 text-ink/75">
		{notFound
			? "That square isn't on the board."
			: 'Sorry about that. Please try again in a moment.'}
	</p>
	{#if page.error?.errorId}
		<p class="mt-2 text-sm text-ink/60">Reference: {page.error.errorId}</p>
	{/if}
	<div class="mt-8">
		<Button href={resolve('/')}>Go home</Button>
	</div>
</section>
