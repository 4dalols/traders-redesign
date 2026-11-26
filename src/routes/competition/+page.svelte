<script lang="ts">
	import { ripple } from '$lib/fx/actions';
	import Odometer from '$lib/components/Odometer.svelte';
	import { competitionImages } from '$lib/data/competition';
	import {
		competitionApplicationDeadline,
		competitionApplicationStatus,
		competitionApplyLink,
		competitionEventDates,
		competitionYear
	} from '$lib/data/competitionApplications';
	import competitionHero from '$lib/assets/competition.jpg';

	const galleryImages = import.meta.glob('$lib/assets/competition/*.jpg', {
		eager: true,
		import: 'default'
	}) as Record<string, string>;

	function getCompImage(filename: string): string {
		const key = `/src/lib/assets/competition/${filename}`;
		return galleryImages[key] || '';
	}

	const competitionDates = competitionEventDates;
	const applicationStatus = competitionApplicationStatus;
	const applyLink = competitionApplyLink;

	const deadlineDisplay = competitionApplicationDeadline.toLocaleDateString('en-US', {
		weekday: 'long',
		month: 'long',
		day: 'numeric',
		year: 'numeric',
		timeZone: 'America/New_York'
	});

	const deadlineShort = competitionApplicationDeadline.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		timeZone: 'America/New_York'
	});

	const facts = [
		{ label: 'When', value: competitionEventDates, sub: 'Two days', stripe: 'from-green-electric to-green-electric/0', valueClass: 'text-zinc-50' },
		{ label: 'Where', value: 'MIT Campus', sub: 'Cambridge, MA', stripe: 'from-violet-accent to-violet-accent/0', valueClass: 'text-zinc-50' },
		{ label: 'Prizes', value: '$20K', odometer: true, sub: 'USD in prizes', stripe: 'from-amber-accent to-amber-accent/0', valueClass: 'font-mono text-green-electric' },
		{ label: 'Apply by', value: deadlineShort, sub: '11:59 PM ET', stripe: 'from-green-electric/60 to-green-electric/0', valueClass: 'text-zinc-50' }
	];

	const tone = {
		green: { card: 'hover:border-green-electric/30', bar: 'from-green-electric via-green-electric/50', icon: 'text-green-electric group-hover:border-green-electric/40', title: 'group-hover:text-green-electric' },
		violet: { card: 'hover:border-violet-accent/30', bar: 'from-violet-accent via-violet-accent/50', icon: 'text-violet-accent group-hover:border-violet-accent/40', title: 'group-hover:text-violet-accent' },
		amber: { card: 'hover:border-amber-accent/30', bar: 'from-amber-accent via-amber-accent/50', icon: 'text-amber-accent group-hover:border-amber-accent/40', title: 'group-hover:text-amber-accent' }
	};

	const expect = [
		{ title: '~120 Competitors', desc: 'Students from MIT, Harvard, Princeton, Stanford, CMU, and more.', c: tone.green, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
		{ title: 'Two-Day Event', desc: `${competitionEventDates} on MIT campus in Cambridge, MA.`, c: tone.violet, icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
		{ title: 'Live Trading Cases', desc: 'Cases designed by our board and released during the competition.', c: tone.amber, icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
		{ title: 'Compete Individually', desc: 'Every competitor trades on their own.', c: tone.green, icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
		{ title: 'Meals & Housing', desc: 'Breakfast, lunch, and housing provided.', c: tone.violet, icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
		{ title: 'Sponsor Networking', desc: 'Networking opportunities with our sponsor firms.', c: tone.amber, icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' }
	];

	// ── Gallery carousel ─────────────────────────────────────────
	let currentSlide = $state(0);
	let galleryInterval: ReturnType<typeof setInterval>;

	function startAutoRotate() {
		galleryInterval = setInterval(() => {
			currentSlide = (currentSlide + 1) % competitionImages.length;
		}, 4000);
	}

	function goToSlide(index: number) {
		currentSlide = index;
		clearInterval(galleryInterval);
		startAutoRotate();
	}

	function nextSlide() {
		goToSlide((currentSlide + 1) % competitionImages.length);
	}

	function prevSlide() {
		goToSlide((currentSlide - 1 + competitionImages.length) % competitionImages.length);
	}

	$effect(() => {
		startAutoRotate();
		return () => clearInterval(galleryInterval);
	});

	function fadeIn(node: HTMLElement) {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						node.classList.add('in-view');
						observer.unobserve(node);
					}
				});
			},
			{ threshold: 0.1 }
		);
		observer.observe(node);
		return { destroy() { observer.disconnect(); } };
	}
</script>

<svelte:head>
	<title>Competition — Traders@MIT</title>
</svelte:head>

<div class="mx-auto max-w-[90rem] px-6 md:px-12 py-16 md:py-24">
	<!-- Page Header -->
	<div class="relative mb-20 md:mb-28">
		<!-- Decorative background text -->
		<span
			class="absolute -top-4 -left-2 md:-top-10 md:-left-4 font-display text-[5rem] md:text-[9rem] lg:text-[12rem] font-[800] leading-none text-stroke text-zinc-800/[0.06] select-none pointer-events-none tracking-tighter"
		>
			19TH
		</span>

		<div class="relative pt-8 md:pt-14 grid md:grid-cols-12 gap-8 lg:gap-14 items-center">
			<!-- Text content -->
			<div class="md:col-span-6">
				<div class="flex items-center gap-4 mb-5">
					<span class="font-mono text-xs tracking-[0.25em] uppercase text-green-electric/70">19th Annual</span>
					<div class="h-[1px] w-12 bg-green-electric/30"></div>
				</div>
				<h1 class="font-display text-5xl md:text-7xl lg:text-8xl font-[800] tracking-[-0.03em] text-zinc-50">
					Trading<br/>
					<span class="text-gradient-green">Competition</span>
				</h1>
				<p class="mt-8 text-lg md:text-xl leading-relaxed text-zinc-300 font-light">
					The largest intercollegiate trading competition, bringing together top students from
					universities across the country.
				</p>
			</div>

			<!-- Hero image — geometric reveal -->
			<div class="md:col-span-6 relative group">
				<!-- Offset decorative frame -->
				<div class="absolute -top-3 -right-3 w-full h-full border border-green-electric/15 z-0 transition-all duration-700 group-hover:border-green-electric/25"></div>

				<!-- Image with diagonal clip -->
				<div class="relative z-10 overflow-hidden" style="clip-path: polygon(0 0, 100% 0, 100% 100%, 6% 100%);">
					<img
						src={competitionHero}
						alt="Trading competition winners with prize check"
						class="w-full aspect-[4/3] object-cover transition-transform duration-700 group-hover:scale-[1.03]"
					/>
				<!-- Left-edge gradient to blend into background -->
				<div class="absolute inset-y-0 left-0 w-2/5 bg-gradient-to-r from-[#050505]/70 to-transparent"></div>
					<!-- Subtle green tint overlay -->
					<div class="absolute inset-0 bg-green-electric/[0.03] mix-blend-overlay"></div>
				</div>

				<!-- Bottom accent line -->
				<div class="absolute -bottom-2 left-[6%] right-0 h-[2px] bg-gradient-to-r from-green-electric/50 via-green-electric/20 to-transparent z-20"></div>

				<!-- Decorative corner bracket bottom-right -->
				<div class="absolute -bottom-4 -right-4 w-10 h-10 border-b-2 border-r-2 border-green-electric/20 z-20"></div>
			</div>
		</div>
	</div>

	<!-- Key facts -->
	<div class="mb-10 md:mb-12 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 stagger-children" use:fadeIn>
		{#each facts as fact}
			<div class="relative pl-5">
				<div class="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b {fact.stripe}"></div>
				<span class="block font-mono text-xs tracking-[0.25em] uppercase text-zinc-500">{fact.label}</span>
				<span class="mt-3 block font-display text-2xl md:text-3xl font-[700] leading-tight {fact.valueClass}">
					{#if fact.odometer}<Odometer value={fact.value} suffix="+" />{:else}{fact.value}{/if}
				</span>
				<span class="mt-1 block text-sm text-zinc-400 font-light">{fact.sub}</span>
			</div>
		{/each}
	</div>

	<!-- Application Status -->
	<div class="fade-in-section mb-20 md:mb-28" use:fadeIn>
		{#if applicationStatus === 'open'}
			<div class="relative overflow-hidden border border-green-electric/20 bg-green-electric/[0.03] p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
				<div class="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-green-electric/60 via-green-electric/20 to-transparent"></div>
				<div class="flex-1">
					<div class="inline-flex items-center gap-2 rounded-full bg-green-electric/10 px-3 py-1 mb-3">
						<span class="h-2 w-2 animate-pulse rounded-full bg-green-electric"></span>
						<span class="font-mono text-xs tracking-[0.2em] uppercase text-green-electric">Applications Open</span>
					</div>
					<h3 class="font-display text-xl md:text-2xl font-[700] text-zinc-50">{competitionYear} Competition</h3>
					<p class="mt-1 text-sm text-zinc-300 font-light">
						Apply by <span class="text-zinc-100 font-normal">{deadlineDisplay} at 11:59 PM ET</span>
					</p>
				</div>
				<a
					href={applyLink}
					target="_blank"
					rel="noopener noreferrer"
					use:ripple
					class="shrink-0 self-start md:self-auto inline-block bg-green-electric px-10 py-4 text-sm font-bold uppercase tracking-[0.15em] text-[#050505] transition-all duration-300 hover:bg-green-bright hover:shadow-[0_0_50px_rgba(0,220,130,0.25)] active:scale-[0.97]"
				>
					Apply Now
				</a>
			</div>
		{:else if applicationStatus === 'not_yet_open'}
			<div class="relative overflow-hidden border border-amber-accent/20 bg-amber-accent/[0.03] p-6 md:p-8">
				<div class="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-amber-accent/50 via-amber-accent/20 to-transparent"></div>
				<div class="inline-flex items-center gap-2 rounded-full bg-amber-accent/10 px-3 py-1 mb-3">
					<span class="h-2 w-2 rounded-full bg-amber-accent"></span>
					<span class="font-mono text-xs tracking-[0.2em] uppercase text-amber-accent/90">Applications Not Yet Open</span>
				</div>
				<h3 class="font-display text-xl md:text-2xl font-[700] text-zinc-50">{competitionYear} Competition</h3>
				<p class="mt-1 text-sm text-zinc-300 font-light max-w-xl">
					We&apos;re planning our {competitionYear} intercollegiate trading competition. Competitor
					applications have not opened yet—check back here for updates.
				</p>
			</div>
		{:else}
			<div class="relative overflow-hidden border border-zinc-800/50 bg-zinc-900/20 p-6 md:p-8">
				<div class="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-zinc-700/50 to-transparent"></div>
				<div class="inline-flex items-center gap-2 rounded-full bg-zinc-800/50 px-3 py-1 mb-3">
					<span class="h-2 w-2 rounded-full bg-zinc-600"></span>
					<span class="font-mono text-xs tracking-[0.2em] uppercase text-zinc-500">Applications Closed</span>
				</div>
				<h3 class="font-display text-xl md:text-2xl font-[700] text-zinc-50">{competitionYear} Competition</h3>
				<p class="mt-1 text-sm text-zinc-300 font-light">
					Applications for the {competitionYear} competition have closed. Stay tuned for updates.
				</p>
			</div>
		{/if}
	</div>

	<!-- What to Expect -->
	<div class="mb-20 md:mb-28">
		<div class="fade-in-section relative mb-10" use:fadeIn>
			<span class="font-mono text-xs tracking-[0.25em] uppercase text-green-electric/50 block mb-3">Overview</span>
			<h2 class="font-display text-3xl md:text-5xl font-[800] tracking-[-0.02em] text-zinc-50">What to Expect</h2>
			<div class="mt-4 h-[2px] w-12 bg-green-electric/40"></div>
		</div>
		<div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 stagger-children" use:fadeIn>
			{#each expect as item}
				<div class="group relative overflow-hidden border border-zinc-800/50 bg-zinc-900/20 p-7 md:p-8 transition-all duration-500 {item.c.card} hover:bg-zinc-900/40">
					<div class="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r {item.c.bar} to-transparent scale-x-0 origin-left transition-transform duration-700 group-hover:scale-x-100"></div>
					<div class="mb-5 flex h-10 w-10 items-center justify-center border border-zinc-700 {item.c.icon} transition-all duration-500">
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d={item.icon} />
						</svg>
					</div>
					<h3 class="font-display text-lg font-[700] text-zinc-100 transition-colors duration-300 {item.c.title}">{item.title}</h3>
					<p class="mt-2 text-sm leading-relaxed text-zinc-400 font-light">{item.desc}</p>
				</div>
			{/each}
		</div>
	</div>

	<!-- Photo Gallery -->
	<div class="fade-in-section" use:fadeIn>
		<div class="relative mb-10">
			<span class="font-mono text-xs tracking-[0.25em] uppercase text-green-electric/50 block mb-3">Photos</span>
			<h2 class="font-display text-3xl md:text-5xl font-[800] tracking-[-0.02em] text-zinc-50">Gallery</h2>
			<div class="mt-4 h-[2px] w-12 bg-green-electric/40"></div>
		</div>

		<div class="relative overflow-hidden border border-zinc-800/50 bg-zinc-900/20">
			<!-- Main image -->
			<div class="relative aspect-[16/9] w-full">
				{#each competitionImages as image, i}
					<img
						src={getCompImage(image)}
						loading="lazy"
						decoding="async"
						alt="Competition photo {i + 1}"
						class="absolute inset-0 h-full w-full object-cover transition-opacity duration-700
							{i === currentSlide ? 'opacity-100' : 'opacity-0'}"
					/>
				{/each}

				<!-- Navigation arrows -->
				<button
					onclick={prevSlide}
					class="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center bg-[#050505]/70 text-zinc-200 backdrop-blur-sm transition-all duration-300 hover:bg-green-electric hover:text-[#050505]"
					aria-label="Previous image"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
				</button>
				<button
					onclick={nextSlide}
					class="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center bg-[#050505]/70 text-zinc-200 backdrop-blur-sm transition-all duration-300 hover:bg-green-electric hover:text-[#050505]"
					aria-label="Next image"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</button>

				<!-- Slide counter -->
				<div class="absolute bottom-4 right-4 bg-[#050505]/70 backdrop-blur-sm px-4 py-2">
					<span class="font-mono text-xs text-zinc-300">
						<span class="text-green-electric">{String(currentSlide + 1).padStart(2, '0')}</span>
						<span class="text-zinc-600 mx-1">/</span>
						<span class="text-zinc-500">{String(competitionImages.length).padStart(2, '0')}</span>
					</span>
				</div>
			</div>

			<!-- Dot indicators -->
			<div class="flex items-center justify-center gap-2 py-5 bg-[#050505]/50">
				{#each competitionImages as _, i}
					<button
						onclick={() => goToSlide(i)}
						class="h-[3px] transition-all duration-500
							{i === currentSlide ? 'w-8 bg-green-electric' : 'w-3 bg-zinc-700 hover:bg-zinc-500'}"
						aria-label="Go to slide {i + 1}"
					></button>
				{/each}
			</div>
		</div>
	</div>
</div>
