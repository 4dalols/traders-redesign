<script lang="ts">
	import { onMount, tick } from 'svelte';
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
	let lineCount = $state(0);
	let pre = $state<HTMLPreElement>();
	let dust = $state<HTMLCanvasElement>();
	let dusting = $state(false);

	/** Cover the screen with ASCII, then drop characters at random to reveal the page. */
	function dissolve(covered: () => void, done: () => void) {
		const c = dust;
		const ctx = c?.getContext('2d');
		if (!c || !ctx) {
			covered();
			return done();
		}
		const W = innerWidth;
		const H = innerHeight;
		const dpr = Math.min(devicePixelRatio || 1, 2);
		c.width = W * dpr;
		c.height = H * dpr;
		ctx.scale(dpr, dpr);
		ctx.font = '13px ui-monospace, Menlo, Consolas, monospace';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		const cw = Math.ceil(ctx.measureText('M').width) + 1;
		const ch = 16;
		const cols = Math.ceil(W / cw);
		const rows = Math.ceil(H / ch);
		const n = cols * rows;
		const FILL = 280;
		const appear = new Float32Array(n);
		const vanish = new Float32Array(n);
		const state = new Uint8Array(n); // 0 hidden, 1 shown, 2 cleared
		for (let i = 0; i < n; i++) {
			appear[i] = Math.random() * FILL;
			vanish[i] = FILL + 120 + Math.random() ** 0.8 * 1500;
		}
		const shades = ['#00DC82', '#00DC82', '#00a865', '#0b6b45', '#8cffd0'];
		const draw = (i: number) => {
			const x = (i % cols) * cw;
			const y = ((i / cols) | 0) * ch;
			ctx.fillStyle = '#030303';
			ctx.fillRect(x, y, cw, ch);
			ctx.fillStyle = shades[(Math.random() * shades.length) | 0];
			ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], x + cw / 2, y + ch / 2);
		};
		let isCovered = false;
		const t0 = performance.now();
		const step = (now: number) => {
			const t = now - t0;
			let left = 0;
			for (let i = 0; i < n; i++) {
				if (state[i] === 0 && t >= appear[i]) {
					draw(i);
					state[i] = 1;
				}
				if (state[i] === 1) {
					if (t >= vanish[i]) {
						ctx.clearRect((i % cols) * cw, ((i / cols) | 0) * ch, cw, ch);
						state[i] = 2;
					} else if (Math.random() < 0.03) draw(i);
				}
				if (state[i] !== 2) left++;
			}
			if (!isCovered && t >= FILL) {
				isCovered = true;
				covered();
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
				() => {
					dusting = false;
					html.classList.add('booted');
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
