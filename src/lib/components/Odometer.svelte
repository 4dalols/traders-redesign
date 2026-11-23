<script lang="ts">
	import { inView } from '$lib/fx/actions';

	let { value, accentClass = 'text-green-electric/25', suffix = '' }: {
		value: string;
		accentClass?: string;
		suffix?: string;
	} = $props();

	const chars = $derived([...value]);
	const digits = [...Array(20).keys()].map((i) => i % 10);
</script>

<span class="odometer" use:inView={0.4} aria-label={value + suffix}>
	{#each chars as ch, i}
		{#if /\d/.test(ch)}
			<span class="odo-digit" aria-hidden="true">
				<span
					class="odo-strip"
					style="--target: {10 + Number(ch)}; transition-delay: {i * 120}ms"
				>
					{#each digits as d}<span>{d}</span>{/each}
				</span>
			</span>
		{:else}
			<span aria-hidden="true">{ch}</span>
		{/if}
	{/each}{#if suffix}<span class={accentClass} aria-hidden="true">{suffix}</span>{/if}
</span>

<style>
	.odometer {
		display: inline-flex;
		line-height: 1;
	}
	.odo-digit {
		display: inline-block;
		height: 1em;
		overflow: hidden;
	}
	.odo-strip {
		display: flex;
		flex-direction: column;
		transform: translateY(0);
		transition: transform 2.2s cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	.odo-strip > span {
		height: 1em;
	}
	:global(.odometer.in-view) .odo-strip {
		transform: translateY(calc(var(--target) * -1em));
	}
</style>
