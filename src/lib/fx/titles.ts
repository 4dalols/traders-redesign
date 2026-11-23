import { randomGlyph } from './ascii';

export const TITLE_FX = [
	{ id: 'sweep', label: 'Green sweep', loop: true },
	{ id: 'glitch', label: 'Glitch', loop: true },
	{ id: 'scan', label: 'Scan line', loop: true },
	{ id: 'neon', label: 'Neon flicker', loop: true },
	{ id: 'glow', label: 'Breathing glow', loop: true },
	{ id: 'drift', label: 'Color drift', loop: true },
	{ id: 'wave', label: 'Wave', loop: true },
	{ id: 'outline', label: 'Outline fill', loop: false },
	{ id: 'rise', label: 'Letter rise', loop: false },
	{ id: 'flap', label: 'Split-flap', loop: false },
	{ id: 'decode', label: 'Decode', loop: false }
] as const;
export type TitleFx = (typeof TITLE_FX)[number]['id'];

const LETTERS = new Set<TitleFx>(['wave', 'rise', 'flap', 'decode']);
const KEY = 'titleFx';
const timers = new WeakMap<HTMLElement, number>();

export const storedFx = (): TitleFx => {
	const v = localStorage.getItem(KEY);
	return TITLE_FX.some((f) => f.id === v) ? (v as TitleFx) : 'sweep';
};
export const storeFx = (fx: TitleFx) => localStorage.setItem(KEY, fx);

/** Wrap every letter in a span (words kept unbreakable); gradient text keeps one continuous gradient. */
function splitLetters(root: HTMLElement) {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	const nodes: Text[] = [];
	while (walker.nextNode()) nodes.push(walker.currentNode as Text);
	let i = 0;
	const gradients: [HTMLElement, HTMLElement][] = [];
	for (const node of nodes) {
		const grad = node.parentElement?.closest<HTMLElement>('[class*="text-gradient"]');
		const frag = document.createDocumentFragment();
		for (const part of (node.textContent ?? '').split(/(\s+)/)) {
			if (!part) continue;
			if (/^\s+$/.test(part)) {
				frag.append(part);
				continue;
			}
			const word = document.createElement('span');
			word.className = 'tfx-w';
			for (const ch of part) {
				const l = document.createElement('span');
				l.className = 'tfx-l';
				l.textContent = ch;
				l.dataset.ch = ch;
				l.style.setProperty('--i', String(i++));
				if (grad) {
					l.className += ' ' + [...grad.classList].filter((c) => c.startsWith('text-gradient')).join(' ');
					gradients.push([l, grad]);
				}
				word.append(l);
			}
			frag.append(word);
		}
		node.replaceWith(frag);
	}
	for (const [l, g] of gradients) {
		const gr = g.getBoundingClientRect();
		const lr = l.getBoundingClientRect();
		l.style.backgroundSize = `${gr.width}px ${lr.height}px`;
		l.style.backgroundPosition = `${gr.left - lr.left}px 0`;
		l.style.backgroundRepeat = 'no-repeat';
	}
	return root.querySelectorAll<HTMLElement>('.tfx-l');
}

function decode(h: HTMLElement, letters: NodeListOf<HTMLElement>) {
	for (const l of letters) l.style.width = `${l.getBoundingClientRect().width}px`;
	const start = performance.now();
	const at = [...letters].map((_, i) => 150 + i * 45 + Math.random() * 350);
	const end = Math.max(...at);
	const tick = (now: number) => {
		const t = now - start;
		letters.forEach((l, i) => {
			const done = t >= at[i];
			l.textContent = done ? l.dataset.ch! : randomGlyph();
			l.classList.toggle('tfx-scr', !done);
		});
		if (t < end) timers.set(h, requestAnimationFrame(tick));
	};
	timers.set(h, requestAnimationFrame(tick));
}

export function applyTitleFx(fx: TitleFx) {
	const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
	for (const h of document.querySelectorAll<HTMLElement>('main h1:not([data-no-decode])')) {
		cancelAnimationFrame(timers.get(h) ?? 0);
		if (h.dataset.orig === undefined) h.dataset.orig = h.innerHTML;
		h.innerHTML = h.dataset.orig;
		for (const c of [...h.classList]) if (c.startsWith('tfx')) h.classList.remove(c);
		if (still) continue;
		h.dataset.text = h.innerText.trim();
		const inner = document.createElement('span');
		inner.className = 'tfx-in';
		inner.append(...h.childNodes);
		h.append(inner);
		void h.offsetWidth;
		h.classList.add('tfx', `tfx-${fx}`);
		if (LETTERS.has(fx)) {
			const letters = splitLetters(inner);
			if (fx === 'decode') decode(h, letters);
		}
	}
}
