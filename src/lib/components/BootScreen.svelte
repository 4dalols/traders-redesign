<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { TRADERS_ART, GLYPHS, handoff } from '$lib/fx/ascii';

	// A random-walk price path that ends higher than it starts.
	const N = 90;
	let pts: number[] = [];
	for (let i = 0, v = 100; i < N; i++, v += (Math.random() - 0.42) * 0.9) pts.push(v);
	if (pts[N - 1] <= pts[0]) pts = pts.map((v) => 2 * pts[0] - v);
	const lo = Math.min(...pts);
	const hi = Math.max(...pts);
	const X = (i: number) => (i / (N - 1)) * 1000;
	const Y = (v: number) => 270 - ((v - lo) / (hi - lo || 1)) * 220;

	let show = $state(true);
	let line = $state('');
	let area = $state('');
	let dot = $state<[number, number] | null>(null);
	let price = $state(pts[0]);
	let clock = $state('09:29:57');
	let open = $state(false);
	const chg = $derived((price / pts[0] - 1) * 100);
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
		state: number; // 0 hidden, 1 shown, 2 cleared
		glyph: string;
		color: string;
	};

	/** Character grid of the home hero logo, if it is on screen. */
	function logoBox() {
		const el = document.querySelector<HTMLPreElement>('pre[data-logo]');
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
		const pad = 2;
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
					vanish: part
						? Infinity
						: nearLogo(ox + col * cw, oy + row * ch)
							? FILL + Math.random() * 450
							: FILL + 120 + Math.random() ** 0.8 * 1500,
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
		let handedOff = false;
		let held = false;
		const paint = (k: Cell) => {
			ctx.fillStyle = '#030303';
			ctx.fillRect(k.x, k.y, cw, ch);
			ctx.fillStyle = k.color;
			ctx.fillText(k.glyph, k.x + cw / 2, k.y + baseline);
		};

		const t0 = performance.now();
		let last = 0;
		const step = (now: number) => {
			// ~30 updates a second is plenty for characters popping off, and halves the repaints
			if (now - last < 30 && !skipDust) return void requestAnimationFrame(step);
			last = now;
			const t = now - t0;
			let left = 0;
			for (const k of cells) {
				if (k.state === 0 && t >= k.appear) {
					k.glyph = rand(GLYPHS);
					k.color = k.target === '█' ? rand(['#00DC82', '#8cffd0']) : rand(shades);
					k.state = 1;
					paint(k);
				}
				if (k.state === 1) {
					if (t >= k.vanish) {
						ctx.clearRect(k.x, k.y, cw, ch);
						k.state = 2;
					} else if (!isCovered && Math.random() < 0.03) {
						k.glyph = rand(GLYPHS);
						paint(k);
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
				// the real logo element takes over its cells, showing the same glyphs
				if (logo && handoff.begin && !skipDust) {
					const map = new Map<string, [string, string]>();
					for (const k of logoCells) {
						map.set(`${k.row},${k.col}`, [k.glyph, k.color]);
						ctx.clearRect(k.x, k.y, cw, ch);
						k.state = 2;
					}
					handoff.begin(map);
					held = true;
				}
			}
			if (!handedOff && (skipDust || left <= others * 0.1)) {
				handedOff = true;
				if (held) handoff.resolve?.(skipDust);
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
			const p = Math.min(1, Math.max(0, (t - 250) / 1800));
			const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
			const f = e * (N - 1);
			const i = Math.floor(f);
			const v = i >= N - 1 ? pts[N - 1] : pts[i] + (pts[i + 1] - pts[i]) * (f - i);
			let d = `M0 ${Y(pts[0]).toFixed(1)}`;
			for (let k = 1; k <= i; k++) d += ` L${X(k).toFixed(1)} ${Y(pts[k]).toFixed(1)}`;
			d += ` L${X(f).toFixed(1)} ${Y(v).toFixed(1)}`;
			line = d;
			area = `${d} L${X(f).toFixed(1)} 300 L0 300 Z`;
			dot = [X(f) / 10, Y(v) / 3];
			price = v;
			const sec = Math.floor(t / 700);
			open = sec >= 3;
			clock = open ? '09:30:00' : `09:29:5${7 + sec}`;
			if (t > 2900) finish();
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
	<div class="boot" aria-hidden="true">
		<div class="boot-inner">
			<div class="boot-head">
				<span>Traders@MIT</span>
				<span class="text-zinc-300">{clock} ET</span>
			</div>
			<div class="boot-chart">
				<svg viewBox="0 0 1000 300" preserveAspectRatio="none">
					<defs>
						<linearGradient id="boot-fill" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0" stop-color="#00DC82" stop-opacity="0.18" />
							<stop offset="1" stop-color="#00DC82" stop-opacity="0" />
						</linearGradient>
					</defs>
					{#each [50, 125, 200, 275] as y}
						<line x1="0" x2="1000" y1={y} y2={y} class="grid" />
					{/each}
					<path d={area} fill="url(#boot-fill)" />
					<path
						d={line}
						fill="none"
						stroke="#00DC82"
						stroke-width="2"
						stroke-linejoin="round"
						vector-effect="non-scaling-stroke"
					/>
				</svg>
				{#if dot}
					<span class="dot" class:live={open} style="left:{dot[0]}%;top:{dot[1]}%"></span>
				{/if}
			</div>
			<div class="boot-foot">
				<span class="status" class:open>{open ? 'Market open' : 'Pre-market'}</span>
				<span class="quote">
					{price.toFixed(2)}
					<span class={chg >= 0 ? 'text-green-electric' : 'text-zinc-400'}
						>{chg >= 0 ? '▲ +' : '▼ '}{chg.toFixed(2)}%</span
					>
				</span>
			</div>
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
		width: min(88vw, 56rem);
		font-variant-numeric: tabular-nums;
	}
	.boot-head,
	.boot-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}
	.boot-head {
		font-size: 0.75rem;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: #71717a;
	}
	.boot-chart {
		position: relative;
		height: clamp(160px, 38vh, 340px);
		margin: 1.25rem 0;
		border-bottom: 1px solid #27272a;
	}
	.boot-chart svg {
		display: block;
		width: 100%;
		height: 100%;
		overflow: visible;
	}
	.grid {
		stroke: rgba(255, 255, 255, 0.05);
		stroke-dasharray: 2 6;
		vector-effect: non-scaling-stroke;
	}
	.dot {
		position: absolute;
		width: 8px;
		height: 8px;
		border-radius: 9999px;
		background: var(--color-green-electric);
		transform: translate(-50%, -50%);
	}
	.dot.live {
		animation: ping 1s ease-out infinite;
	}
	.status {
		border: 1px solid #3f3f46;
		padding: 0.35rem 0.8rem;
		font-size: 0.7rem;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: #71717a;
		transition: color 0.3s, border-color 0.3s, background-color 0.3s;
	}
	.status.open {
		color: var(--color-green-electric);
		border-color: rgb(0 220 130 / 0.4);
		background: rgb(0 220 130 / 0.06);
	}
	.quote {
		font-size: clamp(1rem, 2vw, 1.25rem);
		color: #fafafa;
	}
	.boot-skip {
		margin-top: 2rem;
		font-size: 0.7rem;
		letter-spacing: 0.25em;
		text-transform: uppercase;
		color: #52525b;
	}
	@keyframes ping {
		0% {
			box-shadow: 0 0 0 0 rgb(0 220 130 / 0.6);
		}
		100% {
			box-shadow: 0 0 0 14px rgb(0 220 130 / 0);
		}
	}
</style>
