/**
 * Ustawia Site URL w Supabase (wymaga tokenu z dashboard).
 * 1. https://supabase.com/dashboard/account/tokens → Generate token
 * 2. Dodaj do .env.local: SUPABASE_ACCESS_TOKEN=sbp_...
 * 3. node scripts/fix-auth-config.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const PROJECT_REF = 'tseticasatzviqhthwbr';
const SITE_URL = 'https://omni-press.vercel.app';
const REDIRECT_URLS =
	'https://omni-press.vercel.app/**,https://omni-press.vercel.app/auth/callback,https://omni-press.vercel.app/auth/reset-password,https://omni-press.vercel.app/auth/recover,http://localhost:4321/**,http://localhost:4321/auth/callback,http://localhost:4321/auth/reset-password';

function loadEnvLocal() {
	const path = resolve(root, '.env.local');
	if (!existsSync(path)) return;
	for (const line of readFileSync(path, 'utf8').split('\n')) {
		const m = line.match(/^\s*([^#=]+)=(.*)$/);
		if (!m) continue;
		let val = m[2].trim().replace(/^["']|["']$/g, '');
		process.env[m[1].trim()] ??= val;
	}
}

loadEnvLocal();

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
	console.error(
		'Brak SUPABASE_ACCESS_TOKEN w .env.local\n\n' +
			'1. Otwórz: https://supabase.com/dashboard/account/tokens\n' +
			'2. Generate new token → skopiuj (sbp_...)\n' +
			'3. W .env.local dodaj linię: SUPABASE_ACCESS_TOKEN=sbp_twoj_token\n' +
			'4. Uruchom ponownie: node scripts/fix-auth-config.mjs\n\n' +
			'LUB ręcznie: https://supabase.com/dashboard/project/' +
			PROJECT_REF +
			'/auth/url-configuration\n' +
			`   Site URL = ${SITE_URL}`,
	);
	process.exit(1);
}

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
	method: 'PATCH',
	headers: {
		Authorization: `Bearer ${token}`,
		'Content-Type': 'application/json',
	},
	body: JSON.stringify({
		site_url: SITE_URL,
		uri_allow_list: REDIRECT_URLS,
	}),
});

if (!res.ok) {
	const text = await res.text();
	console.error('Błąd API:', res.status, text);
	process.exit(1);
}

console.log('✓ Supabase Auth URL zaktualizowany:');
console.log('  Site URL:', SITE_URL);
console.log('  Redirects:', REDIRECT_URLS);
