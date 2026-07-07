import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

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

const dbUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
const parsed = new URL(dbUrl.replace(/^postgres:\/\//, 'postgresql://'));
parsed.searchParams.delete('sslmode');
const client = new pg.Client({
	connectionString: parsed.toString(),
	ssl: { rejectUnauthorized: false },
});
await client.connect();

const table = await client.query("SELECT to_regclass('public.auth_rate_limits') AS tbl");
const rpc = await client.query(
	"SELECT proname FROM pg_proc WHERE proname = 'check_auth_rate_limit'",
);
console.log('auth_rate_limits table:', table.rows[0].tbl ?? 'MISSING');
console.log('check_auth_rate_limit RPC:', rpc.rowCount > 0 ? 'ok' : 'MISSING');

if (rpc.rowCount > 0) {
	const probe = await client.query(
		"SELECT check_auth_rate_limit('probe:' || gen_random_uuid()::text, 3, 60) AS allowed",
	);
	console.log('RPC probe (fresh key):', probe.rows[0].allowed ? 'allowed' : 'blocked');
}

await client.end();
