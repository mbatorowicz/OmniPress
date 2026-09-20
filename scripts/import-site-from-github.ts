/**
 * Wciąga wpisy i strony z origin/main do Omni (jedna jednostka).
 * Token: zaszyfrowany w destynacji albo `GH_TOKEN` / `GITHUB_TOKEN`.
 *   npx --yes tsx --tsconfig tsconfig.json scripts/import-site-from-github.ts sp-miedzna
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listSites } from '@/lib/admin/sites';
import { createServiceSupabase } from '@/lib/supabase/service';
import { ensureSiteFromGitHub } from '@/lib/sync/ensure-site';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(envPath: string) {
	if (!existsSync(envPath)) return;
	for (const line of readFileSync(envPath, 'utf8').split('\n')) {
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
		if (!val) continue;
		if (!process.env[key]) process.env[key] = val;
	}
}

loadEnvFile(resolve(root, '.env.local'));
loadEnvFile(resolve(root, '.env.production.local'));

const slug = process.argv[2]?.trim();
if (!slug) {
	console.error('Podaj slug jednostki, np. sp-miedzna');
	process.exit(1);
}

const supabase = createServiceSupabase();
const site = (await listSites(supabase)).find((row) => row.slug === slug);
if (!site) {
	console.error(`Brak jednostki: ${slug}`);
	process.exit(1);
}

const result = await ensureSiteFromGitHub(supabase, site.id, null);
console.log(JSON.stringify({ slug, siteId: site.id, ...result }));
if (result.error) process.exitCode = 1;
