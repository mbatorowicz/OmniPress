/**
 * Test usuwania wpisów z GitHub (symulacja withdraw).
 * node scripts/test-github-withdraw.mjs [ścieżka-index.md]
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { decryptSecret } from '../src/lib/crypto.ts';

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

const testPath =
	process.argv[2] ?? 'src/content/news/ug-miedzna/index.md';

const dbUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();

const { rows } = await client.query(`
  SELECT d.config, d.encrypted_credentials
  FROM destinations d
  JOIN site_destinations sd ON sd.destination_id = d.id
  LIMIT 1
`);
await client.end();

if (!rows[0]) {
	console.error('Brak destynacji');
	process.exit(1);
}

const cfg = rows[0].config;
const repo = String(cfg.repo ?? '');
const [owner, repoName] = repo.split('/');
const branch = cfg.branch ?? 'main';
const token = JSON.parse(await decryptSecret(rows[0].encrypted_credentials)).token;

const GH = 'https://api.github.com';
const headers = {
	Authorization: `Bearer ${token}`,
	Accept: 'application/vnd.github+json',
	'X-GitHub-Api-Version': '2022-11-28',
};

const contentsUrl = `${GH}/repos/${owner}/${repoName}/contents/${testPath.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(branch)}`;
const metaRes = await fetch(contentsUrl, { headers });
console.log('GET contents', testPath, metaRes.status);
if (!metaRes.ok) {
	console.log(await metaRes.text());
	process.exit(1);
}

const meta = await metaRes.json();
console.log('sha', meta.sha?.slice(0, 7));

// dry-run: tylko sprawdź ref + tree API (bez commitu)
const refUrl = `${GH}/repos/${owner}/${repoName}/git/ref/heads/${encodeURIComponent(branch)}`;
const refRes = await fetch(refUrl, { headers });
const refJson = await refRes.json();
console.log('ref OK', refRes.status, refJson.object?.sha?.slice(0, 7));

const commitRes = await fetch(`${GH}/repos/${owner}/${repoName}/git/commits/${refJson.object.sha}`, {
	headers,
});
const commitJson = await commitRes.json();
console.log('commit tree', commitRes.status, commitJson.tree?.sha?.slice(0, 7));

console.log('\nDry-run OK — API GitHub działa. Uruchom z --apply aby usunąć testowy wpis.');

if (process.argv.includes('--apply')) {
	const { deleteGitHubFilesBatch, parseGitHubRepoConfig, listGitHubTreeBlobPaths, listGitHubSiblingAssets } =
		await import('../src/lib/publish/github-api.ts');
	const { parseContentLayout } = await import('../src/lib/publish/content-layout.ts');
	const parsed = parseGitHubRepoConfig(cfg);
	const blobs = await listGitHubTreeBlobPaths(parsed, token);
	const paths = [testPath];
	if (parsed.contentLayout === 'folder') {
		for (const p of listGitHubSiblingAssets(blobs, testPath)) paths.push(p);
	}
	console.log('Deleting paths:', paths);
	const result = await deleteGitHubFilesBatch(parsed, token, paths, 'OmniPress: test withdraw');
	console.log('Result:', result);
}
