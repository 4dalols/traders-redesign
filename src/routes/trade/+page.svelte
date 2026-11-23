<script lang="ts">
	import { ripple } from '$lib/fx/actions';
	import { onMount } from 'svelte';
	import { game, pnl, trade, flatten, LIMIT } from '$lib/fx/game.svelte';

	const ROWS = 24;
	const AXIS = 9;

	let chartWrap: HTMLDivElement;
	let cols = $state(80);
	let flash = $state<'' | 'buy' | 'sell' | 'reject'>('');
	let qty = $state(1);

	const pad = (s: string, n: number) => s.padStart(n);

	const chartHtml = $derived.by(() => {
		const n = Math.max(10, Math.floor((cols - AXIS) / 2));
		const cs = game.candles.slice(-n);
		if (!cs.length) return '';
		const hi = Math.max(...cs.map((c) => c.h));
		const lo = Math.min(...cs.map((c) => c.l));
		const span = hi - lo || 1;
		const row = (p: number) => Math.round(((hi - p) / span) * (ROWS - 1));
		const priceRow = row(game.price);
		let out = '';
		for (let r = 0; r < ROWS; r++) {
			let line = '';
			for (const c of cs) {
				const top = row(Math.max(c.o, c.c));
				const bot = row(Math.min(c.o, c.c));
				const up = c.c >= c.o;
				const cls = up ? 'u' : 'd';
				let ch = '';
				if (r >= top && r <= bot) ch = `<b class="${cls}">█</b>`;
				else if (r >= row(c.h) && r <= row(c.l)) ch = `<b class="${cls}">│</b>`;
				else ch = r === priceRow ? '<i>╌</i>' : ' ';
				line += ch + (r === priceRow ? '<i>╌</i>' : ' ');
			}
			const label =
				r === priceRow
					? `<em> ${pad(game.price.toFixed(2), 7)}</em>`
					: r % 4 === 0
						? `<s> ${pad((hi - (r / (ROWS - 1)) * span).toFixed(2), 7)}</s>`
						: '';
			out += line + '┤' + label + '\n';
		}
		return out;
	});

	const book = $derived.by(() => {
		const levels = [5, 4, 3, 2, 1].map((i) => ({
			px: +(game.price + 0.05 * i).toFixed(2),
			size: Math.round(5 + Math.abs(Math.sin(game.price * 7 + i)) * 40)
		}));
		const bids = [1, 2, 3, 4, 5].map((i) => ({
			px: +(game.price - 0.05 * i).toFixed(2),
			size: Math.round(5 + Math.abs(Math.cos(game.price * 5 + i)) * 40)
		}));
		return { asks: levels, bids };
	});

	const first = $derived(game.candles[0]);
	const change = $derived(first ? game.price - first.o : 0);
	const bar = (n: number) => '█'.repeat(Math.round(n / 4));

	function act(side: 1 | -1) {
		const ok = trade(side, qty);
		flash = ok ? (side > 0 ? 'buy' : 'sell') : 'reject';
		setTimeout(() => (flash = ''), 200);
	}

	onMount(() => {
		const ro = new ResizeObserver(() => {
			const probe = chartWrap.querySelector('pre');
			const fs = probe ? parseFloat(getComputedStyle(probe).fontSize) : 12;
			cols = Math.floor(chartWrap.clientWidth / (fs * 0.6));
		});
		ro.observe(chartWrap);
		const onKey = (e: KeyboardEvent) => {
			if (e.metaKey || e.ctrlKey || e.altKey) return;
			const k = e.key.toLowerCase();
			if (k === 'b') act(1);
			else if (k === 's') act(-1);
			else if (k === 'f') flatten();
			else if (/^[1-5]$/.test(k)) qty = Number(k);
		};
		window.addEventListener('keydown', onKey);
		return () => {
			ro.disconnect();
			window.removeEventListener('keydown', onKey);
		};
	});
</script>

<svelte:head>
	<title>TMIT Terminal — Traders@MIT</title>
</svelte:head>

<div class="mx-auto max-w-[90rem] px-6 py-12 md:px-12 md:py-16 font-mono">
	<div class="flex flex-wrap items-end justify-between gap-6">
		<div>
			<span class="block text-xs tracking-[0.25em] uppercase text-green-electric/60 mb-3">Paper trading · simulated feed</span>
			<h1 class="font-display text-4xl md:text-6xl font-[800] tracking-[-0.03em] text-zinc-50">TMIT Terminal</h1>
		</div>
		<div class="text-right">
			<div class="text-4xl md:text-5xl font-bold text-zinc-50">{game.price.toFixed(2)}</div>
			<div class={change >= 0 ? 'text-green-electric' : 'text-rose-400'}>
				{change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)} ({((change / (first?.o || 1)) * 100).toFixed(2)}%)
			</div>
		</div>
	</div>

	<div class="mt-10 grid gap-5 lg:grid-cols-12">
		<div
			bind:this={chartWrap}
			class="lg:col-span-9 overflow-hidden border border-zinc-800/60 bg-zinc-900/20 p-4 crt-screen transition-shadow
				{flash === 'buy' ? 'shadow-[0_0_40px_rgba(0,220,130,0.35)]' : flash === 'sell' ? 'shadow-[0_0_40px_rgba(251,113,133,0.35)]' : ''}"
		>
			<div class="mb-3 flex justify-between text-[11px] tracking-[0.2em] text-zinc-500">
				<span>TMIT/USD · 1.8s candles</span>
				<span><span class="text-green-electric">█</span> up <span class="ml-2 text-rose-400">█</span> down</span>
			</div>
			<pre class="chart text-[11px] md:text-[13px]">{@html chartHtml}</pre>
		</div>

		<div class="lg:col-span-3 border border-zinc-800/60 bg-zinc-900/20 p-4 text-xs">
			<div class="mb-3 tracking-[0.2em] text-zinc-500">ORDER BOOK</div>
			{#each book.asks as a}
				<div class="flex justify-between text-rose-400/90"><span>{a.px.toFixed(2)}</span><span class="text-rose-400/40">{bar(a.size)}</span><span>{a.size}</span></div>
			{/each}
			<div class="my-2 border-y border-zinc-800 py-1 text-center text-zinc-200">{game.price.toFixed(2)}</div>
			{#each book.bids as b}
				<div class="flex justify-between text-green-electric/90"><span>{b.px.toFixed(2)}</span><span class="text-green-electric/40">{bar(b.size)}</span><span>{b.size}</span></div>
			{/each}
		</div>

		<div class="lg:col-span-5 border border-zinc-800/60 bg-zinc-900/20 p-5">
			<div class="grid grid-cols-3 gap-3 text-center text-xs">
				<div><div class="text-zinc-500">POSITION</div><div class="mt-1 text-xl text-zinc-100">{game.position > 0 ? '+' : ''}{game.position}</div></div>
				<div><div class="text-zinc-500">CASH</div><div class="mt-1 text-xl text-zinc-100">{game.cash.toFixed(2)}</div></div>
				<div><div class="text-zinc-500">P&amp;L</div><div class="mt-1 text-xl {pnl() >= 0 ? 'text-green-electric' : 'text-rose-400'}">{pnl() >= 0 ? '+' : ''}{pnl().toFixed(2)}</div></div>
			</div>
			<div class="mt-5 flex items-center gap-2 text-xs text-zinc-500">
				QTY
				{#each [1, 2, 3, 4, 5] as q}
					<button
						onclick={() => (qty = q)}
						class="h-7 w-7 border {qty === q ? 'border-green-electric text-green-electric' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}"
					>{q}</button>
				{/each}
				<span class="ml-auto">limit ±{LIMIT}</span>
			</div>
			<div class="mt-4 grid grid-cols-3 gap-3 text-sm font-bold tracking-[0.15em]">
				<button use:ripple onclick={() => act(1)} class="bg-green-electric py-3 text-[#050505] hover:bg-green-bright">[B]UY</button>
				<button onclick={() => act(-1)} class="bg-rose-500 py-3 text-[#050505] hover:bg-rose-400">[S]ELL</button>
				<button onclick={flatten} class="border border-zinc-600 py-3 text-zinc-200 hover:border-zinc-300">[F]LAT</button>
			</div>
			<p class="mt-4 text-[11px] text-zinc-600">
				{flash === 'reject' ? 'REJECTED: position limit' : 'Keys: B buy · S sell · F flatten · 1–5 size · T exit'}
			</p>
		</div>

		<div class="lg:col-span-7 border border-zinc-800/60 bg-zinc-900/20 p-5 text-xs">
			<div class="mb-3 tracking-[0.2em] text-zinc-500">FILLS</div>
			{#if game.fills.length === 0}
				<div class="text-zinc-600">&gt; no fills yet. press B to buy.<span class="animate-pulse">█</span></div>
			{/if}
			{#each game.fills as f}
				<div class="flex gap-4">
					<span class="text-zinc-600">{f.time}</span>
					<span class={f.side === 'BUY' ? 'text-green-electric' : 'text-rose-400'}>FILL {f.side}</span>
					<span class="text-zinc-300">{f.qty} TMIT @ {f.px.toFixed(2)}</span>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.chart {
		margin: 0;
		line-height: 1.05;
		font-family: ui-monospace, Menlo, Consolas, 'DejaVu Sans Mono', 'Courier New', monospace;
		color: #3f3f46;
	}
	.chart :global(b) {
		font-weight: normal;
	}
	.chart :global(.u) {
		color: #00dc82;
		text-shadow: 0 0 6px rgba(0, 220, 130, 0.5);
	}
	.chart :global(.d) {
		color: #fb7185;
		text-shadow: 0 0 6px rgba(251, 113, 133, 0.5);
	}
	.chart :global(i) {
		font-style: normal;
		color: rgba(0, 220, 130, 0.35);
	}
	.chart :global(em) {
		font-style: normal;
		background: #00dc82;
		color: #050505;
	}
	.chart :global(s) {
		text-decoration: none;
		color: #71717a;
	}
</style>
