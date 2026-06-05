/**
 * Jednorazowy audyt tabel destynacji w Supabase.
 * Uruchom: node scripts/check-destinations.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

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

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();

const tables = await client.query(`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name LIKE '%dest%'
  ORDER BY 1
`);
console.log('=== TABELE (public, *dest*) ===');
console.log(tables.rows.map((r) => r.table_name).join('\n') || '(brak)');

const dest = await client.query(`
  SELECT d.id, d.name, d.type, d.is_active,
         d.config->>'repo' AS repo,
         d.created_at::date AS created,
         (SELECT count(*)::int FROM site_destinations sd WHERE sd.destination_id = d.id) AS site_links,
         (SELECT count(*)::int FROM publish_logs pl WHERE pl.destination_id = d.id) AS publish_logs
  FROM destinations d
  ORDER BY d.created_at
`);
console.log('\n=== DESTINATIONS ===');
console.log(JSON.stringify(dest.rows, null, 2));

const orphans = await client.query(`
  SELECT d.id, d.name, d.type
  FROM destinations d
  LEFT JOIN site_destinations sd ON sd.destination_id = d.id
  WHERE sd.site_id IS NULL
`);
console.log('\n=== OSIEROCONE (bez site_destinations) ===');
console.log(JSON.stringify(orphans.rows, null, 2));

const sites = await client.query(`
  SELECT s.id, s.name, s.slug, sd.destination_id, d.name AS dest_name, d.type,
         d.config->>'repo' AS repo, sd.is_default
  FROM sites s
  LEFT JOIN site_destinations sd ON sd.site_id = s.id
  LEFT JOIN destinations d ON d.id = sd.destination_id
  ORDER BY s.name
`);
console.log('\n=== SITES + DESTYNACJE ===');
console.log(JSON.stringify(sites.rows, null, 2));

await client.end();
