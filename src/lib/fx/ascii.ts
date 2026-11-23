export const TRADERS_ART = [
	'████████╗██████╗  █████╗ ██████╗ ███████╗██████╗ ███████╗',
	'╚══██╔══╝██╔══██╗██╔══██╗██╔══██╗██╔════╝██╔══██╗██╔════╝',
	'   ██║   ██████╔╝███████║██║  ██║█████╗  ██████╔╝███████╗',
	'   ██║   ██╔══██╗██╔══██║██║  ██║██╔══╝  ██╔══██╗╚════██║',
	'   ██║   ██║  ██║██║  ██║██████╔╝███████╗██║  ██║███████║',
	'   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚══════╝╚═╝  ╚═╝╚══════╝'
];

export const LOGO_ART = [
	...TRADERS_ART,
	'',
	'             ██████╗ ███╗   ███╗██╗████████╗',
	'            ██╔═══██╗████╗ ████║██║╚══██╔══╝',
	'            ██║██╗██║██╔████╔██║██║   ██║   ',
	'            ██║██║██║██║╚██╔╝██║██║   ██║   ',
	'            ╚█║████╔╝██║ ╚═╝ ██║██║   ██║   ',
	'             ╚╝╚═══╝ ╚═╝     ╚═╝╚═╝   ╚═╝   '
];

export const GLYPHS = '!@#$%&*+=<>?/\\|{}[]~^0123456789ABCDEF$¥€£';

export const esc = (c: string) =>
	c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c;

export const randomGlyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];

/** Resolves once the boot screen has finished (or immediately if it was skipped). */
export function whenBooted(): Promise<void> {
	const html = document.documentElement;
	if (html.classList.contains('booted')) return Promise.resolve();
	return new Promise((resolve) => {
		const mo = new MutationObserver(() => {
			if (html.classList.contains('booted')) {
				mo.disconnect();
				resolve();
			}
		});
		mo.observe(html, { attributes: true, attributeFilter: ['class'] });
	});
}
