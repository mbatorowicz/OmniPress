/**
 * Ustawia Site URL w Supabase (wymaga tokenu z dashboard).
 * 1. https://supabase.com/dashboard/account/tokens → Generate token
 * 2. Dodaj do .env.local: SUPABASE_ACCESS_TOKEN=sbp_...
 * 3. node scripts/fix-auth-config.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getProductionOrigin } from './lib/app-origin.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const PROJECT_REF = 'tseticasatzviqhthwbr';
const SITE_URL = getProductionOrigin();
const LOCAL_URL = 'http://localhost:4321';
const AUTH_PATHS = ['/**', '/auth/callback', '/auth/reset-password', '/auth/recover'];
const REDIRECT_URLS = [
	...AUTH_PATHS.map((path) => `${SITE_URL}${path}`),
	...AUTH_PATHS.map((path) => `${LOCAL_URL}${path}`),
].join(',');

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
		disable_signup: true,
		mfa_totp_enroll_enabled: true,
		mfa_totp_verify_enabled: true,
	}),
});

if (!res.ok) {
	const text = await res.text();
	console.error('Błąd API:', res.status, text);
	process.exit(1);
}

console.log('✓ Supabase Auth zaktualizowany:');
console.log('  Site URL:', SITE_URL);
console.log('  Redirects:', REDIRECT_URLS);
console.log('  Rejestracja publiczna: wyłączona (disable_signup=true)');
console.log('  MFA TOTP: enroll + verify włączone');
