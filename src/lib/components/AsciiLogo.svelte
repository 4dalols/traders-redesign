<script lang="ts">
	import { onMount } from 'svelte';
	import { TRADERS_ART as ART, esc, handoff, randomGlyph, whenBooted } from '$lib/fx/ascii';
	import { lite, reducedMotion } from '$lib/fx/actions';

	let wrap: HTMLDivElement;
	let pre: HTMLPreElement;
	let glitch: HTMLPreElement;
	let glowEl: HTMLPreElement;
	let fontSize = $state(16);
	let settled = $state(false);
	const WIDTH = Math.max(...ART.map((l) => l.length));
	const TEXT = ART.join('\n');
	const LH = 1.05;

	// Shimmer: lightness = 43 + 14·max(0, sin(c/5 + 0.4r − t/450))³ in hsl(155 100% L).
	const shade = (phase: number) => 43 + 14 * Math.max(0, Math.sin(phase)) ** 3;

	onMount(() => {
		const still = reducedMotion();
		const cheap = lite();
		const mouse = { col: -99, row: -99 };
		let start = 0;
		let resolveAt: number[][] = [];
		let assembleEnd = 0;
		let raf = 0;
		let visible = true;
		let last = 0;
		let k = 0; // |wave vector| in rad per px
		let glitching = false;
		let boot: Map<string, [string, string]> | null = null;

		/**
		 * After assembly the logo is plain text painted with a diagonal repeating gradient
		 * that reproduces the per-character wave; animating it only moves a CSS variable.
		 */
		const layoutGradient = () => {
			const probe = document.createElement('span');
			probe.textContent = '█'.repeat(20);
			pre.appendChild(probe);
			const cw = probe.getBoundingClientRect().width / 20;
			probe.remove();
			const lh = fontSize * LH;
			if (!cw) return;
			const kx = 1 / (5 * cw);
			const ky = 0.4 / lh;
			k = Math.hypot(kx, ky);
			const angle = (Math.atan2(kx, -ky) * 180) / Math.PI;
			const period = (2 * Math.PI) / k;
			const N = 32;
			const stops = Array.from({ length: N + 1 }, (_, i) => {
				const u = (i / N) * period;
				return `hsl(155 100% ${shade(k * u).toFixed(1)}%) calc(var(--shift) + ${u.toFixed(2)}px)`;
			});
			pre.style.backgroundImage = `repeating-linear-gradient(${angle.toFixed(2)}deg, ${stops.join(', ')})`;
		};
		const setShift = (t: number) => {
			if (!k) return;
			const period = (2 * Math.PI) / k;
			// phase at char centre (c,r): k·s − 0.3 − t/450, s measured from the top-left corner
			const shift = ((((0.3 + t / 450) / k) % period) + period) % period;
			pre.style.setProperty('--shift', `${shift.toFixed(2)}px`);
		};

		const ro = new ResizeObserver(() => {
			fontSize = Math.min(28, wrap.clientWidth / (WIDTH * 0.62));
			requestAnimationFrame(layoutGradient);
		});
		ro.observe(wrap);

		/**
		 * Resolved characters are plain text, so they take the same shimmer gradient and glow
		 * as the settled logo; unresolved cells are opaque coloured glyphs drawn over it.
		 */
		const renderAssembly = (t: number) => {
			let out = '';
			let glow = '';
			ART.forEach((line, r) => {
				[...line].forEach((ch, c) => {
					if (ch === ' ') {
						out += ' ';
						glow += ' ';
						return;
					}
					const near = Math.hypot((c - mouse.col) * 0.5, r - mouse.row) < 2.2;
					if (t - start < resolveAt[r][c]) {
						glow += ' ';
						const cell = boot?.get(`${r},${c}`);
						if (cell) {
							if (t > start && Math.random() < (assembleEnd === Infinity ? 0.45 : 0.25)) cell[0] = randomGlyph();
							out += `<span style="color:${cell[1]}">${esc(cell[0])}</span>`;
						} else
							out +=
								Math.random() < 0.55 ? `<span style="color:#034c2e">${esc(randomGlyph())}</span>` : ' ';
					} else if (near && Math.random() < 0.5) {
						glow += ' ';
						out += `<span style="color:#8B5CF6">${esc(randomGlyph())}</span>`;
					} else {
						out += ch;
						glow += ch;
					}
				});
				out += '\n';
				glow += '\n';
			});
			pre.innerHTML = out;
			glowEl.textContent = glow;
		};

		const settle = (t: number) => {
			pre.textContent = TEXT;
			glowEl.textContent = TEXT;
			settled = true;
			setShift(t);
		};

		const renderGlitch = () => {
			let out = '';
			let any = false;
			ART.forEach((line, r) => {
				if (Math.abs(r - mouse.row) < 2.5)
					[...line].forEach((ch, c) => {
						const near = ch !== ' ' && Math.hypot((c - mouse.col) * 0.5, r - mouse.row) < 2.2;
						if (near) any = true;
						out += near && Math.random() < 0.5 ? `<span>${esc(randomGlyph())}</span>` : ' ';
					});
				out += '\n';
			});
			glitch.innerHTML = any ? out : '';
			return any;
		};

		const frame = (t: number) => {
			raf = requestAnimationFrame(frame);
			// held boot glyphs only flicker, so they need fewer frames than the resolve sweep
			const gap = assembleEnd === Infinity ? 66 : 33;
			if (!visible || t - last < gap) return;
			last = t;
			setShift(t);
			if (!settled) {
				if (t - start >= assembleEnd) {
					settle(t);
					if (cheap) return cancelAnimationFrame(raf);
				} else return renderAssembly(t);
			}
			if (glitching) glitching = renderGlitch();
		};

		const onMove = (e: PointerEvent) => {
			const r = pre.getBoundingClientRect();
			mouse.col = ((e.clientX - r.left) / r.width) * WIDTH;
			mouse.row = ((e.clientY - r.top) / r.height) * ART.length;
			const nearLogo = mouse.row > -3 && mouse.row < ART.length + 3 && mouse.col > -5 && mouse.col < WIDTH + 5;
			if (nearLogo) glitching = true;
			else if (glitching) {
				glitching = false;
				glitch.innerHTML = '';
			}
		};
		const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));

		let running = false;
		const run = () => {
			running = true;
			layoutGradient();
			io.observe(pre);
			raf = requestAnimationFrame(frame);
		};
		const plan = (from: number, gap: number, spread: number) => {
			resolveAt = ART.map((row) => [...row].map((_, c) => from + c * gap + Math.random() * spread));
			assembleEnd = Math.max(...resolveAt.flat()) + 50;
		};

		// boot dissolve hands over its glyphs in the logo cells, then asks for them to resolve
		handoff.begin = (cells) => {
			boot = cells;
			start = performance.now();
			resolveAt = ART.map((row) => [...row].map(() => Infinity));
			assembleEnd = Infinity;
			run();
			renderAssembly(start);
		};
		handoff.resolve = (instant) => {
			if (!boot) return;
			if (instant) plan(0, 0, 0);
			else plan(performance.now() - start, 12, 250);
		};

		whenBooted().then(() => {
			if (!cheap) window.addEventListener('pointermove', onMove, { passive: true });
			if (running) return;
			start = performance.now();
			if (still) {
				layoutGradient();
				return settle(start);
			}
			plan(0, 18, 600);
			run();
		});

		return () => {
			handoff.begin = handoff.resolve = undefined;
			cancelAnimationFrame(raf);
			ro.disconnect();
			io.disconnect();
			window.removeEventListener('pointermove', onMove);
		};
	});
</script>

<div bind:this={wrap} class="relative w-full" style="font-size: {fontSize}px">
	<pre bind:this={glowEl} class="ascii-logo glow" aria-hidden="true"></pre>
	<pre
		bind:this={pre}
		data-logo
		class="ascii-logo shimmer relative"
		style="min-height: {ART.length * LH}em"
		aria-hidden="true"></pre>
	<pre bind:this={glitch} class="ascii-logo glitch" aria-hidden="true"></pre>
</div>

<style>
	@property --shift {
		syntax: '<length>';
		inherits: false;
		initial-value: 0px;
	}
	.ascii-logo {
		font-family: ui-monospace, Menlo, Consolas, 'DejaVu Sans Mono', 'Courier New', monospace;
		line-height: 1.05;
		margin: 0;
	}
	.glow {
		position: absolute;
		inset: 0;
		color: transparent;
		text-shadow: 0 0 6px rgba(0, 220, 130, 0.4);
		pointer-events: none;
	}
	.shimmer {
		/* own layer: the moving gradient repaints only the logo */
		will-change: transform;
		contain: paint;
		color: transparent;
		-webkit-background-clip: text;
		background-clip: text;
		background-origin: padding-box;
	}
	.glitch {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	.glitch :global(span) {
		color: #8b5cf6;
		background: #050505;
		text-shadow: 0 0 6px rgba(0, 220, 130, 0.4);
	}
</style>
