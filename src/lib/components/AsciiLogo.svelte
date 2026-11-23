<script lang="ts">
	import { onMount } from 'svelte';
	import { TRADERS_ART as ART, esc, randomGlyph, whenBooted } from '$lib/fx/ascii';
	import { reducedMotion } from '$lib/fx/actions';

	let wrap: HTMLDivElement;
	let pre: HTMLPreElement;
	let fontSize = $state(16);
	const WIDTH = Math.max(...ART.map((l) => l.length));

	onMount(() => {
		const ro = new ResizeObserver(() => {
			fontSize = Math.min(28, wrap.clientWidth / (WIDTH * 0.62));
		});
		ro.observe(wrap);

		const still = reducedMotion();
		const mouse = { col: -99, row: -99 };
		let start = 0;
		let resolveAt: number[][] = [];
		let raf = 0;
		let visible = true;
		let last = 0;

		const render = (t: number) => {
			let out = '';
			ART.forEach((line, r) => {
				[...line].forEach((ch, c) => {
					if (ch === ' ') return void (out += ' ');
					const wave = Math.sin(c / 5 + r * 0.4 - t / 450);
					const near = Math.hypot((c - mouse.col) * 0.5, r - mouse.row) < 2.2;
					if (t - start < resolveAt[r][c]) {
						out += Math.random() < 0.55 ? `<span style="color:#00DC8255">${esc(randomGlyph())}</span>` : ' ';
					} else if (near && Math.random() < 0.5) {
						out += `<span style="color:#8B5CF6">${esc(randomGlyph())}</span>`;
					} else {
						const light = 43 + 14 * Math.max(0, wave) ** 3;
						out += `<span style="color:hsl(155 100% ${light.toFixed(1)}%)">${ch}</span>`;
					}
				});
				out += '\n';
			});
			pre.innerHTML = out;
		};

		const frame = (t: number) => {
			raf = requestAnimationFrame(frame);
			if (!visible || t - last < 33) return;
			last = t;
			render(t);
		};

		const onMove = (e: PointerEvent) => {
			const r = pre.getBoundingClientRect();
			mouse.col = ((e.clientX - r.left) / r.width) * WIDTH;
			mouse.row = ((e.clientY - r.top) / r.height) * ART.length;
		};
		const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));

		whenBooted().then(() => {
			start = performance.now();
			resolveAt = ART.map((row) => [...row].map((_, c) => (still ? 0 : c * 18 + Math.random() * 600)));
			if (still) return render(start);
			io.observe(pre);
			window.addEventListener('pointermove', onMove);
			raf = requestAnimationFrame(frame);
		});

		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
			io.disconnect();
			window.removeEventListener('pointermove', onMove);
		};
	});
</script>

<div bind:this={wrap} class="w-full">
	<pre
		bind:this={pre}
		class="ascii-logo"
		style="font-size: {fontSize}px; min-height: {ART.length * 1.05}em"
		aria-hidden="true"></pre>
</div>

<style>
	.ascii-logo {
		font-family: ui-monospace, Menlo, Consolas, 'DejaVu Sans Mono', 'Courier New', monospace;
		line-height: 1.05;
		margin: 0;
	}
	.ascii-logo :global(span) {
		text-shadow: 0 0 6px rgba(0, 220, 130, 0.4);
	}
</style>
