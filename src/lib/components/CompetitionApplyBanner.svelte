<script lang="ts">
	import {
		competitionApplyLink,
		competitionApplicationStatus,
		competitionYear
	} from '$lib/data/competitionApplications';
</script>

{#if competitionApplicationStatus === 'open'}
<section
	class="sticky top-20 z-40 border-b border-green-electric/30 bg-gradient-to-r from-green-electric/15 via-green-electric/[0.06] to-violet-accent/10 bg-[#050505]/90"
	aria-label="Competition applications"
>
	<div class="mx-auto flex max-w-[90rem] items-center justify-between gap-x-3 px-6 py-3 md:px-12 md:py-3.5">
		<p class="font-display text-[13px] font-[700] tracking-wide text-zinc-100 sm:text-sm md:text-base">
			<span class="text-green-electric">{competitionYear}</span><span class="hidden sm:inline">{' competition'}</span>{' '}applications<span class="hidden sm:inline">{' are'}</span>{' '}open<span class="hidden sm:inline">.</span>
		</p>
		<a
			href={competitionApplyLink}
			target="_blank"
			rel="noopener noreferrer"
			class="inline-flex shrink-0 items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-green-electric transition-colors hover:text-green-bright md:text-sm"
		>
			Apply<span class="hidden sm:inline">{' here'}</span>
			<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
			</svg>
		</a>
	</div>
</section>
{/if}
