export const reducedMotion = () =>
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Phones and small screens get a cheaper version of the heavy effects. */
export const lite = () =>
	typeof window !== 'undefined' && window.matchMedia('(pointer: coarse), (max-width: 767px)').matches;

/** Expanding ripple from the click point. */
export function ripple(node: HTMLElement) {
	node.classList.add('ripple-host');
	const down = (e: PointerEvent) => {
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
	node.addEventListener('pointerdown', down);
	return { destroy: () => node.removeEventListener('pointerdown', down) };
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

