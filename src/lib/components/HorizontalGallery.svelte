<script lang="ts">
	import { onMount } from 'svelte';

	let { images }: { images: string[] } = $props();

	let outer: HTMLElement;
	let track: HTMLDivElement;
	let progress = $state(0);
	let distance = $state(0);
	let pinned = $state(true);

	onMount(() => {
		const mq = window.matchMedia('(min-width: 768px) and (prefers-reduced-motion: no-preference)');
		const measure = () => {
			pinned = mq.matches;
			distance = pinned ? Math.max(0, track.scrollWidth - window.innerWidth) : 0;
			update();
		};
		const update = () => {
			if (!pinned) return;
			const r = outer.getBoundingClientRect();
			const total = outer.offsetHeight - window.innerHeight;
			progress = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
		};
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(track);
		window.addEventListener('resize', measure);
		window.addEventListener('scroll', update, { passive: true });
		mq.addEventListener('change', measure);
		return () => {
			ro.disconnect();
			window.removeEventListener('resize', measure);
			window.removeEventListener('scroll', update);
			mq.removeEventListener('change', measure);
		};
	});

	const current = $derived(Math.min(images.length, Math.floor(progress * images.length) + 1));
</script>

<section
	bind:this={outer}
	class="relative left-1/2 w-screen -translate-x-1/2"
	style={pinned ? `height: calc(100vh + ${distance}px)` : ''}
>
	<div class={pinned ? 'sticky top-20 flex h-[calc(100vh-5rem)] flex-col justify-center overflow-hidden' : ''}>
		<div class="mx-auto mb-8 flex w-full max-w-[90rem] items-end justify-between px-6 md:px-12">
			<div>
				<span class="font-mono text-xs tracking-[0.25em] uppercase text-green-electric/50 block mb-3">Photos</span>
				<h2 class="font-display text-3xl md:text-5xl font-[800] tracking-[-0.02em] text-zinc-50">Gallery</h2>
			</div>
			{#if pinned}
				<span class="font-mono text-sm text-zinc-400">
					<span class="text-green-electric">{String(current).padStart(2, '0')}</span>
					<span class="mx-1 text-zinc-600">/</span>{String(images.length).padStart(2, '0')}
				</span>
			{/if}
		</div>

		<div
			bind:this={track}
			class="flex gap-6 px-6 md:px-12 {pinned ? 'w-max will-change-transform' : 'snap-x snap-mandatory overflow-x-auto pb-4'}"
			style={pinned ? `transform: translate3d(${-progress * distance}px,0,0)` : ''}
		>
			{#each images as src, i}
				<figure
					class="group relative shrink-0 snap-center overflow-hidden border border-zinc-800/60 {pinned ? 'h-[58vh] aspect-[3/2]' : 'w-[85vw] aspect-[3/2]'}"
				>
					<img
						{src}
						alt="Competition photo {i + 1}"
						loading="lazy"
						class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
						style={pinned ? `transform: translateX(${(progress * images.length - i) * -4}%) scale(1.15)` : ''}
					/>
					<figcaption class="absolute bottom-3 left-3 bg-[#050505]/70 px-3 py-1 font-mono text-[11px] tracking-[0.2em] text-zinc-300 backdrop-blur-sm">
						{String(i + 1).padStart(2, '0')}
					</figcaption>
				</figure>
			{/each}
		</div>

		{#if pinned}
			<div class="mx-auto mt-8 w-full max-w-[90rem] px-6 md:px-12">
				<div class="h-[2px] w-full bg-zinc-800">
					<div class="h-full bg-gradient-to-r from-green-electric via-cyan-400 to-violet-accent" style="width: {progress * 100}%"></div>
				</div>
			</div>
		{/if}
	</div>
</section>
