import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env.local');
if (existsSync(envPath)) {
	for (const line of readFileSync(envPath, 'utf8').split('\n')) {
		const m = line.match(/^\s*([^#=]+)=(.*)$/);
		if (!m) continue;
		let val = m[2].trim().replace(/^["']|["']$/g, '');
		process.env[m[1].trim()] ??= val;
	}
}

const url = process.env.SUPABASE_URL;
const anon =
	process.env.SUPABASE_ANON_KEY ||
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
	process.env.SUPABASE_PUBLISHABLE_KEY;
const email = process.env.MFA_PROBE_EMAIL;
const password = process.env.MFA_PROBE_PASSWORD;

if (!url || !anon) {
	console.error('Brak SUPABASE_URL / anon key');
	process.exit(1);
}
if (!email || !password) {
	console.error(
		'Ustaw MFA_PROBE_EMAIL i MFA_PROBE_PASSWORD (konto testowe) aby sprawdzić enroll TOTP.',
	);
	process.exit(1);
}

const supabase = createClient(url, anon, {
	auth: { persistSession: false, autoRefreshToken: false },
});

const { data: signIn, error: signInErr } = await supabase.auth.signInWithPassword({
	email,
	password,
});
if (signInErr) {
	console.error('Logowanie:', signInErr.message);
	process.exit(1);
}

const { data: enroll, error: enrollErr } = await supabase.auth.mfa.enroll({
	factorType: 'totp',
	friendlyName: 'probe-' + Date.now(),
});

if (enrollErr) {
	console.error('mfa.enroll:', enrollErr.message, enrollErr.code ?? '');
	process.exit(enrollErr.message.includes('disabled') ? 2 : 1);
}

console.log('✓ TOTP enroll dostępny (MFA włączone w projekcie).');
if (enroll?.id) {
	const { error: unenrollErr } = await supabase.auth.mfa.unenroll({ factorId: enroll.id });
	if (unenrollErr) console.warn('Cleanup unenroll:', unenrollErr.message);
}

await supabase.auth.signOut();
