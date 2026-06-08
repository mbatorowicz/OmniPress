/** Uruchom pojedynczą migrację SQL na zdalnej bazie. */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const migrationFile = process.argv[2];
if (!migrationFile) {
	console.error('Użycie: node scripts/apply-migration.mjs supabase/migrations/....sql');
	process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env.local');
if (!existsSync(envPath)) {
	console.error('Brak .env.local');
	process.exit(1);
}
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
	const m = line.match(/^\s*([^#=]+)=(.*)$/);
	if (!m) continue;
	let val = m[2].trim();
	if (
		(val.startsWith('"') && val.endsWith('"')) ||
		(val.startsWith("'") && val.endsWith("'"))
	) {
		val = val.slice(1, -1);
	}
	if (!process.env[m[1].trim()]) process.env[m[1].trim()] = val;
}

const dbUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
if (!dbUrl) {
	console.error('Brak POSTGRES_URL');
	process.exit(1);
}

function pgClientConfig(url) {
	const normalized = url.replace(/^postgres:\/\//, 'postgresql://');
	const parsed = new URL(normalized);
	parsed.searchParams.delete('sslmode');
	return {
		connectionString: parsed.toString(),
		ssl: { rejectUnauthorized: false },
	};
}

const sqlPath = resolve(root, migrationFile);
const sql = readFileSync(sqlPath, 'utf8');
const client = new pg.Client(pgClientConfig(dbUrl));
await client.connect();
await client.query(sql);
console.log('OK:', migrationFile);
await client.end();
