<script lang="ts">
	import type { Snippet } from 'svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import HabitForm from '#lib/components/HabitForm.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import type { HabitInput } from '#lib/server/habits.ts';

	type Props = {
		title: string;
		lede: string;
		values: HabitInput;
		errors: Record<string, string>;
		submitLabel: string;
		action?: string;
		/** Extra content below the form, such as the archive button on the edit page. */
		footer?: Snippet;
	};
	let { title, lede, values, errors, submitLabel, action, footer }: Props = $props();
</script>

<Seo {title} description={lede} path="/me/habits" noindex />

<section class="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
	<a href={resolve('/(app)/me/habits')} class="font-bold underline-offset-4 hover:underline"
		><span aria-hidden="true">←</span> Habit library</a
	>
	<div>
		<h1 class="text-3xl leading-tight font-black">{title}</h1>
		<p class="mt-2 text-lg text-ink/75">{lede}</p>
	</div>

	{#if errors.form}
		<p role="alert" class="rounded-xl bg-risk px-4 py-3 font-bold text-ink">
			<span aria-hidden="true">⚠</span>
			{errors.form}
		</p>
	{/if}

	<!--
		novalidate: the server validates every field. Without JavaScript the target's min/max come from
		the page's initial kind and period, so the browser's own check would silently block valid
		combinations (e.g. 8 a day while max still says 7 a week).
	-->
	<form
		method="POST"
		novalidate
		{action}
		class="rounded-2xl border-2 border-line bg-white p-5 shadow-[0_3px_0_var(--color-line)]"
		use:enhance={({ formElement }) =>
			async ({ update }) => {
				await update({ reset: false });
				formElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
			}}
	>
		{#key values}
			<HabitForm {values} {errors} {submitLabel} />
		{/key}
	</form>

	{@render footer?.()}
</section>
