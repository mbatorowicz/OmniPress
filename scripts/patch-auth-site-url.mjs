/**
 * Naprawia Site URL w auth.instances (gdy dashboard ma localhost:3000).
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const SITE_URL = 'https://omni-press.vercel.app';
const REDIRECT_URLS = [
	SITE_URL,
	`${SITE_URL}/**`,
	`${SITE_URL}/auth/callback`,
	`${SITE_URL}/auth/reset-password`,
	'http://localhost:4321/**',
	'http://localhost:4321/auth/callback',
	'http://localhost:4321/auth/reset-password',
].join(',');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env.local');
if (!existsSync(envPath)) {
	console.error('Brak .env.local');
	process.exit(1);
}
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
	const m = line.match(/^\s*([^#=]+)=(.*)$/);
	if (!m) continue;
	process.env[m[1].trim()] ??= m[2].trim().replace(/^["']|["']$/g, '');
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const client = new pg.Client({
	connectionString: process.env.POSTGRES_URL_NON_POOLING,
	ssl: true,
});
await client.connect();

const cols = await client.query(
	`SELECT column_name FROM information_schema.columns 
   WHERE table_schema = 'auth' AND table_name = 'instances' ORDER BY ordinal_position`,
);
console.log(
	'Kolumny auth.instances:',
	cols.rows.map((r) => r.column_name).join(', '),
);

const before = await client.query(`SELECT * FROM auth.instances LIMIT 1`);
console.log('Przed:', before.rows[0]);

const row = before.rows[0];
if (!row) {
	console.error('Brak wiersza auth.instances');
	process.exit(1);
}

const updates = [];
const values = [];
let i = 1;

if ('site_url' in row) {
	updates.push(`site_url = $${i++}`);
	values.push(SITE_URL);
}
if ('uri_allow_list' in row) {
	updates.push(`uri_allow_list = $${i++}`);
	values.push(REDIRECT_URLS);
}

if (updates.length === 0) {
	console.error('Nie znaleziono kolumn do aktualizacji');
	process.exit(1);
}

await client.query(`UPDATE auth.instances SET ${updates.join(', ')}`, values);

const after = await client.query(`SELECT * FROM auth.instances LIMIT 1`);
console.log('Po:', after.rows[0]);
await client.end();
console.log('\n✓ Auth URL zaktualizowany');
