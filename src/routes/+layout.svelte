<script lang="ts">
	import './layout.css';
	import { dev } from '$app/env';
	import favicon from '#lib/assets/favicon.svg';
	import CookieNotice from '#lib/components/CookieNotice.svelte';
	import SiteFooter from '#lib/components/SiteFooter.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	{#if !dev}
		<!-- Vercel Web Analytics: cookieless, served from our own origin (ADR 0006, spec §5.5). -->
		<script defer src="/_vercel/insights/script.js"></script>
	{/if}
</svelte:head>

<div class="flex min-h-dvh flex-col">
	<main class="flex-1">
		{@render children()}
	</main>
	<SiteFooter />
</div>
<CookieNotice />
