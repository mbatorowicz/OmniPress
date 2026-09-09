/**
 * Rejestruje webhook Telegrama na produkcji (`/api/telegram/webhook`).
 * Sekret = HMAC-SHA256 tokenu bota (ten sam algorytm co `telegram-webhook-auth.ts`).
 */
import { createHmac } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getProductionOrigin } from './lib/app-origin.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

/** Sync z `src/lib/notify/telegram-webhook-auth.ts`. */
const HMAC_KEY = 'omnipress.telegram.webhook.v1';

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

const url = `${getProductionOrigin()}/api/telegram/webhook`;
const secret_token = createHmac('sha256', HMAC_KEY).update(token).digest('hex');

const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({
		url,
		secret_token,
		allowed_updates: ['callback_query'],
		drop_pending_updates: true,
	}),
});

const body = await res.json();
if (!res.ok || body.ok !== true) {
	console.error('setWebhook nie powiodło się:', body);
	process.exit(1);
}

console.log(`Webhook Telegram: ${url}`);
console.log(body.description ?? 'ok');
