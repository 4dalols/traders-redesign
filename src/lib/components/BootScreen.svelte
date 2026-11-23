<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { LOGO_ART as ART, TRADERS_ART, GLYPHS, esc, handoff } from '$lib/fx/ascii';

	const LINES: [string, string][] = [
		['TRADERS@MIT BIOS v19.0 (c) MIT', ''],
		['Memory test ............ 640K', 'OK'],
		['Connecting to exchange.mit.edu', 'OK'],
		['Loading order book ..... 1,024 levels', 'OK'],
		['Spawning market makers', 'OK'],
		['Calibrating risk limits', 'OK']
	];

	let show = $state(true);
	let lineCount = $state(0);
	let pre = $state<HTMLPreElement>();
	let dust = $state<HTMLCanvasElement>();
	let dusting = $state(false);
	let skipDust = false;

	type Cell = {
		x: number;
		y: number;
		w: number;
		h: number;
		font: string;
		appear: number;
		vanish: number;
		solid: boolean;
		state: number; // 0 hidden, 1 shown, 2 cleared
		glyph: string;
		color: string;
	};

	/** Character grid of the home hero logo, if it is on screen. */
	function logoBox() {
		const el = document.querySelector<HTMLPreElement>('pre.ascii-logo.assembling');
		if (!el) return null;
		const r = el.getBoundingClientRect();
		if (!r.width || r.bottom < 0 || r.top > innerHeight) return null;
		const probe = document.createElement('span');
		probe.textContent = '█'.repeat(20);
		el.appendChild(probe);
		const cw = probe.getBoundingClientRect().width / 20;
		probe.remove();
		const cs = getComputedStyle(el);
		const fs = parseFloat(cs.fontSize);
		const lh = fs * 1.05;
		const cols = Math.max(...TRADERS_ART.map((l) => l.length));
		return { x: r.left, y: r.top, cw, lh, w: cw * cols, h: lh * TRADERS_ART.length, cols, font: `${fs}px ${cs.fontFamily}` };
	}

	/**
	 * Cover the screen with ASCII, then drop characters at random to reveal the page.
	 * Characters where the hero logo will be stay behind and hand off to its assembly.
	 */
	function dissolve(covered: () => void, reveal: () => void, done: () => void) {
		const c = dust;
		const ctx = c?.getContext('2d');
		if (!c || !ctx) {
			covered();
			reveal();
			return done();
		}
		const W = innerWidth;
		const H = innerHeight;
		const dpr = Math.min(devicePixelRatio || 1, 2);
		c.width = W * dpr;
		c.height = H * dpr;
		ctx.scale(dpr, dpr);
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		const FONT = '13px ui-monospace, Menlo, Consolas, monospace';
		ctx.font = FONT;
		const cw = Math.ceil(ctx.measureText('M').width) + 1;
		const ch = 16;
		const FILL = 280;
		const appearAt = () => Math.random() * FILL;
		const vanishAt = () => FILL + 120 + Math.random() ** 0.8 * 1500;
		const logo = logoBox();
		const inLogo = (x: number, y: number) =>
			!!logo && x >= logo.x && x < logo.x + logo.w && y >= logo.y && y < logo.y + logo.h;

		const cells: Cell[] = [];
		const add = (x: number, y: number, w: number, h: number, font: string, solid: boolean) =>
			cells.push({ x, y, w, h, font, solid, appear: appearAt(), vanish: solid ? Infinity : vanishAt(), state: 0, glyph: '', color: '' });
		for (let y = 0; y < H; y += ch)
			for (let x = 0; x < W; x += cw) if (!inLogo(x + cw / 2, y + ch / 2)) add(x, y, cw, ch, FONT, false);
		if (logo)
			TRADERS_ART.forEach((line, r) => {
				for (let col = 0; col < logo.cols; col++)
					add(logo.x + col * logo.cw, logo.y + r * logo.lh, logo.cw, logo.lh, logo.font, line[col] === '█');
			});
		const others = cells.filter((k) => !k.solid).length;

		const shades = ['#00DC82', '#00DC82', '#00a865', '#0b6b45', '#8cffd0'];
		const bright = ['#00DC82', '#8cffd0'];
		const rand = <T,>(xs: ArrayLike<T>) => xs[(Math.random() * xs.length) | 0];
		let isCovered = false;
		let revealed = false;
		let fade = 1;
		const paint = (k: Cell) => {
			if (k.solid && isCovered) {
				ctx.clearRect(k.x, k.y, k.w, k.h);
				ctx.globalAlpha = fade;
			} else {
				ctx.fillStyle = '#030303';
				ctx.fillRect(k.x, k.y, k.w, k.h);
			}
			ctx.fillStyle = k.color;
			ctx.font = k.font;
			ctx.fillText(k.glyph, k.x + k.w / 2, k.y + k.h / 2);
			ctx.globalAlpha = 1;
		};

		const t0 = performance.now();
		const step = (now: number) => {
			const t = now - t0;
			let left = 0;
			for (const k of cells) {
				if (k.state === 0 && t >= k.appear) {
					k.glyph = rand(GLYPHS);
					k.color = k.solid ? rand(bright) : rand(shades);
					paint(k);
					k.state = 1;
				}
				if (k.state === 1) {
					if (t >= k.vanish) {
						ctx.clearRect(k.x, k.y, k.w, k.h);
						k.state = 2;
					} else if (k.solid && isCovered) {
						if (Math.random() < 0.15) k.glyph = rand(GLYPHS);
						paint(k);
					} else if (Math.random() < 0.03) {
						k.glyph = rand(GLYPHS);
						paint(k);
					}
				}
				if (!k.solid && k.state !== 2) left++;
			}
			fade = 1 - 0.25 * (1 - left / others);
			if (skipDust) {
				ctx.clearRect(0, 0, W, H);
				left = 0;
			}
			if (!isCovered && (skipDust || t >= FILL)) {
				isCovered = true;
				covered();
			}
			if (!revealed && left <= others * 0.1) {
				revealed = true;
				for (const k of cells)
					if (k.solid) {
						ctx.clearRect(k.x, k.y, k.w, k.h);
						k.state = 2;
					}
				handoff.active = !!logo && !skipDust;
				reveal();
			}
			if (left) requestAnimationFrame(step);
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
		html.classList.add('boot-lock');
		const block = (e: Event) => {
			e.preventDefault();
			e.stopPropagation();
		};
		window.addEventListener('wheel', block, { capture: true, passive: false });
		window.addEventListener('touchmove', block, { capture: true, passive: false });

		const resolveAt = ART.map((row) =>
			[...row].map((_, c) => 900 + c * 16 + Math.random() * 500)
		);
		const start = performance.now();
		let raf = 0;
		let done = false;

		const finish = async () => {
			if (done) return;
			done = true;
			dusting = true;
			await tick();
			dissolve(
				() => (show = false),
				() => html.classList.add('booted'),
				() => {
					dusting = false;
					unlisten();
				}
			);
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

		const skip = () => {
			if (dusting) {
				skipDust = true;
				return;
			}
			if (done) return;
			done = true;
			show = false;
			html.classList.add('booted');
			unlisten();
		};
		const unlisten = () => {
			window.removeEventListener('keydown', skip);
			window.removeEventListener('pointerdown', skip);
			window.removeEventListener('wheel', block, { capture: true });
			window.removeEventListener('touchmove', block, { capture: true });
			html.classList.remove('boot-lock');
		};
		window.addEventListener('keydown', skip);
		window.addEventListener('pointerdown', skip);
		return () => {
			cancelAnimationFrame(raf);
			unlisten();
		};
	});
</script>

{#if show}
	<div class="boot crt-screen" aria-hidden="true">
		<div class="boot-inner">
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
{/if}
{#if dusting}
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
	}
	:global(html.booted) .boot {
		display: none;
	}
	:global(html.boot-lock) {
		overflow: hidden;
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
