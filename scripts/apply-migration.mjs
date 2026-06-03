/**
 * Uruchamia plik migracji SQL na zdalnej bazie.
 * node scripts/apply-migration.mjs path/to/file.sql
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const file = process.argv[2];
if (!file) {
	console.error('Użycie: node scripts/apply-migration.mjs <ścieżka.sql>');
	process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env.local');
if (!existsSync(envPath)) {
	console.error('Brak .env.local — npm run env:pull');
	process.exit(1);
}
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
	const m = line.match(/^\s*([^#=]+)=(.*)$/);
	if (!m) continue;
	process.env[m[1].trim()] ??= m[2].trim().replace(/^["']|["']$/g, '');
}

const sqlPath = resolve(root, file);
const sql = readFileSync(sqlPath, 'utf8');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const client = new pg.Client({
	connectionString: process.env.POSTGRES_URL_NON_POOLING,
	ssl: true,
});
await client.connect();
try {
	await client.query(sql);
	console.log('✓ Migracja zastosowana:', file);
} catch (err) {
	const msg = String(err?.message ?? err);
	if (msg.includes('already exists') || msg.includes('duplicate')) {
		console.log('○ Już zastosowana:', file);
	} else {
		throw err;
	}
} finally {
	await client.end();
}
