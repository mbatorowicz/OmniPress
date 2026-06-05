/** Stan wpisów, publish_logs i symulacja ścieżek withdraw. */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env.local');
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
const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();

const posts = await client.query(`
  SELECT status, count(*)::int AS n FROM posts GROUP BY status ORDER BY status
`);
console.log('=== POSTS BY STATUS ===');
console.log(posts.rows);

const logs = await client.query(`
  SELECT pl.status, count(*)::int AS n
  FROM publish_logs pl
  GROUP BY pl.status
  ORDER BY pl.status
`);
console.log('\n=== PUBLISH_LOGS BY STATUS ===');
console.log(logs.rows);

const sample = await client.query(`
  SELECT p.id, p.title, p.slug, p.status,
         pl.status AS log_status, pl.external_id, pl.response_summary
  FROM posts p
  LEFT JOIN publish_logs pl ON pl.post_id = p.id
  ORDER BY p.updated_at DESC
  LIMIT 5
`);
console.log('\n=== SAMPLE POSTS ===');
console.log(JSON.stringify(sample.rows, null, 2));

await client.end();
