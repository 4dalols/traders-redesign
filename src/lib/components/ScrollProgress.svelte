<script lang="ts">
	import { onMount } from 'svelte';

	let progress = $state(0);

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

<div class="pointer-events-none absolute bottom-0 left-0 h-[2px] w-full overflow-x-clip bg-white/5" aria-hidden="true">
	<div
		class="h-full w-full origin-left bg-gradient-to-r from-[#00DC82]/40 to-[#00DC82] shadow-[0_0_6px_rgba(0,220,130,0.5)]"
		style="transform: scaleX({progress})"
	></div>
	<div class="absolute inset-0" style="transform: translateX({progress * 100}%)">
		<div
			class="absolute left-0 top-1/2 h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
			class:hidden={progress <= 0.002}
		></div>
	</div>
</div>
