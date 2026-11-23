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

		const width = Math.max(...ART.map((l) => l.length));
		const resolveAt = ART.map((row) =>
			[...row].map((_, c) => 900 + c * 16 + Math.random() * 500)
		);
		const start = performance.now();
		let raf = 0;
		let done = false;

		const finish = () => {
			if (done) return;
			done = true;
			leaving = true;
			setTimeout(() => {
				show = false;
				html.classList.add('booted');
			}, 600);
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
						const hue = (140 + (c / width) * 140 + r * 6 - t / 8) % 360;
						if (t >= resolveAt[r][c]) {
							out += `<span style="color:hsl(${hue} 95% 62%)">${ch}</span>`;
						} else if (Math.random() < 0.6) {
							const g = GLYPHS[(Math.random() * GLYPHS.length) | 0];
							out += `<span style="color:hsl(${hue} 60% 35%)">${esc(g)}</span>`;
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
		transition:
			opacity 0.6s ease,
			transform 0.6s cubic-bezier(0.7, 0, 0.3, 1),
			filter 0.6s ease;
	}
	:global(html.booted) .boot {
		display: none;
	}
	.boot.leaving {
		opacity: 0;
		transform: scaleY(0.005) scaleX(1.2);
		filter: brightness(3);
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
