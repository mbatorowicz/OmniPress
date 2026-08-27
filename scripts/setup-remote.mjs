/**
 * Jednorazowa konfiguracja zdalnej bazy (migracja + strona UG + admin).
 * Wymaga .env.local z `vercel env pull` lub zmiennych POSTGRES_* / SUPABASE_*.
 *
 * Opcjonalnie: ADMIN_EMAIL + ADMIN_PASSWORD — utworzenie konta, jeśli brak użytkowników.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import { getProductionOrigin } from './lib/app-origin.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const PRODUCTION_ORIGIN = getProductionOrigin();

function loadEnvLocal() {
	const path = resolve(root, '.env.local');
	if (!existsSync(path)) {
		console.error('Brak .env.local — uruchom: vercel env pull .env.local --yes');
		process.exit(1);
	}
	for (const line of readFileSync(path, 'utf8').split('\n')) {
		const m = line.match(/^\s*([^#=]+)=(.*)$/);
		if (!m) continue;
		const key = m[1].trim();
		let val = m[2].trim();
		if (
			(val.startsWith('"') && val.endsWith('"')) ||
			(val.startsWith("'") && val.endsWith("'"))
		) {
			val = val.slice(1, -1);
		}
		if (!process.env[key]) process.env[key] = val;
	}
}

async function applyMigration() {
	const dbUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
	if (!dbUrl) {
		console.error('Brak POSTGRES_URL w .env.local');
		process.exit(1);
	}

	const sqlPath = resolve(
		root,
		'supabase/migrations/20250603000000_initial_schema.sql',
	);
	const sql = readFileSync(sqlPath, 'utf8');
	// Supabase pooler — certyfikat bywa problemem w Node na Windows
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
	const client = new pg.Client({
		connectionString: dbUrl,
		ssl: true,
	});

	await client.connect();
	try {
		await client.query(sql);
		console.log('✓ Migracja SQL zastosowana');
	} catch (err) {
		const msg = String(err?.message ?? err);
		if (msg.includes('already exists') || msg.includes('duplicate')) {
			console.log('○ Schemat już istnieje — pomijam migrację');
		} else {
			throw err;
		}
	} finally {
		await client.end();
	}
}

async function seedSiteAndAdmin() {
	const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
	const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !serviceKey) {
		console.error('Brak SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY');
		process.exit(1);
	}

	const supabase = createClient(url, serviceKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});

	await supabase.from('sites').upsert(
		{ name: 'UG Miedzna', slug: 'ug-miedzna', is_active: true },
		{ onConflict: 'slug' },
	);
	console.log('✓ Strona „UG Miedzna” (ug-miedzna)');

	const { data: listData, error: listErr } = await supabase.auth.admin.listUsers({
		perPage: 50,
	});
	if (listErr) throw listErr;

	let userId = listData?.users?.[0]?.id;

	const adminEmail = process.env.ADMIN_EMAIL;

	if (!userId && adminEmail && process.env.ADMIN_PASSWORD) {
		const { data, error } = await supabase.auth.admin.createUser({
			email: adminEmail,
			password: process.env.ADMIN_PASSWORD,
			email_confirm: true,
			user_metadata: { display_name: 'Administrator' },
		});
		if (error) throw error;
		userId = data.user.id;
		console.log(`✓ Utworzono użytkownika: ${adminEmail}`);
	} else if (!userId && adminEmail) {
		const { data, error } = await supabase.auth.admin.inviteUserByEmail(adminEmail, {
			redirectTo: `${PRODUCTION_ORIGIN}/auth/callback`,
		});
		if (error) throw error;
		userId = data.user.id;
		console.log(`✓ Wysłano zaproszenie na: ${adminEmail} (sprawdź skrzynkę)`);
	}

	if (!userId) {
		console.log(
			'○ Brak użytkowników w Auth. Dodaj w Supabase → Users lub ustaw ADMIN_EMAIL i ADMIN_PASSWORD i uruchom ponownie.',
		);
		return;
	}

	const { data: site } = await supabase
		.from('sites')
		.select('id')
		.eq('slug', 'ug-miedzna')
		.single();

	const { error: profileErr } = await supabase
		.from('profiles')
		.update({
			role: 'admin',
			default_site_id: site?.id ?? null,
		})
		.eq('id', userId);

	if (profileErr) throw profileErr;
	console.log(`✓ Profil ${userId} ustawiony jako admin`);
}

loadEnvLocal();

console.log('OmniPress — konfiguracja zdalna\n');

await applyMigration();
await seedSiteAndAdmin();

console.log(`\nGotowe. Zaloguj się na ${PRODUCTION_ORIGIN}/login`);
