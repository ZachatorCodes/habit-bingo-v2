<script lang="ts">
	import { page } from '$app/state';
	import Seo from '#lib/components/Seo.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	// /me and /admin arrive later in M1, so they cannot go through resolve() yet.
	const links = $derived([
		{ href: '/today', label: 'Today' },
		{ href: '/me', label: 'Me' },
		...(data.user.isAdmin ? [{ href: '/admin', label: 'Admin' }] : [])
	]);
</script>

<Seo
	title="Your habits"
	description="Your Habit Bingo card and check-ins."
	path={page.url.pathname}
	noindex
/>

<header class="border-b-2 border-line bg-white">
	<div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
		<div class="flex min-w-0 items-center gap-2">
			<span
				class="grid size-10 shrink-0 place-items-center rounded-full border-2 border-line bg-white text-xl"
				aria-hidden="true">{data.user.avatarEmoji}</span
			>
			<span class="truncate font-extrabold">@{data.user.displayUsername}</span>
		</div>
		<nav aria-label="Main" class="flex items-center gap-1">
			{#each links as link (link.href)}
				{@const current = page.url.pathname === link.href}
				<!-- eslint-disable svelte/no-navigation-without-resolve -->
				<a
					href={link.href}
					aria-current={current ? 'page' : undefined}
					class={[
						'rounded-xl px-3 py-1.5 font-extrabold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink',
						current ? 'bg-ink text-white' : 'hover:bg-line/40'
					]}>{link.label}</a
				>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			{/each}
			<form method="POST" action="/signout">
				<button
					type="submit"
					class="rounded-xl px-3 py-1.5 font-extrabold text-ink/75 hover:bg-line/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
					>Sign out</button
				>
			</form>
		</nav>
	</div>
</header>

{@render children()}
