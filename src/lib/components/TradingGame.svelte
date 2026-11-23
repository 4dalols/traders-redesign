<script lang="ts">
	import { onMount } from 'svelte';
	import { game, pnl } from '$lib/fx/game.svelte';

	const COLS = 44;
	const ROWS = 9;
	const LIMIT = 10;
	let flash = $state<'' | 'buy' | 'sell'>('');

	function tick() {
		const shock = Math.random() < 0.04 ? (Math.random() - 0.5) * 8 : 0;
		game.price = Math.max(1, +(game.price + (Math.random() - 0.5) * 1.6 + shock).toFixed(2));
		game.history = [...game.history.slice(-(COLS - 1)), game.price];
	}

	function trade(side: 1 | -1) {
		if (Math.abs(game.position + side) > LIMIT) return;
		const fill = +(game.price + side * 0.05).toFixed(2);
		game.position += side;
		game.cash = +(game.cash - side * fill).toFixed(2);
		flash = side > 0 ? 'buy' : 'sell';
		setTimeout(() => (flash = ''), 180);
	}

	function flatten() {
		while (game.position !== 0) trade(game.position > 0 ? -1 : 1);
	}

	const chart = $derived.by(() => {
		const h = game.history;
		if (h.length < 2) return [];
		const lo = Math.min(...h);
		const hi = Math.max(...h);
		const span = hi - lo || 1;
		const level = (p: number) => Math.round(((p - lo) / span) * (ROWS - 1));
		const rows: { ch: string; up: boolean }[][] = [];
		for (let r = ROWS - 1; r >= 0; r--) {
			rows.push(
				h.map((p, i) => {
					const prev = h[i - 1] ?? p;
					const a = level(prev);
					const b = level(p);
					const up = p >= prev;
					const ch =
						r === b ? '█' : r < Math.max(a, b) && r > Math.min(a, b) ? '│' : r < b ? '░' : ' ';
					return { ch: ch === '░' ? (i % 2 ? '·' : ' ') : ch, up };
				})
			);
		}
		return rows;
	});

	const change = $derived(
		game.history.length > 1 ? game.price - game.history[game.history.length - 2] : 0
	);

	onMount(() => {
		for (let i = 0; i < COLS; i++) tick();
		const id = setInterval(tick, 450);
		const onKey = (e: KeyboardEvent) => {
			const el = e.target as HTMLElement;
			if (el.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(el.tagName)) return;
			if (e.metaKey || e.ctrlKey || e.altKey) return;
			const k = e.key.toLowerCase();
			if (k === 't') game.open = !game.open;
			else if (!game.open) return;
			else if (k === 'b') trade(1);
			else if (k === 's') trade(-1);
			else if (k === 'f') flatten();
			else if (k === 'escape') game.open = false;
		};
		window.addEventListener('keydown', onKey);
		return () => {
			clearInterval(id);
			window.removeEventListener('keydown', onKey);
		};
	});
</script>

{#if game.open}
	<div
		class="fixed bottom-6 right-6 z-[70] w-[min(92vw,26rem)] border border-green-electric/30 bg-[#050505]/95 p-4 font-mono text-xs shadow-[0_0_60px_rgba(0,220,130,0.15)] backdrop-blur-xl crt-screen
			{flash === 'buy' ? 'ring-2 ring-green-electric' : flash === 'sell' ? 'ring-2 ring-rose-500' : ''}"
		role="dialog"
		aria-label="TMIT trading mini-game"
	>
		<div class="flex items-center justify-between">
			<span class="tracking-[0.2em] text-zinc-400">TMIT · TRADERS@MIT</span>
			<button class="text-zinc-500 hover:text-zinc-200" onclick={() => (game.open = false)} aria-label="Close">[x]</button>
		</div>
		<div class="mt-2 flex items-baseline gap-3">
			<span class="text-2xl font-bold text-zinc-50">{game.price.toFixed(2)}</span>
			<span class={change >= 0 ? 'text-green-electric' : 'text-rose-400'}>
				{change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}
			</span>
		</div>
		<pre class="mt-3 leading-[1.05] text-[11px]">{#each chart as row}{#each row as c}<span class={c.up ? 'text-green-electric' : 'text-rose-400'}>{c.ch}</span>{/each}
{/each}</pre>
		<div class="mt-3 grid grid-cols-3 gap-2 text-center">
			<div><div class="text-zinc-500">POS</div><div class="text-zinc-100">{game.position > 0 ? '+' : ''}{game.position}</div></div>
			<div><div class="text-zinc-500">CASH</div><div class="text-zinc-100">{game.cash.toFixed(2)}</div></div>
			<div><div class="text-zinc-500">P&amp;L</div><div class={pnl() >= 0 ? 'text-green-electric' : 'text-rose-400'}>{pnl() >= 0 ? '+' : ''}{pnl().toFixed(2)}</div></div>
		</div>
		<div class="mt-3 grid grid-cols-3 gap-2">
			<button class="border border-green-electric/40 py-2 text-green-electric hover:bg-green-electric hover:text-black" onclick={() => trade(1)}>[B]UY</button>
			<button class="border border-rose-400/40 py-2 text-rose-400 hover:bg-rose-400 hover:text-black" onclick={() => trade(-1)}>[S]ELL</button>
			<button class="border border-zinc-600 py-2 text-zinc-300 hover:bg-zinc-200 hover:text-black" onclick={flatten}>[F]LAT</button>
		</div>
		<div class="mt-2 text-[10px] tracking-wider text-zinc-600">limit ±{LIMIT} · 5¢ spread · T to hide</div>
	</div>
{/if}
