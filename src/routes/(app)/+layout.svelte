<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from '#lib/components/Icon.svelte';
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

<header class="border-b border-line bg-surface">
	<div class="shell">
		<div class="who">
			<span class="avatar" aria-hidden="true"><Icon name={data.user.avatarIcon} /></span>
			<span class="name">@{data.user.displayUsername}</span>
		</div>
		<form method="POST" action="/signout">
			<button type="submit" class="signout">Sign out</button>
		</form>
		<nav aria-label="Main" class="bar">
			<a href={resolve('/(app)/today')} aria-current={current('/today')} class="tab"
				><Icon name="sun-horizon" size={26} /><span class="label">Today</span></a
			>
			<a href={resolve('/(app)/card')} aria-current={current('/card', true)} class="tab"
				><Icon name="grid-nine" size={26} /><span class="label">Card</span></a
			>
			<a href={resolve('/(app)/groups')} aria-current={current('/groups', true)} class="tab"
				><Icon name="users-three" size={26} /><span class="label">Groups</span></a
			>
			<a href={resolve('/(app)/me')} aria-current={current('/me')} class="tab"
				><Icon name="user-circle" size={26} /><span class="label">Me</span></a
			>
			{#if data.user.isAdmin}
				<a href={resolve('/(app)/admin')} aria-current={current('/admin')} class="tab"
					><Icon name="shield-check" size={26} /><span class="label">Admin</span></a
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
		border: 1px solid var(--color-line);
		background: var(--color-earned-tile);
		color: var(--color-forest);
		font-size: 1.25rem;
	}
	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 800;
	}
	.signout {
		min-height: 44px;
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
		outline: 3px solid var(--color-forest);
		outline-offset: 2px;
	}
	.label {
		font-size: 0.75rem; /* 12px */
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
		border: 1px solid var(--color-line);
		border-bottom: 0;
		border-radius: 16px 16px 0 0;
		background: var(--color-surface);
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
		border-color: var(--color-leaf);
	}
	.tab[aria-current='page'] {
		transform: translateY(-8px);
		border-color: var(--color-forest);
		background: var(--color-page);
		color: var(--color-forest);
	}
	@media (prefers-reduced-motion: reduce) {
		.tab {
			transition: none;
		}
	}
</style>
