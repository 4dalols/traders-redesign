const finePointer = () =>
	typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
export const reducedMotion = () =>
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** 3D tilt toward the cursor with a holographic foil shine (expects the .holo class for the shine). */
export function tilt(node: HTMLElement, max = 14) {
	if (!finePointer() || reducedMotion()) return;
	node.classList.add('tilt-card');
	const move = (e: PointerEvent) => {
		const r = node.getBoundingClientRect();
		const x = (e.clientX - r.left) / r.width;
		const y = (e.clientY - r.top) / r.height;
		node.style.transform = `perspective(800px) rotateX(${(0.5 - y) * max}deg) rotateY(${(x - 0.5) * max}deg) scale(1.04)`;
		node.style.setProperty('--mx', `${x * 100}%`);
		node.style.setProperty('--my', `${y * 100}%`);
		node.style.setProperty('--hue', `${Math.round((x + y) * 180)}`);
		node.classList.add('tilt-active');
	};
	const leave = () => {
		node.style.transform = '';
		node.classList.remove('tilt-active');
	};
	node.addEventListener('pointermove', move);
	node.addEventListener('pointerleave', leave);
	return {
		destroy() {
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerleave', leave);
		}
	};
}

/** Pulls the element toward the cursor when it is near, and ripples on click. */
export function magnetic(node: HTMLElement, strength = 0.35) {
	node.classList.add('magnetic');
	const ripple = (e: PointerEvent) => {
		const r = node.getBoundingClientRect();
		const s = document.createElement('span');
		s.className = 'ripple';
		const size = Math.max(r.width, r.height) * 2;
		s.style.width = s.style.height = `${size}px`;
		s.style.left = `${e.clientX - r.left - size / 2}px`;
		s.style.top = `${e.clientY - r.top - size / 2}px`;
		node.appendChild(s);
		setTimeout(() => s.remove(), 700);
	};
	node.addEventListener('pointerdown', ripple);
	if (!finePointer() || reducedMotion())
		return { destroy: () => node.removeEventListener('pointerdown', ripple) };

	const radius = 90;
	const move = (e: PointerEvent) => {
		const r = node.getBoundingClientRect();
		const cx = r.left + r.width / 2;
		const cy = r.top + r.height / 2;
		const dx = e.clientX - cx;
		const dy = e.clientY - cy;
		const near =
			Math.abs(dx) < r.width / 2 + radius && Math.abs(dy) < r.height / 2 + radius;
		node.style.transform = near ? `translate(${dx * strength}px, ${dy * strength}px)` : '';
	};
	window.addEventListener('pointermove', move);
	return {
		destroy() {
			window.removeEventListener('pointermove', move);
			node.removeEventListener('pointerdown', ripple);
		}
	};
}

/** Adds .in-view once the element scrolls into view. */
export function inView(node: HTMLElement, threshold = 0.3) {
	const io = new IntersectionObserver(
		(entries) => {
			if (entries.some((e) => e.isIntersecting)) {
				node.classList.add('in-view');
				io.disconnect();
			}
		},
		{ threshold }
	);
	io.observe(node);
	return { destroy: () => io.disconnect() };
}

/** Scrambles every text node under `node` into random glyphs, then decodes left-to-right. */
export function decode(node: HTMLElement, duration = 900) {
	if (reducedMotion()) return;
	const glyphs = '!<>-_\\/[]{}=+*^?#$%&01';
	let raf = 0;
	const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
	const texts: { n: Text; orig: string }[] = [];
	for (let n = walker.nextNode(); n; n = walker.nextNode())
		if (n.textContent?.trim()) texts.push({ n: n as Text, orig: n.textContent });
	const total = texts.reduce((s, t) => s + t.orig.length, 0);

	const run = () => {
		const start = performance.now();
		const step = (now: number) => {
			const p = Math.min(1, (now - start) / duration);
			let offset = 0;
			for (const { n, orig } of texts) {
				let s = '';
				for (let i = 0; i < orig.length; i++) {
					const ch = orig[i];
					const at = (offset + i) / total;
					s += ch === ' ' || ch === '\n' || p >= at * 0.7 + 0.3 ? ch : glyphs[(Math.random() * glyphs.length) | 0];
				}
				offset += orig.length;
				n.data = s;
			}
			if (p < 1) raf = requestAnimationFrame(step);
		};
		raf = requestAnimationFrame(step);
	};

	const io = new IntersectionObserver(
		(entries) => {
			if (entries.some((e) => e.isIntersecting)) {
				io.disconnect();
				run();
			}
		},
		{ threshold: 0.6 }
	);
	io.observe(node);
	return {
		destroy() {
			io.disconnect();
			cancelAnimationFrame(raf);
			for (const { n, orig } of texts) n.data = orig;
		}
	};
}
