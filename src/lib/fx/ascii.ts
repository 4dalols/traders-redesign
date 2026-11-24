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

export const GLYPHS = '01234567890123456789$$%%++--.,±';

export const esc = (c: string) =>
	c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c;

export const randomGlyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];

export const handoff: {
	/** Boot dissolve covers the screen: AsciiLogo shows these glyphs ("row,col" → [glyph, colour]) in place. */
	begin?: (cells: Map<string, [string, string]>) => void;
	/** Boot dissolve is nearly gone: resolve the held glyphs into the logo. */
	resolve?: (instant?: boolean) => void;
} = {};

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
