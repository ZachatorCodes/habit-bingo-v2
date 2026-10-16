<script lang="ts">
	import { resolve } from '$app/paths';
	import ConfirmAction from '#lib/components/ConfirmAction.svelte';
	import CopyField from '#lib/components/CopyField.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { monthName } from '#lib/game/calendar.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const page = $derived(resolve('/(app)/groups/[id]', { id: data.group.id }));
	const tabClass = (on: boolean) =>
		`rounded-xl px-3 py-1.5 font-extrabold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink ${on ? 'border-2 border-ink bg-white' : 'underline underline-offset-4'}`;
	const leaveText = $derived(
		!data.isOwner
			? 'You can rejoin with the invite link.'
			: data.nextOwner
				? `Ownership passes to @${data.nextOwner}.`
				: 'This deletes the group.'
	);
</script>

<Seo title={data.group.name} description="A Habit Bingo group." path={page} noindex />

{#snippet avatar(emoji: string, username: string)}
	<span aria-hidden="true" class="text-2xl">{emoji}</span>
	<span class="min-w-0 flex-1 truncate font-extrabold">@{username}</span>
{/snippet}

<section class="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
	<div class="flex flex-col gap-2">
		<a
			href={resolve('/(app)/groups')}
			class="font-bold underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
			>← Groups</a
		>
		<h1 class="text-3xl leading-tight font-black">
			<span aria-hidden="true">{data.group.emoji}</span>
			{data.group.name}
		</h1>
	</div>

	<!-- eslint-disable svelte/no-navigation-without-resolve -- resolve() cannot carry the query string -->
	<nav aria-label="Group" class="flex flex-wrap gap-2">
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
				class={tabClass(data.board === 'month')}>This month</a
			>
			<a
				href={`${page}?board=all`}
				aria-current={data.board === 'all' ? 'page' : undefined}
				class={tabClass(data.board === 'all')}>All-time</a
			>
		</nav>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->

		<ol class="flex flex-col gap-3">
			{#each data.leaderboard.rows as row (row.userId)}
				<li>
					<a
						href={resolve('/(app)/groups/[id]/members/[userId]', {
							id: data.group.id,
							userId: row.userId
						})}
						class="flex items-center gap-3 rounded-2xl border-2 p-3 shadow-[0_3px_0_var(--color-line)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink {row.isViewer
							? 'border-ink bg-cream'
							: 'border-line bg-white'}"
					>
						<span class="w-6 text-center font-black tabular-nums">{row.rank ?? ''}</span>
						{@render avatar(row.avatarEmoji, row.displayUsername)}
						{#if row.points === null}
							<span class="text-ink/75">No card yet</span>
						{:else}
							<span class="font-extrabold tabular-nums"
								>{row.points} pts · {row.lines} {row.lines === 1 ? 'line' : 'lines'}</span
							>
						{/if}
					</a>
				</li>
			{/each}
		</ol>
		{#if data.leaderboard.provisionalMonth}
			<p class="text-sm text-ink/75">
				Includes {monthName(data.leaderboard.provisionalMonth)}, which is final on the 4th.
			</p>
		{/if}
	{:else if data.tab === 'members'}
		<ul class="flex flex-col gap-3">
			{#each data.members as member (member.userId)}
				<li
					class="flex items-center gap-3 rounded-2xl border-2 border-line bg-white p-3 shadow-[0_3px_0_var(--color-line)]"
				>
					{@render avatar(member.avatarEmoji, member.displayUsername)}
					{#if member.role === 'owner'}
						<span class="rounded-full bg-cream px-2 py-0.5 text-xs font-bold">Owner</span>
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

		<div class="flex flex-col gap-3">
			<CopyField label="Invite link" value={data.inviteLink} copyLabel="Copy invite link" />
			{#if data.isOwner}
				<div>
					<ConfirmAction
						action="?/reset"
						label="Reset link"
						title="Reset the invite link?"
						text="The current link stops working and a new one is made."
						confirm="Reset link"
					/>
				</div>
			{/if}
		</div>

		<div>
			<ConfirmAction
				action="?/leave"
				label="Leave group"
				title={`Leave ${data.group.name}?`}
				text={leaveText}
				confirm="Leave group"
			/>
		</div>
	{/if}
</section>
