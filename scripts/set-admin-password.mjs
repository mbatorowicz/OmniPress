/**
 * Ustawia hasło administratora (logowanie e-mail + hasło na /login).
 * ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/set-admin-password.mjs
 * Bez ADMIN_PASSWORD — wygeneruje losowe i zapisze w .admin-password.txt (gitignore).
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getProductionOrigin } from './lib/app-origin.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const LOGIN_URL = `${getProductionOrigin()}/login`;

function loadEnvLocal() {
	const path = resolve(root, '.env.local');
	if (!existsSync(path)) {
		console.error('Brak .env.local — uruchom: npm run env:pull');
		process.exit(1);
	}
	for (const line of readFileSync(path, 'utf8').split('\n')) {
		const m = line.match(/^\s*([^#=]+)=(.*)$/);
		if (!m) continue;
		let val = m[2].trim().replace(/^["']|["']$/g, '');
		process.env[m[1].trim()] ??= val;
	}
}

function generatePassword() {
	const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#';
	const bytes = randomBytes(16);
	let out = '';
	for (let i = 0; i < 16; i++) out += chars[bytes[i] % chars.length];
	return out;
}

loadEnvLocal();

const email = process.env.ADMIN_EMAIL || 'mbatorowicz@gmail.com';
let password = process.env.ADMIN_PASSWORD;

if (!password) {
	password = generatePassword();
	const outPath = resolve(root, '.admin-password.txt');
	writeFileSync(
		outPath,
		`OmniPress — dane logowania (nie commituj tego pliku)\n\nE-mail: ${email}\nHasło: ${password}\n\nLogowanie: ${LOGIN_URL}\n`,
		'utf8',
	);
	console.log(`Wygenerowano hasło → ${outPath}`);
}

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, serviceKey, {
	auth: { autoRefreshToken: false, persistSession: false },
});

const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 100 });
if (listErr) throw listErr;

const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

let userId;

if (existing) {
	const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
		password,
		email_confirm: true,
	});
	if (error) throw error;
	userId = data.user.id;
	console.log(`✓ Zaktualizowano hasło dla: ${email}`);
} else {
	const { data, error } = await supabase.auth.admin.createUser({
		email,
		password,
		email_confirm: true,
		user_metadata: { display_name: 'Administrator' },
	});
	if (error) throw error;
	userId = data.user.id;
	console.log(`✓ Utworzono konto: ${email}`);
}

await supabase.from('sites').upsert(
	{ name: 'UG Miedzna', slug: 'ug-miedzna', is_active: true },
	{ onConflict: 'slug' },
);

const { data: site } = await supabase
	.from('sites')
	.select('id')
	.eq('slug', 'ug-miedzna')
	.single();

await supabase
	.from('profiles')
	.update({ role: 'admin', default_site_id: site?.id ?? null })
	.eq('id', userId);

console.log('✓ Rola: admin');
console.log('\n--- Zaloguj się ---');
console.log(`URL:   ${LOGIN_URL}`);
console.log(`E-mail: ${email}`);
if (process.env.ADMIN_PASSWORD) {
	console.log('Hasło: (z zmiennej ADMIN_PASSWORD)');
} else {
	console.log('Hasło: zapisane w pliku .admin-password.txt w folderze projektu');
}
