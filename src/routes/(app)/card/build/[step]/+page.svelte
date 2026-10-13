<script lang="ts">
	import { enhance } from '$app/forms';
	import BuilderSteps from '#lib/components/BuilderSteps.svelte';
	import Button from '#lib/components/Button.svelte';
	import CardBoard from '#lib/components/CardBoard.svelte';
	import HabitForm from '#lib/components/HabitForm.svelte';
	import HabitPicker from '#lib/components/HabitPicker.svelte';
	import TargetList from '#lib/components/TargetList.svelte';
	import TextField from '#lib/components/TextField.svelte';
	import SizePicker from '#lib/components/SizePicker.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const message = $derived(form && 'message' in form ? form.message : data.notice);
	const createForm = $derived(form && 'errors' in form ? form : null);
	// svelte-ignore state_referenced_locally
	let picked = $state<string[]>(
		(form && 'selected' in form ? form.selected : undefined) ??
			// A habit archived after it was picked is no longer a choice.
			data.draft.habitIds.filter((id) => data.habits.some((h) => h.id === id))
	);
	let creating = $state(false);

	const targetForm = $derived(form && 'targetValues' in form ? form : null);
	const rewardForm = $derived(form && 'rewardValues' in form ? form : null);
	/** The target rows, showing what was typed after a refused submit. */
	const targetRows = $derived(
		(data.targets?.rows ?? []).map((row) => ({
			...row,
			value: targetForm?.targetValues?.[`target:${row.habit.id}`] ?? row.value
		}))
	);
	const rewardErrors = $derived<Record<string, string>>(rewardForm?.errors ?? {});
	const rewardValues = $derived(rewardForm?.rewardValues ?? data.draft.rewards);

	/** Keeps what was typed after a refused submit, then moves focus to the first problem. */
	function focusFirstError(formElement: HTMLFormElement) {
		return async ({ update }: { update: (options?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: false });
			formElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
		};
	}

	/** Stays on the Habits step: the new habit is added to the picks without losing the rest. */
	function trackCreated(formElement: HTMLFormElement) {
		return async ({
			result,
			update
		}: {
			result: { type: string; data?: Record<string, unknown> };
			update: (options?: { reset?: boolean }) => Promise<void>;
		}) => {
			await update({ reset: false });
			const created = result.type === 'success' ? result.data?.createdHabitId : null;
			if (typeof created === 'string') {
				picked = [...picked, created];
				creating = false;
			} else {
				formElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
			}
		};
	}
</script>

<section class="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
	<div>
		<h1 class="text-3xl leading-tight font-black">
			{#if data.forNext}
				Your {data.monthName} card · starts {data.monthName} 1
			{:else}
				{data.draft.cardId ? 'Edit' : 'Build'} your {data.monthName} card
			{/if}
		</h1>
		<p class="mt-2 text-lg text-ink/75">
			{#if data.forNext}
				It starts on {data.monthName} 1, and you can change it until the end of {data.monthName} 2.
			{:else}
				Your progress is saved as you go.
			{/if}
		</p>
	</div>

	<BuilderSteps
		steps={data.steps}
		current={data.step}
		completed={data.draft.completed}
		forNext={data.forNext}
	/>

	{#if message}
		<p id="step-error" role="alert" class="rounded-xl bg-risk px-4 py-3 font-bold text-ink">
			<span aria-hidden="true">⚠</span>
			{message}
		</p>
	{/if}

	{#if data.step === 'size'}
		<form method="POST" action={`?/size${data.keep}`} use:enhance class="flex flex-col gap-6">
			<SizePicker
				selected={data.draft.size}
				habitCount={data.habits.length}
				errorId={message ? 'step-error' : undefined}
			/>
			<div><Button type="submit">Continue</Button></div>
		</form>
	{:else if data.step === 'habits'}
		<div>
			<h2 class="text-2xl font-black">Pick your habits</h2>
			<p class="mt-1 text-ink/75">
				Choose {data.need} for {data.monthName}. You can change their targets next.
			</p>
		</div>

		<details
			bind:open={creating}
			class="rounded-2xl border-2 border-line bg-white p-4 shadow-[0_3px_0_var(--color-line)]"
		>
			<summary
				class="cursor-pointer rounded-xl font-extrabold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
				>New habit</summary
			>
			<!-- novalidate: the server validates every field, as on the habit library's own form. -->
			<form
				method="POST"
				action={`?/createHabit${data.keep}`}
				novalidate
				class="mt-4"
				use:enhance={({ formElement }) => trackCreated(formElement)}
			>
				{#key createForm?.values ?? data.values}
					<HabitForm
						values={createForm?.values ?? data.values}
						errors={createForm?.errors ?? {}}
						submitLabel="Add habit"
					/>
				{/key}
			</form>
		</details>

		<form
			method="POST"
			action={`?/habits${data.keep}`}
			use:enhance={() =>
				async ({ update }) =>
					update({ reset: false })}
			class="flex flex-col gap-6"
		>
			{#if data.habits.length === 0}
				<p class="rounded-2xl border-2 border-dashed border-line bg-white p-4 font-bold">
					You have no habits yet. Add one above.
				</p>
			{:else if data.need !== null}
				<HabitPicker
					habits={data.habits}
					bind:selected={picked}
					need={data.need}
					errorId={message ? 'step-error' : undefined}
				/>
			{/if}
			<div><Button type="submit">Continue</Button></div>
		</form>
	{:else if data.step === 'targets' && data.targets}
		<!-- novalidate: the server explains every out-of-range number on its own row. -->
		<form
			method="POST"
			action={`?/targets${data.keep}`}
			novalidate
			use:enhance={({ formElement }) => focusFirstError(formElement)}
			class="flex flex-col gap-6"
		>
			<TargetList
				rows={targetRows}
				daysLeft={data.forNext ? null : data.targets.daysLeft}
				monthName={data.monthName}
				startDate={data.targets.startDate}
				errors={targetForm?.targetErrors ?? {}}
			/>
			<div><Button type="submit">Continue</Button></div>
		</form>
	{:else if data.step === 'rewards'}
		<div>
			<h2 class="text-2xl font-black">Pick your rewards</h2>
			<p class="mt-1 text-ink/75">Three treats to work toward.</p>
		</div>
		<form
			method="POST"
			action={`?/rewards${data.keep}`}
			novalidate
			use:enhance={({ formElement }) => focusFirstError(formElement)}
			class="flex flex-col gap-6"
		>
			<TextField
				label="First bingo"
				name="bingo"
				value={rewardValues.bingo}
				hint="What will you treat yourself to?"
				error={rewardErrors.bingo}
			/>
			<TextField
				label="{data.sixtyThreshold} squares"
				name="sixty"
				value={rewardValues.sixty}
				hint="What will you treat yourself to?"
				error={rewardErrors.sixty}
			/>
			<TextField
				label="Blackout"
				name="blackout"
				value={rewardValues.blackout}
				hint="What will you treat yourself to?"
				error={rewardErrors.blackout}
			/>
			<div><Button type="submit">Continue</Button></div>
		</form>
	{:else if data.step === 'board' && data.board}
		<div>
			<h2 class="text-2xl font-black">Your board</h2>
			<p class="mt-1 text-ink/75">
				You can change habits, targets, rewards and the board for 48 hours after you start.
			</p>
		</div>
		<CardBoard size={data.board.size} squares={data.board.squares} />
		<div class="flex flex-wrap gap-3">
			<form method="POST" action={`?/shuffle${data.keep}`} use:enhance>
				<Button type="submit" variant="secondary">Shuffle again</Button>
			</form>
			<form method="POST" action={`?/start${data.keep}`} use:enhance>
				<Button type="submit">{data.draft.cardId ? 'Save changes' : 'Start card'}</Button>
			</form>
		</div>
	{/if}

	{#if data.draft.cardId}
		<form method="POST" action={`?/discard${data.keep}`} use:enhance>
			<Button type="submit" variant="secondary">Cancel editing</Button>
		</form>
	{:else if data.draft.completed.length > 0}
		<form method="POST" action={`?/discard${data.keep}`} use:enhance>
			<Button type="submit" variant="secondary">Start over</Button>
		</form>
	{/if}
</section>
