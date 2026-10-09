// Renders static/icon.svg into the PNG icons the manifest and iOS need.
// Run with `npm run icons` after changing the SVG, then commit the PNGs.
import sharp from 'sharp';

const source = 'static/icon.svg';
const cream = '#FFF7EC';

async function png(size: number, out: string) {
	await sharp(source, { density: 384 }).resize(size, size).png().toFile(out);
}

// Maskable icons are cropped to a circle/squircle by the OS: keep the art inside the
// central 80% safe zone by padding it with the background color.
async function maskable(size: number, out: string) {
	const inner = Math.round(size * 0.8);
	const art = await sharp(source, { density: 384 }).resize(inner, inner).png().toBuffer();
	await sharp({ create: { width: size, height: size, channels: 4, background: cream } })
		.composite([{ input: art, gravity: 'center' }])
		.png()
		.toFile(out);
}

await png(192, 'static/icons/icon-192.png');
await png(512, 'static/icons/icon-512.png');
await maskable(512, 'static/icons/maskable-512.png');
await png(180, 'static/apple-touch-icon.png');
