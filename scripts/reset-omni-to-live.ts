/**
 * Omni ← origin/main. Zero zapisu na GitHub.
 *   npx --yes tsx --tsconfig tsconfig.json scripts/reset-omni-to-live.ts
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listSites } from '@/lib/admin/sites';
import { createServiceSupabase } from '@/lib/supabase/service';
import { resetOmniToLiveFromGitHub } from '@/lib/sync/reset-to-live';

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

const supabase = createServiceSupabase();
const sites = await listSites(supabase);
if (sites.length === 0) {
	console.error('Brak jednostek');
	process.exit(1);
}

for (const site of sites) {
	const result = await resetOmniToLiveFromGitHub(supabase, site.id, null);
	console.log(JSON.stringify({ slug: site.slug, ...result }));
	if (result.error) process.exitCode = 1;
}
