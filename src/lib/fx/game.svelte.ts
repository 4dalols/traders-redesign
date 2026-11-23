export const game = $state({
	open: false,
	price: 100,
	position: 0,
	cash: 0,
	history: [] as number[]
});

export const pnl = () => game.cash + game.position * game.price;
