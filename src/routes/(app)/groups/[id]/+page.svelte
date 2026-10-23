<script lang="ts">
	import { resolve } from '$app/paths';
	import ConfirmAction from '#lib/components/ConfirmAction.svelte';
	import CopyField from '#lib/components/CopyField.svelte';
	import Hero from '#lib/components/Hero.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { monthName } from '#lib/game/calendar.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const page = $derived(resolve('/(app)/groups/[id]', { id: data.group.id }));
	const linkClass =
		'inline-flex min-h-11 items-center px-4 font-extrabold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink';
	const pillClass = (on: boolean) =>
		`${linkClass} rounded-full ${on ? 'bg-forest text-white' : 'border border-line bg-surface text-ink'}`;
	const tabClass = (on: boolean) =>
		`${linkClass} border-b-2 ${on ? 'border-forest text-forest' : 'border-transparent text-muted'}`;
	const leaveText = $derived(
		!data.isOwner
			? 'You can rejoin with the invite link.'
			: data.nextOwner
				? `Ownership passes to @${data.nextOwner}.`
				: 'This deletes the group.'
	);
</script>

<Seo title={data.group.name} description="A Habit Bingo group." path={page} noindex />

{#snippet avatar(icon: string, username: string, you = false)}
	<span
		aria-hidden="true"
		class="grid size-10 shrink-0 place-items-center rounded-full bg-earned-tile text-2xl text-forest"
		><Icon name={icon} /></span
	>
	<span class="min-w-0 flex-1 truncate font-bold"
		>@{username}{#if you}<span class="sr-only"> (you)</span>{/if}</span
	>
{/snippet}

<Hero
	title={data.group.name}
	summary={`${data.members.length} ${data.members.length === 1 ? 'member' : 'members'}`}
>
	<span
		aria-hidden="true"
		class="mt-3 grid size-12 place-items-center rounded-full bg-earned-tile text-3xl text-forest"
		><Icon name={data.group.icon} /></span
	>
</Hero>

<section class="relative -mt-[18px] rounded-[24px] bg-surface shadow-sheet">
	<div class="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-5">
		<a
			href={resolve('/(app)/groups')}
			class="inline-flex min-h-11 items-center gap-1 font-bold text-forest underline-offset-4 hover:underline"
			><Icon name="arrow-left" /> Groups</a
		>

		<!-- eslint-disable svelte/no-navigation-without-resolve -- resolve() cannot carry the query string -->
		<nav aria-label="Group" class="flex gap-2 border-b border-line">
			<a
				href={page}
				aria-current={data.tab === 'leaderboard' ? 'page' : undefined}
				class={tabClass(data.tab === 'leaderboard')}>Leaderboard</a
			>
			<a
				href={`${page}?tab=members`}
				aria-current={data.tab === 'members' ? 'page' : undefined}
				class={tabClass(data.tab === 'members')}>Members</a
			>
		</nav>

		{#if data.tab === 'leaderboard' && data.leaderboard}
			<nav aria-label="Board" class="flex flex-wrap gap-2">
				<a
					href={page}
					aria-current={data.board === 'month' ? 'page' : undefined}
					class={pillClass(data.board === 'month')}>This month</a
				>
				<a
					href={`${page}?board=all`}
					aria-current={data.board === 'all' ? 'page' : undefined}
					class={pillClass(data.board === 'all')}>All-time</a
				>
			</nav>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->

			<ol class="flex flex-col gap-2">
				{#each data.leaderboard.rows as row (row.userId)}
					<li>
						<a
							href={resolve('/(app)/groups/[id]/members/[userId]', {
								id: data.group.id,
								userId: row.userId
							})}
							class="relative flex min-h-14 items-center gap-3 rounded-row bg-page p-3 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
						>
							{#if row.isViewer}
								<span
									aria-hidden="true"
									class="absolute top-1/2 left-1 size-1.5 -translate-y-1/2 rounded-full bg-forest"
								></span>
							{/if}
							<span class="w-6 text-center font-extrabold tabular-nums">{row.rank ?? ''}</span>
							{@render avatar(row.avatarIcon, row.displayUsername, row.isViewer)}
							{#if row.points === null}
								<span class="text-sm text-muted">No card yet</span>
							{:else}
								<span class="text-sm font-bold tabular-nums"
									>{row.points} pts · {row.lines} {row.lines === 1 ? 'line' : 'lines'}</span
								>
							{/if}
						</a>
					</li>
				{/each}
			</ol>
			{#if data.leaderboard.provisionalMonth}
				<p class="text-sm text-muted">
					Includes {monthName(data.leaderboard.provisionalMonth)}, which is final on the 4th.
				</p>
			{/if}
		{:else if data.tab === 'members'}
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
			<ul class="flex flex-col gap-2">
				{#each data.members as member (member.userId)}
					<li class="flex min-h-14 items-center gap-3 rounded-row bg-page p-3">
						{@render avatar(member.avatarIcon, member.displayUsername)}
						{#if member.role === 'owner'}
							<span class="rounded-full bg-earned-tile px-2 py-0.5 text-xs font-bold text-forest"
								>Owner</span
							>
						{:else if data.isOwner}
							<ConfirmAction
								action="?/remove"
								label="Remove"
								ariaLabel={`Remove @${member.displayUsername}`}
								title={`Remove @${member.displayUsername}?`}
								text="They lose access to this group. They can rejoin with the invite link."
								confirm="Remove"
								fields={{ userId: member.userId }}
							/>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</section>

{#if data.tab === 'members'}
	<section
		class="mx-auto mt-4 flex max-w-2xl flex-col gap-4 rounded-[24px] bg-surface px-4 py-5 shadow-sheet"
	>
		{#if data.inviteLink}
			<CopyField label="Invite link" value={data.inviteLink} copyLabel="Copy invite link" />
		{:else}
			<p class="text-muted">No invite link.</p>
		{/if}
		<div class="flex flex-wrap gap-3">
			{#if data.isOwner}
				<ConfirmAction
					action="?/reset"
					label="Reset link"
					title="Reset the invite link?"
					text="The current link stops working and a new one is made."
					confirm="Reset link"
				/>
			{/if}
			<ConfirmAction
				action="?/leave"
				label="Leave group"
				title={`Leave ${data.group.name}?`}
				text={leaveText}
				confirm="Leave group"
			/>
		</div>
	</section>
{/if}
