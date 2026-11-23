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
		appear: number;
		vanish: number;
		/** logo character this cell resolves to ('' = not part of the logo) */
		target: string;
		col: number;
		row: number;
		resolveAt: number;
		state: number; // 0 hidden, 1 shown, 2 cleared, 3 resolved
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
		const mark = document.createElement('span');
		mark.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
		probe.appendChild(mark);
		el.appendChild(probe);
		const cw = (probe.getBoundingClientRect().width - mark.getBoundingClientRect().width) / 20;
		const baseline = mark.getBoundingClientRect().top - r.top;
		probe.remove();
		if (!cw) return null;
		const cs = getComputedStyle(el);
		const fs = parseFloat(cs.fontSize);
		return { x: r.left, y: r.top, cw, baseline, lh: fs * 1.05, font: `${fs}px ${cs.fontFamily}` };
	}

	// Same wave as the settled hero logo (AsciiLogo).
	const shade = (phase: number) => 43 + 14 * Math.max(0, Math.sin(phase)) ** 3;

	/**
	 * Cover the screen with ASCII, then drop characters at random to reveal the page.
	 * On the home page the grid is aligned to the hero logo: its characters stay behind,
	 * resolve into the logo in place, and AsciiLogo takes over already settled.
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

		const logo = logoBox();
		let font = '13px ui-monospace, Menlo, Consolas, monospace';
		let cw: number, ch: number, ox: number, oy: number;
		if (logo) {
			font = logo.font;
			cw = logo.cw;
			ch = logo.lh;
			ox = logo.x;
			oy = logo.y;
		} else {
			ctx.font = font;
			cw = Math.ceil(ctx.measureText('M').width) + 1;
			ch = 16;
			ox = oy = 0;
		}
		ctx.font = font;
		const m = ctx.measureText('█');
		const asc = m.fontBoundingBoxAscent ?? ch * 0.8;
		const desc = m.fontBoundingBoxDescent ?? ch * 0.2;
		const baseline = logo ? logo.baseline : (ch - (asc + desc)) / 2 + asc;
		const cols = Math.max(...TRADERS_ART.map((l) => l.length));
		const pad = 8;
		const box = logo && {
			x: ox - pad,
			y: oy - pad,
			w: cols * cw + 2 * pad,
			h: TRADERS_ART.length * ch + 2 * pad
		};
		const nearLogo = (x: number, y: number) =>
			!!box && x + cw > box.x && x < box.x + box.w && y + ch > box.y && y < box.y + box.h;

		const FILL = 280;
		const c0 = Math.floor(-ox / cw);
		const r0 = Math.floor(-oy / ch);
		const cells: Cell[] = [];
		for (let row = r0; oy + row * ch < H; row++)
			for (let col = c0; ox + col * cw < W; col++) {
				const target = logo && row >= 0 ? (TRADERS_ART[row]?.[col] ?? ' ') : ' ';
				const part = target !== ' ';
				cells.push({
					x: ox + col * cw,
					y: oy + row * ch,
					col,
					row,
					target: part ? target : '',
					appear: Math.random() * FILL,
					vanish: part ? Infinity : FILL + 120 + Math.random() ** 0.8 * 1500,
					resolveAt: Infinity,
					state: 0,
					glyph: '',
					color: ''
				});
			}
		const others = cells.filter((k) => !k.target).length;
		const logoCells = cells.filter((k) => k.target);

		const shades = ['#00DC82', '#00DC82', '#00a865', '#0b6b45', '#8cffd0'];
		const rand = <T,>(xs: ArrayLike<T>) => xs[(Math.random() * xs.length) | 0];
		let isCovered = false;
		let resolving = false;
		let handedOff = false;
		const paint = (k: Cell, now: number) => {
			if (!(k.target && isCovered)) {
				ctx.fillStyle = '#030303';
				ctx.fillRect(k.x, k.y, cw, ch);
			}
			ctx.font = font;
			if (k.state === 3) {
				ctx.shadowColor = 'rgba(0, 220, 130, 0.4)';
				ctx.shadowBlur = 6;
				ctx.fillStyle = `hsl(155 100% ${shade(k.col / 5 + k.row * 0.4 - now / 450).toFixed(1)}%)`;
				ctx.fillText(k.target, k.x + cw / 2, k.y + baseline);
				ctx.shadowBlur = 0;
			} else {
				ctx.fillStyle = k.color;
				ctx.fillText(k.glyph, k.x + cw / 2, k.y + baseline);
			}
		};

		const t0 = performance.now();
		let resolveStart = 0;
		const step = (now: number) => {
			const t = now - t0;
			let left = 0;
			for (const k of cells) {
				if (k.state === 0 && t >= k.appear) {
					k.glyph = rand(GLYPHS);
					k.color = k.target === '█' ? rand(['#00DC82', '#8cffd0']) : rand(shades);
					k.state = 1;
					paint(k, now);
				}
				if (k.state === 1) {
					if (t >= k.vanish) {
						ctx.clearRect(k.x, k.y, cw, ch);
						k.state = 2;
					} else if (t >= k.resolveAt) {
						k.state = 3;
					} else if (k.target && isCovered) {
						if (Math.random() < 0.12) k.glyph = rand(GLYPHS);
					} else if (Math.random() < 0.03) {
						k.glyph = rand(GLYPHS);
						paint(k, now);
					}
				}
				if (!k.target && k.state !== 2) left++;
			}
			if (skipDust) {
				ctx.clearRect(0, 0, W, H);
				left = 0;
			}
			if (!isCovered && (skipDust || t >= FILL)) {
				isCovered = true;
				covered();
				// around the logo only its own characters remain, without backing
				for (const k of cells)
					if (!k.target && nearLogo(k.x, k.y)) {
						ctx.clearRect(k.x, k.y, cw, ch);
						k.state = 2;
					}
			}
			if (box && isCovered && !handedOff && !skipDust) {
				ctx.clearRect(box.x, box.y, box.w, box.h);
				for (const k of logoCells) if (k.state === 1 || k.state === 3) paint(k, now);
			}
			if (!handedOff && !skipDust && logo && !resolving && left <= others * 0.1) {
				resolving = true;
				resolveStart = t;
				for (const k of logoCells) k.resolveAt = t + Math.max(0, k.col) * 12 + Math.random() * 250;
			}
			let pending = 0;
			if (resolving && !handedOff) {
				for (const k of logoCells) if (k.state !== 3) pending++;
				if (!pending && t - resolveStart > 0) {
					handedOff = true;
					handoff.active = true;
					reveal();
					if (box) ctx.clearRect(box.x, box.y, box.w, box.h);
				}
			}
			if (!logo && !handedOff && left <= others * 0.1) {
				handedOff = true;
				reveal();
			}
			if (skipDust && !handedOff) {
				handedOff = true;
				reveal();
			}
			if (left || !handedOff) requestAnimationFrame(step);
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
