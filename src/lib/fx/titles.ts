/** Page titles: wrap the text so a white → green gradient can flow through it. */
export function applyTitleFx() {
	if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
	for (const h of document.querySelectorAll<HTMLElement>('main h1:not([data-no-decode])')) {
		if (h.querySelector(':scope > .title-drift')) continue;
		const inner = document.createElement('span');
		inner.className = 'title-drift';
		inner.append(...h.childNodes);
		h.append(inner);
	}
}
