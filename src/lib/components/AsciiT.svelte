<script lang="ts">
	import { onMount } from 'svelte';
	import { reducedMotion } from '$lib/fx/actions';
	import logoUrl from '$lib/assets/logo.png';

	const W = 70;
	const H = 48;
	const SHADES = '.,-~:;=!*#$@';
	// Logo colors sampled from logo.png: light grey outline and green arrow path.
	const GREY = 85.5; // #DADADA lightness
	const GREEN = 37.8; // #00C173 lightness (hsl 156 100%)
	const CELL = 6; // logo px per mask cell
	const PX = 95; // logo px per world unit
	const DZ = 0.11; // half extrusion depth
	const CAM = 6;
	const FOCAL = 2.2;

	let wrap: HTMLDivElement;
	let pre: HTMLCanvasElement;
	let fontSize = $state(11);
	let dragging = $state(false);

	/** Rasterizes the T glyph of the logo into a coarse mask: 0 empty, 1 grey, 2 green. */
	async function loadMask() {
		const img = new Image();
		img.src = logoUrl;
		await img.decode();
		const full = document.createElement('canvas');
		full.width = img.width;
		full.height = img.height;
		const fctx = full.getContext('2d', { willReadFrequently: true })!;
		fctx.drawImage(img, 0, 0);
		const alpha = fctx.getImageData(0, 0, img.width, img.height).data;
		// The T ends at the first wide run of empty columns.
		let tw = img.width;
		for (let x = 50, gap = 0; x < img.width; x++) {
			let empty = true;
			for (let y = 0; y < img.height && empty; y++) if (alpha[(y * img.width + x) * 4 + 3] > 40) empty = false;
			gap = empty ? gap + 1 : 0;
			if (gap > 15) {
				tw = x - gap + 1;
				break;
			}
		}
		const cols = Math.ceil(tw / CELL);
		const rows = Math.ceil(img.height / CELL);
		const mask = new Uint8Array(cols * rows);
		for (let j = 0; j < rows; j++)
			for (let i = 0; i < cols; i++) {
				let grey = 0, green = 0;
				for (let y = j * CELL; y < Math.min(img.height, (j + 1) * CELL); y++)
					for (let x = i * CELL; x < Math.min(tw, (i + 1) * CELL); x++) {
						const k = (y * img.width + x) * 4;
						if (alpha[k + 3] < 128) continue;
						if (alpha[k + 1] - alpha[k] > 60) green++;
						else grey++;
					}
				const n = grey + green;
				if (n >= (CELL * CELL) / 4) mask[j * cols + i] = green > grey ? 2 : 1;
			}
		return { mask, cols, rows, w: tw, h: img.height };
	}

	onMount(() => {
		const ro = new ResizeObserver(() => {
			fontSize = Math.min(16, wrap.clientWidth / (W * 0.6), 560 / H);
		});
		ro.observe(wrap);

		let yaw = 0.5;
		let pitch = -0.2;
		let vYaw = 0;
		let vPitch = 0;
		let raf = 0;
		let visible = true;
		let lastT = 0;
		let px = 0;
		let py = 0;
		let alive = true;
		const light = (() => {
			const l = [-0.45, 0.6, -0.9];
			const n = Math.hypot(...l);
			return l.map((v) => v / n) as [number, number, number];
		})();

		const DIRS = new Float32Array(W * H * 3);
		for (let r = 0; r < H; r++)
			for (let c = 0; c < W; c++) {
				const u = ((c + 0.5 - W / 2) * 0.6) / (H / 2);
				const v = -(r + 0.5 - H / 2) / (H / 2);
				const dl = Math.hypot(u, v, FOCAL);
				const k = (r * W + c) * 3;
				DIRS[k] = u / dl;
				DIRS[k + 1] = v / dl;
				DIRS[k + 2] = FOCAL / dl;
			}

		let geo: Awaited<ReturnType<typeof loadMask>> | undefined;

		const render = () => {
			if (!geo) return;
			const { mask, cols, rows } = geo;
			const cu = CELL / PX; // cell size in world units
			const hx = (cols * cu) / 2;
			const hy = (rows * cu) / 2;
			const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
			const rot = (x: number, y: number, z: number): [number, number, number] => {
				const x1 = cy * x + sy * z;
				const z1 = -sy * x + cy * z;
				return [x1, cp * y - sp * z1, sp * y + cp * z1];
			};
			const [lx, ly, lz] = rot(...light);
			const [ox, oy, oz] = rot(0, 0, -CAM);
			const ctx = pre.getContext('2d')!;
			const dpr = window.devicePixelRatio || 1;
			const cw = fontSize * 0.6;
			const bw = Math.round(W * cw * dpr), bh = Math.round(H * fontSize * dpr);
			if (pre.width !== bw || pre.height !== bh) {
				pre.width = bw;
				pre.height = bh;
			}
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.clearRect(0, 0, W * cw, H * fontSize);
			ctx.font = `${fontSize}px ui-monospace, Menlo, Consolas, 'DejaVu Sans Mono', 'Courier New', monospace`;
			ctx.textBaseline = 'top';
			let lastColor = '';
			const cuX = (o: number, d: number, h: number, lo: boolean) => {
				if (Math.abs(d) < 1e-9) return Math.abs(o) <= h ? (lo ? -Infinity : Infinity) : lo ? Infinity : -Infinity;
				const a = (-h - o) / d, b = (h - o) / d;
				return lo ? Math.min(a, b) : Math.max(a, b);
			};
			for (let r = 0; r < H; r++) {
				for (let c = 0; c < W; c++) {
					const k = (r * W + c) * 3;
					const ux = DIRS[k], uy = DIRS[k + 1], uz = DIRS[k + 2];
					const x1r = cy * ux + sy * uz;
					const z1r = -sy * ux + cy * uz;
					const dx = x1r, dy = cp * uy - sp * z1r, dz = sp * uy + cp * z1r;
					const x0 = cuX(ox, dx, hx, true), xe = cuX(ox, dx, hx, false);
					const y0 = cuX(oy, dy, hy, true), ye = cuX(oy, dy, hy, false);
					const z0 = cuX(oz, dz, DZ, true), ze = cuX(oz, dz, DZ, false);
					const t0 = Math.max(x0, y0, z0, 0);
					const t1 = Math.min(xe, ye, ze);
					if (!(t0 < t1)) continue;
					// Entry face of the extruded box decides the first normal.
					let axis = t0 === z0 ? 2 : t0 === x0 ? 0 : 1;
					const gx = (ox + dx * t0 + hx) / cu;
					const gy = (hy - (oy + dy * t0)) / cu;
					let i = Math.min(cols - 1, Math.max(0, Math.floor(gx)));
					let j = Math.min(rows - 1, Math.max(0, Math.floor(gy)));
					const sx = dx > 0 ? 1 : -1;
					const sj = dy > 0 ? -1 : 1;
					const tdx = Math.abs(cu / dx);
					const tdy = Math.abs(cu / dy);
					let tmx = t0 + (dx > 0 ? i + 1 - gx : gx - i) * tdx;
					let tmy = t0 + (sj > 0 ? j + 1 - gy : gy - j) * tdy;
					let m = 0;
					for (;;) {
						m = mask[j * cols + i];
						if (m) break;
						if (tmx < tmy) {
							if (tmx > t1) break;
							i += sx;
							tmx += tdx;
							axis = 0;
						} else {
							if (tmy > t1) break;
							j += sj;
							tmy += tdy;
							axis = 1;
						}
						if (i < 0 || i >= cols || j < 0 || j >= rows) break;
					}
					if (!m) continue;
					const nx = axis === 0 ? -sx : 0;
					const ny = axis === 1 ? (dy > 0 ? -1 : 1) : 0;
					const nz = axis === 2 ? (dz > 0 ? -1 : 1) : 0;
					const diff = Math.max(0, nx * lx + ny * ly + nz * lz);
					const hhx = lx - dx, hhy = ly - dy, hhz = lz - dz;
					const spec = Math.max(0, (nx * hhx + ny * hhy + nz * hhz) / (Math.hypot(hhx, hhy, hhz) || 1)) ** 20;
					const L = Math.min(1, 0.22 + diff * 0.7 + spec * 0.5);
					const f = 0.45 + 0.6 * L;
					const color =
						m === 1
							? `hsl(0 0% ${Math.min(96, Math.round((GREY * f) / 3) * 3)}%)`
							: `hsl(156 100% ${Math.min(60, Math.round((GREEN * f) / 3) * 3)}%)`;
					if (color !== lastColor) ctx.fillStyle = lastColor = color;
					ctx.fillText(SHADES[Math.min(11, Math.round(2 + L * 9.5))], c * cw, r * fontSize);
				}
			}
		};

		const frame = (t: number) => {
			raf = requestAnimationFrame(frame);
			if (!lastT) lastT = t;
			const dt = Math.min(50, t - lastT);
			if (!visible || dt < 40) return;
			lastT = t;
			if (!dragging) {
				yaw += vYaw + 0.0011 * dt;
				pitch += vPitch + (-0.2 - pitch) * 0.02;
				vYaw *= 0.95;
				vPitch *= 0.9;
			}
			render();
		};

		const down = (e: PointerEvent) => {
			dragging = true;
			px = e.clientX;
			py = e.clientY;
			pre.setPointerCapture(e.pointerId);
		};
		const move = (e: PointerEvent) => {
			if (!dragging) return;
			const dx = e.clientX - px;
			const dy = e.clientY - py;
			px = e.clientX;
			py = e.clientY;
			yaw += dx * 0.012;
			pitch = Math.max(-1.2, Math.min(1.2, pitch + dy * 0.012));
			vYaw = dx * 0.006;
			vPitch = dy * 0.003;
		};
		const up = () => (dragging = false);
		pre.addEventListener('pointerdown', down);
		pre.addEventListener('pointermove', move);
		pre.addEventListener('pointerup', up);
		pre.addEventListener('pointercancel', up);

		const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
		io.observe(pre);
		loadMask().then((g) => {
			if (!alive) return;
			geo = g;
			if (reducedMotion()) render();
			else raf = requestAnimationFrame(frame);
		});

		return () => {
			alive = false;
			cancelAnimationFrame(raf);
			ro.disconnect();
			io.disconnect();
		};
	});
</script>

<div bind:this={wrap} class="relative w-full select-none">
	<canvas
		bind:this={pre}
		class="ascii-t mx-auto block {dragging ? 'cursor-grabbing' : 'cursor-grab'}"
		style="width: {W * fontSize * 0.6}px; height: {H * fontSize}px"
		aria-hidden="true"></canvas>
	<div class="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-600">drag to spin</div>
</div>

<style>
	.ascii-t {
		touch-action: none;
	}
</style>
