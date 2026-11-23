export type Candle = { o: number; h: number; l: number; c: number };
export type Fill = { side: 'BUY' | 'SELL'; qty: number; px: number; time: string };

export const LIMIT = 10;
const TICKS_PER_CANDLE = 6;
const MAX_CANDLES = 160;

export const game = $state({
	price: 100,
	position: 0,
	cash: 0,
	candles: [] as Candle[],
	fills: [] as Fill[]
});

export const pnl = () => game.cash + game.position * game.price;

let ticks = 0;
let timer: ReturnType<typeof setInterval> | undefined;

function step() {
	const shock = Math.random() < 0.03 ? (Math.random() - 0.5) * 6 : 0;
	game.price = Math.max(1, +(game.price + (Math.random() - 0.5) * 0.9 + shock).toFixed(2));
	const last = game.candles[game.candles.length - 1];
	if (!last || ticks % TICKS_PER_CANDLE === 0) {
		const o = last ? last.c : game.price;
		game.candles.push({ o, h: Math.max(o, game.price), l: Math.min(o, game.price), c: game.price });
		if (game.candles.length > MAX_CANDLES) game.candles.shift();
	} else {
		last.c = game.price;
		last.h = Math.max(last.h, game.price);
		last.l = Math.min(last.l, game.price);
	}
	ticks++;
}

/** Starts the simulated TMIT feed once; it keeps running across page navigations. */
export function startFeed() {
	if (timer) return;
	for (let i = 0; i < 90 * TICKS_PER_CANDLE; i++) step();
	timer = setInterval(step, 300);
}

export function trade(side: 1 | -1, qty = 1) {
	qty = Math.min(qty, LIMIT - side * game.position);
	if (qty <= 0) return false;
	const px = +(game.price + side * 0.05).toFixed(2);
	game.position += side * qty;
	game.cash = +(game.cash - side * qty * px).toFixed(2);
	game.fills.unshift({
		side: side > 0 ? 'BUY' : 'SELL',
		qty,
		px,
		time: new Date().toLocaleTimeString('en-US', { hour12: false })
	});
	game.fills.length = Math.min(game.fills.length, 12);
	return true;
}

export function flatten() {
	if (game.position) trade(game.position > 0 ? -1 : 1, Math.abs(game.position));
}
