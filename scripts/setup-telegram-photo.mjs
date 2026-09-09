/**
 * Ustawia zdjęcie profilu bota (herb nie — znak OmniPress).
 * Bot API: setMyProfilePhoto, JPG.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvLocal() {
	const path = resolve(root, '.env.local');
	if (!existsSync(path)) return;
	for (const line of readFileSync(path, 'utf8').split('\n')) {
		const m = line.match(/^\s*([^#=]+)=(.*)$/);
		if (!m) continue;
		const val = m[2].trim().replace(/^["']|["']$/g, '');
		process.env[m[1].trim()] ??= val;
	}
}

loadEnvLocal();

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
if (!token) {
	console.error('Brak TELEGRAM_BOT_TOKEN (.env.local albo env).');
	process.exit(1);
}

const jpgPath = resolve(root, 'public', 'brand', 'telegram-profile.jpg');
if (!existsSync(jpgPath)) {
	console.error('Brak public/brand/telegram-profile.jpg — najpierw: node scripts/raster-brand-icons.mjs');
	process.exit(1);
}

const bytes = new Uint8Array(readFileSync(jpgPath));
const form = new FormData();
form.append('photo', JSON.stringify({ type: 'static', photo: 'attach://pic' }));
form.append('pic', new Blob([bytes], { type: 'image/jpeg' }), 'omnipress.jpg');

const res = await fetch(`https://api.telegram.org/bot${token}/setMyProfilePhoto`, {
	method: 'POST',
	body: form,
});
const body = await res.json();
if (!res.ok || body.ok !== true) {
	console.error('setMyProfilePhoto nie powiodło się:', body);
	process.exit(1);
}

console.log('Zdjęcie profilu bota Telegram ustawione.');
