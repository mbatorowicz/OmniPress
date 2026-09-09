/**
 * Raster z public/favicon.svg: PNG (apple-touch) i JPG (profil Telegrama).
 */
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(resolve(root, 'public', 'favicon.svg'), 'utf8');
const brandDir = resolve(root, 'public', 'brand');
mkdirSync(brandDir, { recursive: true });

const markup = svg.replace(/^<\?xml[^>]*>\s*/, '');
const bg = '#1e4d7b';

async function raster(page, size, { type, quality, path }) {
	await page.setViewportSize({ width: size, height: size });
	const scaled = markup
		.replace(/viewBox="[^"]+"/, `viewBox="0 0 128 128" width="${size}" height="${size}"`);
	await page.setContent(
		`<!doctype html><html><head><style>html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden;background:${bg}}</style></head><body>${scaled}</body></html>`,
	);
	await page.screenshot({
		path,
		type,
		...(type === 'jpeg' ? { quality: quality ?? 92 } : {}),
	});
}

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
await raster(page, 180, {
	type: 'png',
	path: resolve(root, 'public', 'apple-touch-icon.png'),
});
await raster(page, 640, {
	type: 'jpeg',
	quality: 92,
	path: resolve(brandDir, 'telegram-profile.jpg'),
});
await browser.close();
console.log('zapisano apple-touch-icon.png i brand/telegram-profile.jpg');
