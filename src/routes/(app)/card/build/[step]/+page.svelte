<script lang="ts">
	import { enhance } from '$app/forms';
	import BuilderSteps from '#lib/components/BuilderSteps.svelte';
	import Button from '#lib/components/Button.svelte';
	import HabitForm from '#lib/components/HabitForm.svelte';
	import HabitPicker from '#lib/components/HabitPicker.svelte';
	import SizePicker from '#lib/components/SizePicker.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const message = $derived(form && 'message' in form ? form.message : null);
	const createForm = $derived(form && 'errors' in form ? form : null);
	// svelte-ignore state_referenced_locally
	let picked = $state<string[]>(
		(form && 'selected' in form ? form.selected : undefined) ?? data.draft.habitIds
	);
	let creating = $state(false);

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
		<h1 class="text-3xl leading-tight font-black">Build your {data.monthName} card</h1>
		<p class="mt-2 text-lg text-ink/75">Your progress is saved as you go.</p>
	</div>

	<BuilderSteps steps={data.steps} current={data.step} completed={data.draft.completed} />

	{#if message}
		<p id="step-error" role="alert" class="rounded-xl bg-risk px-4 py-3 font-bold text-ink">
			<span aria-hidden="true">⚠</span>
			{message}
		</p>
	{/if}

	{#if data.step === 'size'}
		<form method="POST" action="?/size" use:enhance class="flex flex-col gap-6">
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
				action="?/createHabit"
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
			action="?/habits"
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
	{:else}
		<p class="rounded-2xl border-2 border-dashed border-line bg-white p-4 font-bold">
			This step is coming soon.
		</p>
	{/if}

	{#if data.draft.completed.length > 0}
		<form method="POST" action="?/discard" use:enhance>
			<Button type="submit" variant="secondary">Start over</Button>
		</form>
	{/if}
</section>
