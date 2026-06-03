/**
 * Wysyła nowy link logowania (po naprawie redirect URL).
 * ADMIN_EMAIL=... node scripts/send-login-link.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

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

const email = process.env.ADMIN_EMAIL || 'mbatorowicz@gmail.com';
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const redirectTo = 'https://omni-press.vercel.app/auth/callback';

const supabase = createClient(url, key, {
	auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.auth.admin.generateLink({
	type: 'magiclink',
	email,
	options: { redirectTo },
});

if (error) {
	console.error(error.message);
	process.exit(1);
}

console.log('Link logowania (ważny krótko — otwórz w przeglądarce):\n');
console.log(data.properties.action_link);
