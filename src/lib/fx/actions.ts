const finePointer = () =>
	typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
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

/** 3D tilt toward the cursor with a holographic foil shine (expects the .holo class for the shine). */
export function tilt(node: HTMLElement, max = 14) {
	if (!finePointer() || reducedMotion()) return;
	node.classList.add('tilt-card');
	let pending: PointerEvent | null = null;
	const move = (e: PointerEvent) => {
		if (!pending) requestAnimationFrame(apply);
		pending = e;
	};
	const apply = () => {
		const e = pending;
		pending = null;
		if (!e || !node.classList.contains('tilt-armed')) return;
		const r = node.getBoundingClientRect();
		const x = (e.clientX - r.left) / r.width;
		const y = (e.clientY - r.top) / r.height;
		node.style.transform = `perspective(800px) rotateX(${(0.5 - y) * max}deg) rotateY(${(x - 0.5) * max}deg) scale(1.04)`;
		node.style.setProperty('--mx', `${x * 100}%`);
		node.style.setProperty('--my', `${y * 100}%`);
		node.classList.add('tilt-active');
	};
	const enter = () => node.classList.add('tilt-armed');
	const leave = () => {
		node.classList.remove('tilt-armed');
		node.style.transform = '';
		node.classList.remove('tilt-active');
	};
	node.addEventListener('pointerenter', enter);
	node.addEventListener('pointermove', move);
	node.addEventListener('pointerleave', leave);
	return {
		destroy() {
			node.removeEventListener('pointerenter', enter);
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerleave', leave);
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

/** Types the element's text out character by character, ending on a blinking cursor. */
export function typewriter(node: HTMLElement, speed = 45) {
	const cursor = document.createElement('span');
	cursor.className = 'tw-cursor';
	cursor.setAttribute('aria-hidden', 'true');
	if (reducedMotion()) {
		node.appendChild(cursor);
		return { destroy: () => cursor.remove() };
	}
	const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
	const parts: { orig: Text; shown: Text; rest: HTMLSpanElement }[] = [];
	const found: Text[] = [];
	for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.textContent?.trim()) found.push(n as Text);
	for (const orig of found) {
		const shown = document.createTextNode('');
		const rest = document.createElement('span');
		rest.className = 'tw-rest';
		rest.textContent = orig.data;
		orig.replaceWith(shown, rest);
		parts.push({ orig, shown, rest });
	}
	let timer = 0;
	let i = 0;
	const tick = () => {
		const part = parts[i];
		if (!part) return void node.appendChild(cursor);
		const text = part.orig.data;
		let len = part.shown.data.length + 1;
		while (len < text.length && text[len - 1] === ' ') len++;
		part.shown.data = text.slice(0, len);
		part.rest.textContent = text.slice(len);
		part.rest.before(cursor);
		if (len >= text.length) i++;
		timer = window.setTimeout(tick, speed);
	};
	timer = window.setTimeout(tick, 150);
	return {
		destroy() {
			clearTimeout(timer);
			cursor.remove();
			for (const { orig, shown, rest } of parts) {
				shown.replaceWith(orig);
				rest.remove();
			}
		}
	};
}
