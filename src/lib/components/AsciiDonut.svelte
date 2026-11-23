<script lang="ts">
	import { onMount } from 'svelte';
	import { reducedMotion } from '$lib/fx/actions';

	const W = 60;
	const H = 34;
	const SHADES = '.,-~:;=!*#$@';

	let wrap: HTMLDivElement;
	let pre: HTMLPreElement;
	let fontSize = $state(12);
	let dragging = $state(false);

	onMount(() => {
		const ro = new ResizeObserver(() => {
			fontSize = Math.min(18, wrap.clientWidth / (W * 0.62));
		});
		ro.observe(wrap);

		let A = 1;
		let B = 0;
		let hueShift = 140;
		let vA = 0;
		let vB = 0;
		let raf = 0;
		let visible = true;
		let lastT = 0;
		let px = 0;
		let py = 0;

		const chars = new Array(W * H);
		const hues = new Float32Array(W * H);
		const lum = new Float32Array(W * H);
		const zbuf = new Float32Array(W * H);
		const K2 = 5;
		const K1 = ((W * K2 * 3) / (8 * 3)) * 0.85;

		const render = () => {
			chars.fill(' ');
			zbuf.fill(0);
			const cA = Math.cos(A), sA = Math.sin(A), cB = Math.cos(B), sB = Math.sin(B);
			for (let th = 0; th < 6.283; th += 0.07) {
				const ct = Math.cos(th), st = Math.sin(th);
				for (let ph = 0; ph < 6.283; ph += 0.02) {
					const cp = Math.cos(ph), sp = Math.sin(ph);
					const cx = 2 + ct;
					const cy = st;
					const x = cx * (cB * cp + sA * sB * sp) - cy * cA * sB;
					const y = cx * (sB * cp - sA * cB * sp) + cy * cA * cB;
					const z = K2 + cA * cx * sp + cy * sA;
					const ooz = 1 / z;
					const xp = (W / 2 + K1 * ooz * x) | 0;
					const yp = (H / 2 - K1 * ooz * y * 0.58) | 0;
					const L = cp * ct * sB - cA * ct * sp - sA * st + cB * (cA * st - ct * sA * sp);
					if (xp < 0 || xp >= W || yp < 0 || yp >= H || L <= 0) continue;
					const i = yp * W + xp;
					if (ooz > zbuf[i]) {
						zbuf[i] = ooz;
						chars[i] = SHADES[Math.min(11, (L * 8) | 0)];
						hues[i] = (hueShift + (ph / 6.283) * 360) % 360;
						lum[i] = L;
					}
				}
			}
			let out = '';
			for (let r = 0; r < H; r++) {
				let run = '';
				let runColor = '';
				for (let c = 0; c < W; c++) {
					const i = r * W + c;
					const ch = chars[i];
					const color =
						ch === ' ' ? '' : `hsl(${(Math.round(hues[i] / 15) * 15) % 360} 95% ${Math.round(35 + lum[i] * 22)}%)`;
					if (color !== runColor) {
						if (run) out += runColor ? `<span style="color:${runColor}">${run}</span>` : run;
						run = '';
						runColor = color;
					}
					run += ch;
				}
				if (run) out += runColor ? `<span style="color:${runColor}">${run}</span>` : run;
				out += '\n';
			}
			pre.innerHTML = out;
		};

		const frame = (t: number) => {
			raf = requestAnimationFrame(frame);
			const dt = Math.min(50, t - (lastT || t));
			lastT = t;
			if (!visible) return;
			A += vA + 0.0009 * dt;
			B += vB + 0.0005 * dt;
			if (!dragging) {
				vA *= 0.95;
				vB *= 0.95;
				hueShift += 0.02 * dt;
			}
			render();
		};

		const down = (e: PointerEvent) => {
			dragging = true;
			px = e.clientX;
			py = e.clientY;
			pre.setPointerCapture(e.pointerId);
		};
		const move = (e: PointerEvent) => {
			if (!dragging) return;
			const dx = e.clientX - px;
			const dy = e.clientY - py;
			px = e.clientX;
			py = e.clientY;
			hueShift = (hueShift + dx * 1.2 + 360) % 360;
			vB = dx * 0.004;
			vA = dy * 0.004;
		};
		const up = () => (dragging = false);
		pre.addEventListener('pointerdown', down);
		pre.addEventListener('pointermove', move);
		pre.addEventListener('pointerup', up);
		pre.addEventListener('pointercancel', up);

		const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
		io.observe(pre);
		if (reducedMotion()) render();
		else raf = requestAnimationFrame(frame);

		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
			io.disconnect();
		};
	});
</script>

<div bind:this={wrap} class="relative w-full select-none">
	<pre
		bind:this={pre}
		class="donut {dragging ? 'cursor-grabbing' : 'cursor-grab'}"
		style="font-size: {fontSize}px; height: {H}em"
		aria-hidden="true"></pre>
	<div class="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-600">
		drag to spin · recolor
	</div>
</div>

<style>
	.donut {
		margin: 0;
		font-family: ui-monospace, Menlo, Consolas, 'DejaVu Sans Mono', 'Courier New', monospace;
		line-height: 1;
		touch-action: none;
		text-shadow: 0 0 8px currentColor;
	}
</style>
