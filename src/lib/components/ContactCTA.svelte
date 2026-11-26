<script lang="ts">
	import { ripple } from '$lib/fx/actions';

	let { title, text, email, button = 'Email Us' }: {
		title: string;
		text: string;
		email: string;
		button?: string;
	} = $props();
</script>

<div class="relative overflow-hidden border border-green-electric/10 bg-green-electric/[0.02] px-6 py-10 md:p-14 text-center">
	<div class="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-green-electric/30 to-transparent"></div>
	<div class="absolute top-4 left-4 w-8 h-8 border-t border-l border-green-electric/15"></div>
	<div class="absolute bottom-4 right-4 w-8 h-8 border-b border-r border-green-electric/15"></div>

	<h3 class="font-display text-xl md:text-2xl font-[700] text-zinc-50">{title}</h3>
	<p class="mt-3 text-sm text-zinc-300 font-light">{text}</p>
	<a
		href="mailto:{email}"
		use:ripple
		class="group mt-8 inline-flex items-center gap-3 bg-green-electric px-8 py-4 text-sm font-bold uppercase tracking-[0.15em] text-[#050505] transition-all duration-300 hover:bg-green-bright hover:shadow-[0_0_50px_rgba(0,220,130,0.25)] active:scale-[0.97]"
	>
		{button}
		<svg class="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3" />
		</svg>
	</a>
	<p class="mt-4 font-mono text-xs text-zinc-500 break-all">{email}</p>
</div>
