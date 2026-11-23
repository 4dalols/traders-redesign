<script lang="ts">
	import { onMount } from 'svelte';

	let progress = $state(0);

	let seed = 7;
	const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
	const pts: [number, number][] = [];
	let y = 14;
	for (let x = 0; x <= 1000; x += 8) {
		y = Math.max(2, Math.min(18, y + (rand() - 0.55) * 4));
		pts.push([x, y]);
	}
	const path = pts.map(([x, yy], i) => `${i ? 'L' : 'M'}${x},${yy.toFixed(1)}`).join(' ');

	const head = $derived(pts[Math.min(pts.length - 1, Math.round(progress * (pts.length - 1)))]);

	onMount(() => {
		let queued = false;
		const measure = () => {
			queued = false;
			const max = document.documentElement.scrollHeight - window.innerHeight;
			progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
		};
		const update = () => {
			if (!queued) (queued = true), requestAnimationFrame(measure);
		};
		measure();
		window.addEventListener('scroll', update, { passive: true });
		window.addEventListener('resize', update);
		return () => {
			window.removeEventListener('scroll', update);
			window.removeEventListener('resize', update);
		};
	});
</script>

<svg
	class="pointer-events-none absolute bottom-0 left-0 h-3 w-full"
	viewBox="0 0 1000 20"
	preserveAspectRatio="none"
	aria-hidden="true"
>
	<defs>
		<linearGradient id="price-line" x1="0" x2="1">
			<stop offset="0" stop-color="#00DC82" />
			<stop offset="0.5" stop-color="#22d3ee" />
			<stop offset="1" stop-color="#8B5CF6" />
		</linearGradient>
		<clipPath id="price-clip">
			<rect x="0" y="0" height="20" width={progress * 1000} />
		</clipPath>
	</defs>
	<path d={path} fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1.2" vector-effect="non-scaling-stroke" />
	<path
		d={path}
		fill="none"
		stroke="url(#price-line)"
		stroke-width="5"
		stroke-opacity="0.25"
		vector-effect="non-scaling-stroke"
		clip-path="url(#price-clip)"
	/>
	<path
		d={path}
		fill="none"
		stroke="url(#price-line)"
		stroke-width="1.8"
		vector-effect="non-scaling-stroke"
		clip-path="url(#price-clip)"
	/>
	{#if progress > 0.002}
		<circle cx={head[0]} cy={head[1]} r="2.5" fill="#fff" />
	{/if}
</svg>
