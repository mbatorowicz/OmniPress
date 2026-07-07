/**
 * Włącza TOTP MFA w Supabase Auth (Management API).
 * Wymaga SUPABASE_ACCESS_TOKEN w .env.local (sbp_... z dashboard/account/tokens).
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const PROJECT_REF = 'tseticasatzviqhthwbr';

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
			'1. https://supabase.com/dashboard/account/tokens → Generate token\n' +
			'2. W .env.local: SUPABASE_ACCESS_TOKEN=sbp_...\n' +
			'3. npm run setup:auth-mfa\n\n' +
			'LUB ręcznie: https://supabase.com/dashboard/project/' +
			PROJECT_REF +
			'/auth/mfa',
	);
	process.exit(1);
}

const headers = {
	Authorization: `Bearer ${token}`,
	'Content-Type': 'application/json',
};

const getRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
	headers: { Authorization: `Bearer ${token}` },
});
if (!getRes.ok) {
	console.error('Błąd GET config/auth:', getRes.status, await getRes.text());
	process.exit(1);
}

const before = await getRes.json();
const enroll = before.mfa_totp_enroll_enabled;
const verify = before.mfa_totp_verify_enabled;

if (enroll && verify) {
	console.log('✓ TOTP MFA już włączone (enroll + verify).');
	process.exit(0);
}

const patchRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
	method: 'PATCH',
	headers,
	body: JSON.stringify({
		mfa_totp_enroll_enabled: true,
		mfa_totp_verify_enabled: true,
	}),
});

if (!patchRes.ok) {
	console.error('Błąd PATCH config/auth:', patchRes.status, await patchRes.text());
	process.exit(1);
}

const after = await patchRes.json();
console.log('✓ TOTP MFA włączone:');
console.log('  mfa_totp_enroll_enabled:', after.mfa_totp_enroll_enabled);
console.log('  mfa_totp_verify_enabled:', after.mfa_totp_verify_enabled);
