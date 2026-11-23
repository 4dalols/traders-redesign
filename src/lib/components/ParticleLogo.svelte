<script lang="ts">
	import { onMount } from 'svelte';
	import { reducedMotion } from '$lib/fx/actions';

	let { text = 'TRADERS' }: { text?: string } = $props();

	let wrap: HTMLDivElement;
	let canvas: HTMLCanvasElement;
	let height = $state(220);

	type P = { x: number; y: number; vx: number; vy: number; tx: number; ty: number };

	onMount(() => {
		const ctx = canvas.getContext('2d')!;
		let particles: P[] = [];
		let w = 0;
		let dpr = 1;
		let gap = 5;
		let size = 3;
		let raf = 0;
		let visible = true;
		const mouse = { x: -9999, y: -9999 };
		const still = reducedMotion();

		function build() {
			dpr = Math.min(window.devicePixelRatio || 1, 2);
			w = wrap.clientWidth;
			const fontPx = Math.min(Math.max(72, w * 0.15), 208, w / (text.length * 0.62));
			const pad = 24;
			height = Math.round(fontPx * 0.9 + pad * 2);
			canvas.width = w * dpr;
			canvas.height = height * dpr;
			canvas.style.height = height + 'px';

			const off = document.createElement('canvas');
			off.width = w;
			off.height = height;
			const o = off.getContext('2d')!;
			o.fillStyle = '#fff';
			o.textBaseline = 'alphabetic';
			o.font = `800 ${fontPx}px Outfit, sans-serif`;
			o.letterSpacing = `${-0.04 * fontPx}px`;
			o.fillText(text, 0, pad + fontPx * 0.78);

			gap = w < 640 ? 3 : w < 1100 ? 4 : 5;
			size = gap * 0.72;
			const data = o.getImageData(0, 0, w, height).data;
			const old = particles;
			particles = [];
			for (let y = 0; y < height; y += gap)
				for (let x = 0; x < w; x += gap)
					if (data[(y * w + x) * 4 + 3] > 128) {
						const prev = old[particles.length];
						particles.push({
							x: prev ? prev.x : still ? x : Math.random() * w,
							y: prev ? prev.y : still ? y : Math.random() * height * 3 - height,
							vx: 0,
							vy: 0,
							tx: x,
							ty: y
						});
					}
		}

		function frame(t: number) {
			raf = requestAnimationFrame(frame);
			if (!visible) return;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.clearRect(0, 0, w, height);
			const R = 90;
			for (const p of particles) {
				const dx = p.x - mouse.x;
				const dy = p.y - mouse.y;
				const d2 = dx * dx + dy * dy;
				if (d2 < R * R) {
					const d = Math.sqrt(d2) || 1;
					const f = ((R - d) / R) * 6;
					p.vx += (dx / d) * f;
					p.vy += (dy / d) * f;
				}
				p.vx += (p.tx - p.x) * 0.06;
				p.vy += (p.ty - p.y) * 0.06;
				p.vx *= 0.82;
				p.vy *= 0.82;
				p.x += p.vx;
				p.y += p.vy;
				const speed = Math.min(Math.abs(p.vx) + Math.abs(p.vy), 30);
				const hue = 150 + 120 * (0.5 + 0.5 * Math.sin(p.tx / w * 4 - t / 1400)) + speed * 3;
				ctx.fillStyle = `hsl(${hue % 360} 95% ${58 + speed}%)`;
				ctx.fillRect(p.x, p.y, size, size);
			}
		}

		const onMove = (e: PointerEvent) => {
			const r = canvas.getBoundingClientRect();
			mouse.x = e.clientX - r.left;
			mouse.y = e.clientY - r.top;
		};
		const onLeave = () => {
			mouse.x = mouse.y = -9999;
		};
		const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
		const ro = new ResizeObserver(() => build());

		document.fonts.load('800 100px Outfit').finally(() => {
			build();
			ro.observe(wrap);
			io.observe(canvas);
			window.addEventListener('pointermove', onMove);
			document.addEventListener('pointerleave', onLeave);
			raf = requestAnimationFrame(frame);
		});

		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
			io.disconnect();
			window.removeEventListener('pointermove', onMove);
			document.removeEventListener('pointerleave', onLeave);
		};
	});
</script>

<div bind:this={wrap} class="relative w-full" style="height: {height}px">
	<canvas bind:this={canvas} class="absolute inset-0 w-full" aria-hidden="true"></canvas>
</div>
