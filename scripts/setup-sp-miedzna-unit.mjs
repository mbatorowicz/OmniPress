/**
 * Tworzy jednostkę OmniPress SP Miedzna + destynację github_astro.
 * Wymaga .env.local (POSTGRES_URL). Tokeny: ENCRYPTION_KEY lokalnie albo
 * utworzenie jednostki w panelu (szyfrowanie na Vercel). GH_TOKEN opcjonalny.
 *
 *   node scripts/setup-sp-miedzna-unit.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCHOOL_REPO = resolve(root, '../sp-miedzna.pl');
const SITE_SLUG = 'sp-miedzna';
const SITE_NAME = 'Szkoła Podstawowa im. Tadeusza Kościuszki w Miedznie';

function loadEnvLocal() {
	const envPath = resolve(root, '.env.local');
	if (!existsSync(envPath)) throw new Error('Brak .env.local — npm run env:pull');
	for (const line of readFileSync(envPath, 'utf8').split('\n')) {
		const m = line.match(/^\s*([^#=]+)=(.*)$/);
		if (!m) continue;
		let val = m[2].trim();
		if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
			val = val.slice(1, -1);
		}
		const key = m[1].trim();
		if (val && !process.env[key]) process.env[key] = val;
	}
}

function pgClientConfig(url) {
	const normalized = url.replace(/^postgres:\/\//, 'postgresql://');
	const parsed = new URL(normalized);
	parsed.searchParams.delete('sslmode');
	return { connectionString: parsed.toString(), ssl: { rejectUnauthorized: false } };
}

async function encryptSecret(plain) {
	const raw = process.env.ENCRYPTION_KEY;
	if (!raw) throw new Error('Brak ENCRYPTION_KEY');
	const key = Uint8Array.from(Buffer.from(raw, 'base64'));
	if (key.length !== 32) throw new Error('ENCRYPTION_KEY musi mieć 32 bajty (base64)');
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const encoded = new TextEncoder().encode(plain);
	const cryptoKey = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt']);
	const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, encoded);
	const combined = new Uint8Array(iv.length + cipher.byteLength);
	combined.set(iv);
	combined.set(new Uint8Array(cipher), iv.length);
	return Buffer.from(combined).toString('base64');
}

async function main() {
	loadEnvLocal();
	const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;
	if (!dbUrl) throw new Error('Brak DATABASE_URL');
	const githubToken = (process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '').trim();
	const vercelProjectId = (process.env.SP_VERCEL_PROJECT_ID || '').trim();
	const vercelTeamId = (process.env.SP_VERCEL_TEAM_ID || 'team_JjnRP9uN1jrpTtunsCruc6g9').trim();
	const vercelToken = (process.env.VERCEL_TOKEN || '').trim();

	const layoutPath = resolve(SCHOOL_REPO, 'src/config/omnipress-layout.json');
	if (!existsSync(layoutPath)) throw new Error(`Brak layoutu: ${layoutPath}`);
	const layout = JSON.parse(readFileSync(layoutPath, 'utf8'));

	const config = {
		repo: 'mbatorowicz/sp-miedzna.pl',
		branch: 'main',
		content_path: 'src/content',
		content_layout: 'folder',
		layout_path: 'src/config/omnipress-layout.json',
		categories_path: 'src/config/omnipress-categories.json',
		navigation_path: 'src/config/omnipress-navigation.json',
		recent_changes_path: 'src/config/omnipress-recent-changes.json',
		vercel_project_id: vercelProjectId,
		vercel_team_id: vercelTeamId,
	};

	let encrypted = null;
	if (githubToken && process.env.ENCRYPTION_KEY) {
		const creds = { token: githubToken };
		if (vercelToken) creds.vercel_token = vercelToken;
		encrypted = await encryptSecret(JSON.stringify(creds));
	}

	const client = new pg.Client(pgClientConfig(dbUrl));
	await client.connect();
	try {
		const existing = await client.query('select id from public.sites where slug = $1', [SITE_SLUG]);
		if (existing.rows[0]) {
			const siteId = existing.rows[0].id;
			await client.query('update public.sites set astro_layout = $2::jsonb, name = $3 where id = $1', [
				siteId,
				JSON.stringify(layout),
				SITE_NAME,
			]);
			const dest = await client.query(
				`select d.id from public.destinations d
				 join public.site_destinations sd on sd.destination_id = d.id
				 where sd.site_id = $1
				 limit 1`,
				[siteId],
			);
			if (dest.rows[0]) {
				await client.query('update public.destinations set name = $2, config = $3::jsonb where id = $1', [
					dest.rows[0].id,
					SITE_NAME,
					JSON.stringify(config),
				]);
				if (encrypted) {
					await client.query('update public.destinations set encrypted_credentials = $2 where id = $1', [
						dest.rows[0].id,
						encrypted,
					]);
				}
			}
			console.log(JSON.stringify({ siteId, slug: SITE_SLUG, updated: true, credentials: Boolean(encrypted) }));
			return;
		}
		await client.query('begin');
		const site = await client.query(
			`insert into public.sites (name, slug, is_active, astro_layout)
			 values ($1, $2, true, $3::jsonb)
			 returning id`,
			[SITE_NAME, SITE_SLUG, JSON.stringify(layout)],
		);
		const siteId = site.rows[0].id;
		const dest = await client.query(
			`insert into public.destinations (name, type, config, encrypted_credentials, is_active)
			 values ($1, 'github_astro', $2::jsonb, $3, true)
			 returning id`,
			[SITE_NAME, JSON.stringify(config), encrypted],
		);
		const destId = dest.rows[0].id;
		await client.query(
			`insert into public.site_destinations (site_id, destination_id, is_default)
			 values ($1, $2, true)`,
			[siteId, destId],
		);
		await client.query('commit');
		console.log(JSON.stringify({ siteId, destId, slug: SITE_SLUG }, null, 2));
	} catch (err) {
		await client.query('rollback').catch(() => {});
		throw err;
	} finally {
		await client.end();
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
