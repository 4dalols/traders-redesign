<script lang="ts">
	import { onMount } from 'svelte';
	import { TITLE_FX, applyTitleFx, storeFx, storedFx, type TitleFx } from '$lib/fx/titles';

	let fx = $state<TitleFx>('sweep');
	const idx = $derived(TITLE_FX.findIndex((f) => f.id === fx));
	onMount(() => (fx = storedFx()));

	const set = (d: number) => {
		fx = TITLE_FX[(idx + d + TITLE_FX.length) % TITLE_FX.length].id;
		storeFx(fx);
		applyTitleFx(fx);
	};
</script>

<div
	class="fixed bottom-4 left-4 z-40 flex items-center gap-1 border border-zinc-700 bg-[#050505]/95 px-1 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-zinc-300"
>
	<button class="px-2 py-1 hover:text-green-electric" onclick={() => set(-1)} aria-label="Previous title effect">‹</button>
	<span class="min-w-[11rem] text-center">
		<span class="text-zinc-500">Title {idx + 1}/{TITLE_FX.length}</span>
		<span class="text-green-electric">{TITLE_FX[idx]?.label}</span>
	</span>
	<button class="px-2 py-1 hover:text-green-electric" onclick={() => set(1)} aria-label="Next title effect">›</button>
	<button class="border-l border-zinc-700 px-2 py-1 hover:text-green-electric" onclick={() => set(0)} title="Replay">↻</button>
</div>
