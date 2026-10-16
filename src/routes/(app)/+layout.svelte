<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Seo from '#lib/components/Seo.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	/** True on the page itself and, for `under`, anywhere beneath it. */
	const active = (href: string, under = false) =>
		page.url.pathname === href || (under && page.url.pathname.startsWith(`${href}/`));
	const current = (href: string, under = false) => (active(href, under) ? 'page' : undefined);
</script>

<Seo
	title="Your habits"
	description="Your Habit Bingo card and check-ins."
	path={page.url.pathname}
	noindex
/>

<header class="border-b-2 border-line bg-white">
	<div class="shell">
		<div class="who">
			<span class="avatar" aria-hidden="true">{data.user.avatarEmoji}</span>
			<span class="name">@{data.user.displayUsername}</span>
		</div>
		<form method="POST" action="/signout">
			<button type="submit" class="signout">Sign out</button>
		</form>
		<nav aria-label="Main" class="bar">
			<a href={resolve('/(app)/today')} aria-current={current('/today')} class="tab"
				><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"
					><rect x="3.5" y="5" width="17" height="15.5" rx="3.5" /><path
						d="M3.5 10h17M8 3v4M16 3v4"
					/><path d="m9 15 2 2 4-4" /></svg
				><span class="label">Today</span></a
			>
			<a href={resolve('/(app)/card')} aria-current={current('/card', true)} class="tab"
				><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"
					><rect x="3.5" y="3.5" width="17" height="17" rx="3.5" /><path
						d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17"
					/></svg
				><span class="label">Card</span></a
			>
			<a href={resolve('/(app)/groups')} aria-current={current('/groups', true)} class="tab"
				><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"
					><circle cx="9" cy="8.5" r="3.5" /><path
						d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"
					/><path d="M15.5 5.3a3.5 3.5 0 0 1 0 6.4M18 14.9c1.8.8 3 2.5 3.5 5.1" /></svg
				><span class="label">Groups</span></a
			>
			<a href={resolve('/(app)/me')} aria-current={current('/me')} class="tab"
				><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"
					><circle cx="12" cy="8" r="4" /><path d="M4 21c.8-4.2 4-6.5 8-6.5s7.2 2.3 8 6.5" /></svg
				><span class="label">Me</span></a
			>
			{#if data.user.isAdmin}
				<a href={resolve('/(app)/admin')} aria-current={current('/admin')} class="tab"
					><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"
						><path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6L12 3Z" /><path
							d="m9 12 2 2 4-4"
						/></svg
					><span class="label">Admin</span></a
				>
			{/if}
		</nav>
	</div>
</header>

<main class="flex-1">
	{@render children()}
</main>

<style>
	.shell {
		max-width: 64rem;
		margin-inline: auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 12px 16px;
	}
	.who {
		display: flex;
		min-width: 0;
		align-items: center;
		gap: 8px;
	}
	.avatar {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 40px;
		height: 40px;
		border-radius: 9999px;
		border: 2px solid var(--color-line);
		background: #fff;
		font-size: 1.25rem;
	}
	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 800;
	}
	.signout {
		border-radius: 12px;
		padding: 6px 12px;
		font-weight: 800;
		color: color-mix(in srgb, var(--color-ink) 75%, transparent);
	}
	.signout:hover {
		background: color-mix(in srgb, var(--color-line) 40%, transparent);
	}
	.signout:focus-visible,
	.tab:focus-visible {
		outline: 3px solid var(--color-ink);
		outline-offset: 2px;
	}
	.icon {
		width: 26px;
		height: 26px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2.25;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.label {
		font-size: 0.75rem;
		font-weight: 800;
		line-height: 1;
	}
	.tab {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		-webkit-tap-highlight-color: transparent;
		pointer-events: auto;
		padding-bottom: calc(12px + env(safe-area-inset-bottom));
		transition:
			transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1),
			background-color 120ms ease-out,
			border-color 120ms ease-out;
		flex: 1;
		max-width: 104px;
		height: 74px;
		border: 2px solid var(--color-line);
		border-bottom: 0;
		border-radius: 16px 16px 0 0;
		background: #fff;
		color: var(--color-ink);
	}
	/* --tab-bar also lifts the cookie notice above the tabs. */
	:global(body) {
		--tab-bar: calc(84px + env(safe-area-inset-bottom));
		padding-bottom: var(--tab-bar);
	}
	.bar {
		position: fixed;
		inset: auto 0 -12px 0;
		z-index: 40;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		gap: 6px;
		padding: 0 12px;
		pointer-events: none;
	}
	.tab:hover {
		transform: translateY(-4px);
		border-color: color-mix(in srgb, var(--color-ink) 35%, var(--color-line));
	}
	.tab[aria-current='page'] {
		transform: translateY(-8px);
		border-color: var(--color-ink);
		background: var(--color-cream);
	}
	.tab[aria-current='page'] .icon {
		stroke-width: 2.75;
	}
	@media (prefers-reduced-motion: reduce) {
		.tab {
			transition: none;
		}
	}
</style>
