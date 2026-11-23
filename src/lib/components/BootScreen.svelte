<script lang="ts">
	import { onMount } from 'svelte';
	import { LOGO_ART as ART, GLYPHS, esc } from '$lib/fx/ascii';

	const LINES: [string, string][] = [
		['TRADERS@MIT BIOS v19.0 (c) MIT', ''],
		['Memory test ............ 640K', 'OK'],
		['Connecting to exchange.mit.edu', 'OK'],
		['Loading order book ..... 1,024 levels', 'OK'],
		['Spawning market makers', 'OK'],
		['Calibrating risk limits', 'OK']
	];

	let show = $state(true);
	let leaving = $state(false);
	let lineCount = $state(0);
	let pre = $state<HTMLPreElement>();
	let inner = $state<HTMLDivElement>();
	let dust = $state<HTMLCanvasElement>();

	type Bit = { ch: string; x: number; y: number; vx: number; vy: number; delay: number; color: string; font: string };

	/** Snapshot every visible character on the boot screen. */
	function collect(): Bit[] {
		const bits: Bit[] = [];
		if (!inner) return bits;
		const cx = innerWidth / 2;
		const cy = innerHeight / 2;
		const walker = document.createTreeWalker(inner, NodeFilter.SHOW_TEXT);
		const range = document.createRange();
		for (let n = walker.nextNode(); n; n = walker.nextNode()) {
			const el = n.parentElement!;
			if (el.closest('.boot-skip')) continue;
			const cs = getComputedStyle(el);
			const font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
			const text = n.textContent ?? '';
			for (let i = 0; i < text.length; i++) {
				if (!text[i].trim()) continue;
				range.setStart(n, i);
				range.setEnd(n, i + 1);
				const r = range.getBoundingClientRect();
				if (!r.width) continue;
				const x = r.left + r.width / 2;
				const y = r.top + r.height / 2;
				const a = Math.atan2(y - cy, x - cx) + (Math.random() - 0.5) * 1.2;
				const sp = 0.15 + Math.random() * 0.45;
				bits.push({
					ch: text[i],
					x,
					y,
					vx: Math.cos(a) * sp,
					vy: Math.sin(a) * sp - 0.08,
					delay: Math.random() * 350,
					color: cs.color,
					font
				});
			}
		}
		return bits;
	}

	/** Break the screen into characters that scatter and fade. */
	function dissolve(done: () => void) {
		const bits = collect();
		const c = dust;
		const ctx = c?.getContext('2d');
		if (!c || !ctx || !bits.length) return done();
		const dpr = Math.min(devicePixelRatio || 1, 2);
		c.width = innerWidth * dpr;
		c.height = innerHeight * dpr;
		ctx.scale(dpr, dpr);
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		const LIFE = 900;
		const t0 = performance.now();
		const step = (now: number) => {
			const t = now - t0;
			ctx.clearRect(0, 0, innerWidth, innerHeight);
			let alive = false;
			for (const b of bits) {
				const k = Math.max(0, t - b.delay);
				const p = k / LIFE;
				if (p >= 1) continue;
				alive = true;
				if (k > 0 && Math.random() < 0.15) b.ch = GLYPHS[(Math.random() * GLYPHS.length) | 0];
				ctx.globalAlpha = 1 - p * p;
				ctx.fillStyle = b.color;
				ctx.font = b.font;
				ctx.fillText(b.ch, b.x + b.vx * k * (1 + p), b.y + b.vy * k * (1 + p));
			}
			if (alive) requestAnimationFrame(step);
			else done();
		};
		requestAnimationFrame(step);
	}

	onMount(() => {
		const html = document.documentElement;
		if (
			sessionStorage.getItem('booted') ||
			window.matchMedia('(prefers-reduced-motion: reduce)').matches
		) {
			show = false;
			html.classList.add('booted');
			return;
		}
		sessionStorage.setItem('booted', '1');

		const resolveAt = ART.map((row) =>
			[...row].map((_, c) => 900 + c * 16 + Math.random() * 500)
		);
		const start = performance.now();
		let raf = 0;
		let done = false;

		const finish = () => {
			if (done) return;
			done = true;
			dissolve(() => {
				show = false;
				html.classList.add('booted');
			});
			leaving = true;
		};

		const frame = (now: number) => {
			const t = now - start;
			lineCount = Math.min(LINES.length, Math.floor(t / 180));
			if (t > 700 && pre) {
				let out = '';
				ART.forEach((row, r) => {
					[...row].forEach((ch, c) => {
						if (ch === ' ') {
							out += ' ';
							return;
						}
						const light = 43 + 14 * Math.max(0, Math.sin(c / 5 + r * 0.4 - t / 450)) ** 3;
						if (t >= resolveAt[r][c]) {
							out += `<span style="color:hsl(155 100% ${light.toFixed(1)}%)">${ch}</span>`;
						} else if (Math.random() < 0.6) {
							const g = GLYPHS[(Math.random() * GLYPHS.length) | 0];
							out += `<span style="color:#00DC8255">${esc(g)}</span>`;
						} else out += ' ';
					});
					out += '\n';
				});
				pre.innerHTML = out;
			}
			if (t > 3300) finish();
			if (!done) raf = requestAnimationFrame(frame);
		};
		raf = requestAnimationFrame(frame);

		const skip = () => finish();
		window.addEventListener('keydown', skip, { once: true });
		window.addEventListener('pointerdown', skip, { once: true });
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('keydown', skip);
			window.removeEventListener('pointerdown', skip);
		};
	});
</script>

{#if show}
	<div class="boot crt-screen" class:leaving aria-hidden="true">
		<div class="boot-inner" bind:this={inner}>
			<div class="boot-lines">
				{#each LINES.slice(0, lineCount) as [label, status]}
					<div>
						<span class="text-zinc-400">&gt; {label}</span>
						{#if status}<span class="text-green-electric"> [{status}]</span>{/if}
					</div>
				{/each}
				<span class="cursor">█</span>
			</div>
			<pre bind:this={pre} class="boot-art"></pre>
			<div class="boot-skip">click or press any key to skip</div>
		</div>
	</div>
	<canvas bind:this={dust} class="boot-dust" aria-hidden="true"></canvas>
{/if}

<style>
	.boot {
		position: fixed;
		inset: 0;
		z-index: 100;
		background: #030303;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-mono);
		transition: opacity 0.7s ease 0.1s;
	}
	:global(html.booted) .boot,
	:global(html.booted) .boot-dust {
		display: none;
	}
	.boot.leaving {
		opacity: 0;
	}
	.boot.leaving .boot-inner {
		visibility: hidden;
	}
	.boot-dust {
		position: fixed;
		inset: 0;
		width: 100vw;
		height: 100vh;
		z-index: 101;
		pointer-events: none;
	}
	.boot-inner {
		width: min(92vw, 60rem);
	}
	.boot-lines {
		font-size: clamp(0.65rem, 1.4vw, 0.85rem);
		line-height: 1.7;
		min-height: 11em;
	}
	.cursor {
		color: var(--color-green-electric);
		animation: blink 0.8s steps(1) infinite;
	}
	.boot-art {
		font-family: ui-monospace, Menlo, Consolas, 'DejaVu Sans Mono', 'Courier New', monospace;
		margin-top: 1.5rem;
		font-size: clamp(5px, 1.45vw, 15px);
		line-height: 1.1;
		min-height: 15em;
		text-shadow: 0 0 8px currentColor;
	}
	.boot-skip {
		margin-top: 2rem;
		font-size: 0.7rem;
		letter-spacing: 0.25em;
		text-transform: uppercase;
		color: #52525b;
	}
	@keyframes blink {
		50% {
			opacity: 0;
		}
	}
</style>
