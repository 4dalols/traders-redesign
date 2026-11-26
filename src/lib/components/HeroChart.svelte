<script lang="ts">
	const W = 1000;
	const H = 500;
	const N = 90;

	let seed = 7;
	const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

	const ys: number[] = [];
	let y = 0.82;
	for (let i = 0; i < N; i++) {
		const trend = 0.82 - (i / (N - 1)) * 0.62;
		y += (rand() - 0.5) * 0.07 + (trend - y) * 0.18;
		ys.push(Math.min(0.92, Math.max(0.08, y)));
	}
	const pts = ys.map((v, i) => [(i / (N - 1)) * W, v * H] as const);
	const line = pts.map(([x, v], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${v.toFixed(1)}`).join(' ');
	const area = `${line} L${W} ${H} L0 ${H} Z`;
	const [endX, endY] = pts[pts.length - 1];
</script>

<svg
	class="hero-chart pointer-events-none absolute right-0 top-[12%] hidden h-[70%] w-[60%] md:block"
	viewBox="0 0 {W} {H}"
	preserveAspectRatio="none"
	aria-hidden="true"
>
	<defs>
		<linearGradient id="hero-chart-fill" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#00DC82" stop-opacity="0.08" />
			<stop offset="1" stop-color="#00DC82" stop-opacity="0" />
		</linearGradient>
		<linearGradient id="hero-chart-fade" x1="0" y1="0" x2="1" y2="0">
			<stop offset="0" stop-color="#fff" stop-opacity="0" />
			<stop offset="0.35" stop-color="#fff" stop-opacity="1" />
		</linearGradient>
		<mask id="hero-chart-mask">
			<rect width={W} height={H} fill="url(#hero-chart-fade)" />
		</mask>
	</defs>
	<g mask="url(#hero-chart-mask)">
		<path class="area" d={area} fill="url(#hero-chart-fill)" />
		<path
			class="line"
			d={line}
			pathLength="1"
			fill="none"
			stroke="#00DC82"
			stroke-opacity="0.35"
			stroke-width="1.5"
			vector-effect="non-scaling-stroke"
		/>
	</g>
	<circle class="dot" cx={endX} cy={endY} r="4" fill="#00DC82" />
</svg>

<style>
	.line {
		stroke-dasharray: 1;
		stroke-dashoffset: 1;
	}
	.area,
	.dot {
		opacity: 0;
	}
	:global(html.booted) .line {
		animation: draw 2.6s cubic-bezier(0.4, 0, 0.2, 1) 0.3s forwards;
	}
	:global(html.booted) .area {
		animation: show 1.2s ease-out 1.6s forwards;
	}
	:global(html.booted) .dot {
		animation: show 0.4s ease-out 2.8s forwards;
	}
	@keyframes draw {
		to {
			stroke-dashoffset: 0;
		}
	}
	@keyframes show {
		to {
			opacity: 0.6;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.line {
			stroke-dashoffset: 0;
		}
		.area,
		.dot {
			opacity: 0.6;
		}
		:global(html.booted) .line,
		:global(html.booted) .area,
		:global(html.booted) .dot {
			animation: none;
		}
	}
</style>
