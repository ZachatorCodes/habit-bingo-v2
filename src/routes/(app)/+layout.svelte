<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Seo from '#lib/components/Seo.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const linkClass = (href: string) => [
		'rounded-xl px-3 py-1.5 font-extrabold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink',
		page.url.pathname === href ? 'bg-ink text-white' : 'hover:bg-line/40'
	];
	const current = (href: string) => (page.url.pathname === href ? 'page' : undefined);
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
			<a href={resolve('/(app)/today')} aria-current={current('/today')} class={linkClass('/today')}
				>Today</a
			>
			<a href={resolve('/(app)/me')} aria-current={current('/me')} class={linkClass('/me')}>Me</a>
			{#if data.user.isAdmin}
				<a
					href={resolve('/(app)/admin')}
					aria-current={current('/admin')}
					class={linkClass('/admin')}>Admin</a
				>
			{/if}
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
