/**
 * Tworzy i publikuje strony statyczne dla linków wewnętrznych z menu Astro.
 * Użycie:
 *   node scripts/seed-nav-pages.mjs --db-only   — tylko baza (bez GitHub)
 *   npm run seed:nav-pages                      — pełna publikacja (wymaga ENCRYPTION_KEY na Vercel)
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE_SLUG = process.env.SITE_SLUG || 'gmina-miedzna-pl';
const SKIP_PATHS = new Set(['/', '/kontakt']);
const PLACEHOLDER = 'Treść strony w przygotowaniu.';
const dbOnly = process.argv.includes('--db-only');
const syncLayout = !dbOnly && !process.argv.includes('--no-sync-layout');

function loadEnvLocal() {
	const envPath = resolve(root, '.env.local');
	if (!existsSync(envPath)) {
		console.error('Brak .env.local — uruchom: npm run env:pull');
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
		const key = m[1].trim();
		if (!val) continue;
		if (!process.env[key]) process.env[key] = val;
	}
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

function isExternalHref(href) {
	return /^https?:\/\//i.test(href.trim());
}

function normalizeInternalHref(href) {
	const trimmed = href.trim().replace(/\/+$/, '');
	if (!trimmed.startsWith('/')) return `/${trimmed}`;
	return trimmed || '/';
}

function parsePublicPath(href) {
	const path = normalizeInternalHref(href);
	const segments = path.slice(1).split('/').filter(Boolean);
	if (segments.length === 1) return { path_prefix: '', slug: segments[0] };
	if (segments.length === 2) return { path_prefix: segments[0], slug: segments[1] };
	return null;
}

function collectNavLinks(items, out = []) {
	for (const item of items) {
		if (item.href?.trim()) {
			out.push({ href: item.href.trim(), label: item.label?.trim() || item.href });
		}
		if (item.children?.length) collectNavLinks(item.children, out);
	}
	return out;
}

function yamlQuote(value) {
	return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function buildSitePageMarkdown(title, pathPrefix, slug, contentMd) {
	const prefix = pathPrefix.trim();
	const prefixLine = prefix ? `\npathPrefix: ${yamlQuote(prefix)}` : '';
	return `---\ntitle: ${yamlQuote(title)}\ntype: page\nslug: ${yamlQuote(slug)}${prefixLine}\ndraft: false\n---\n\n${contentMd.trim()}\n`;
}

function joinContentPath(base, ...parts) {
	const rootPath = base.replace(/^\/+|\/+$/g, '');
	const rest = parts.map((p) => p.replace(/^\/+|\/+$/g, '')).filter(Boolean);
	return [rootPath, ...rest].join('/');
}

function sitePageMarkdownPath(pagesRoot, pathPrefix, slug) {
	const prefix = pathPrefix.trim();
	if (prefix) return joinContentPath(pagesRoot, prefix, slug, 'index.md');
	return joinContentPath(pagesRoot, slug, 'index.md');
}

function encodeGitHubPath(path) {
	return path.split('/').map(encodeURIComponent).join('/');
}

function parseGitHubRepoConfig(config) {
	const repoRaw = String(config.repo ?? '')
		.trim()
		.replace(/\.git$/i, '');
	if (!repoRaw.includes('/')) return null;
	const [owner, repo] = repoRaw.split('/', 2).map((s) => s.trim());
	if (!owner || !repo) return null;
	const branch =
		typeof config.branch === 'string' && config.branch.trim() ? config.branch.trim() : 'main';
	return { owner, repo, branch };
}

function pagesContentPathFromConfig(config) {
	const raw = config.pages_content_path;
	if (typeof raw === 'string' && raw.trim()) return raw.trim().replace(/^\/+|\/+$/g, '');
	return 'src/content/pages';
}

async function decryptSecret(payload) {
	const raw = process.env.ENCRYPTION_KEY;
	if (!raw) throw new Error('Brak ENCRYPTION_KEY w .env.local');
	const key = Uint8Array.from(Buffer.from(raw, 'base64'));
	if (key.length !== 32) throw new Error('ENCRYPTION_KEY musi mieć 32 bajty (base64)');
	const combined = Uint8Array.from(Buffer.from(payload, 'base64'));
	const iv = combined.slice(0, 12);
	const data = combined.slice(12);
	const cryptoKey = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['decrypt']);
	const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, data);
	return new TextDecoder().decode(plain);
}

function ghHeaders(token) {
	return {
		Authorization: `Bearer ${token}`,
		Accept: 'application/vnd.github+json',
		'X-GitHub-Api-Version': '2022-11-28',
		'User-Agent': 'OmniPress',
	};
}

async function getGitHubFile(cfg, token, filePath) {
	const GH_API = 'https://api.github.com';
	const url = `${GH_API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodeGitHubPath(filePath)}?ref=${encodeURIComponent(cfg.branch)}`;
	const res = await fetch(url, { headers: ghHeaders(token) });
	if (res.status === 404) return null;
	if (!res.ok) throw new Error(`GitHub GET ${res.status}: ${(await res.text()).slice(0, 200)}`);
	const json = await res.json();
	if (!json.sha) return null;
	return { sha: json.sha };
}

async function putGitHubFile(cfg, token, filePath, content, message, existingSha) {
	const GH_API = 'https://api.github.com';
	const url = `${GH_API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodeGitHubPath(filePath)}`;
	let sha = existingSha;
	if (!sha) {
		const existing = await getGitHubFile(cfg, token, filePath);
		sha = existing?.sha;
	}
	const body = {
		message,
		content: Buffer.from(content, 'utf8').toString('base64'),
		branch: cfg.branch,
	};
	if (sha) body.sha = sha;
	const res = await fetch(url, {
		method: 'PUT',
		headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	if (!res.ok) throw new Error(`GitHub PUT ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

loadEnvLocal();

const dbUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
if (!dbUrl) {
	console.error('Brak POSTGRES_URL');
	process.exit(1);
}

const client = new pg.Client(pgClientConfig(dbUrl));
await client.connect();

const siteRes = await client.query('select id, name, astro_layout from sites where slug = $1', [
	SITE_SLUG,
]);
const site = siteRes.rows[0];
if (!site) {
	console.error(`Brak jednostki o slug: ${SITE_SLUG}`);
	process.exit(1);
}

const adminRes = await client.query("select id from profiles where role = 'admin' limit 1");
const adminId = adminRes.rows[0]?.id;
if (!adminId) {
	console.error('Brak konta administratora');
	process.exit(1);
}

let cfg = null;
let token = null;
let pagesRoot = 'src/content/pages';

if (!dbOnly) {
	const destRes = await client.query(
		`select d.config, d.encrypted_credentials, d.type
     from destinations d
     join site_destinations sd on sd.destination_id = d.id
     where sd.site_id = $1 and d.type = 'github_astro' and d.is_active = true
     limit 1`,
		[site.id],
	);
	const dest = destRes.rows[0];
	if (!dest?.encrypted_credentials) {
		console.error('Brak aktywnej destynacji GitHub z credentials');
		process.exit(1);
	}

	cfg = parseGitHubRepoConfig(dest.config);
	if (!cfg) {
		console.error('Nieprawidłowa konfiguracja repo');
		process.exit(1);
	}

	const creds = JSON.parse(await decryptSecret(dest.encrypted_credentials));
	token = creds.token;
	if (!token) {
		console.error('Brak tokenu GitHub w credentials');
		process.exit(1);
	}
	pagesRoot = pagesContentPathFromConfig(dest.config);
}

const layout = site.astro_layout ?? {};
const nav = layout.navigation ?? [];
const links = collectNavLinks(nav).filter((l) => !isExternalHref(l.href));

const unique = new Map();
for (const link of links) {
	const normalized = normalizeInternalHref(link.href);
	if (SKIP_PATHS.has(normalized)) continue;
	const parsed = parsePublicPath(normalized);
	if (!parsed) {
		console.warn('Pominięto (zły format):', normalized);
		continue;
	}
	if (!unique.has(normalized)) unique.set(normalized, { ...parsed, title: link.label, href: normalized });
}

const existingRes = await client.query(
	'select id, path_prefix, slug, status, external_id, title from site_pages where site_id = $1',
	[site.id],
);
const existingByPath = new Map(
	existingRes.rows.map((row) => [
		normalizeInternalHref(
			row.path_prefix ? `/${row.path_prefix}/${row.slug}` : `/${row.slug}`,
		),
		row,
	]),
);

let created = 0;
let published = 0;
let skipped = 0;

for (const [href, spec] of unique) {
	let page = existingByPath.get(href);

	if (!page) {
		const insert = await client.query(
			`insert into site_pages (site_id, author_id, title, slug, path_prefix, content_md, status)
       values ($1, $2, $3, $4, $5, $6, 'draft')
       returning id, title, slug, path_prefix, status, external_id`,
			[site.id, adminId, spec.title, spec.slug, spec.path_prefix, PLACEHOLDER],
		);
		page = insert.rows[0];
		created++;
		console.log('Utworzono:', href);
	} else {
		skipped++;
	}

	if (!dbOnly && page.status === 'published' && page.external_id) {
		console.log('Już opublikowana:', href);
		continue;
	}

	if (dbOnly) {
		await client.query(
			`update site_pages set status = 'published', updated_at = now() where id = $1`,
			[page.id],
		);
		published++;
		console.log('Oznaczono opublikowaną (DB):', href);
		continue;
	}

	const filePath = sitePageMarkdownPath(pagesRoot, page.path_prefix, page.slug);
	const body = buildSitePageMarkdown(page.title, page.path_prefix, page.slug, PLACEHOLDER);
	const existing = await getGitHubFile(cfg, token, filePath);
	await putGitHubFile(
		cfg,
		token,
		filePath,
		body,
		`OmniPress: strona ${page.title}`,
		existing?.sha,
	);

	const externalId = `github:${filePath}`;
	await client.query(
		`update site_pages set status = 'published', external_id = $2, updated_at = now() where id = $1`,
		[page.id, externalId],
	);
	published++;
	console.log('Opublikowano:', filePath);
}

if (syncLayout) {
	const navPath =
		typeof layout.navigationPath === 'string' && layout.navigationPath.trim()
			? layout.navigationPath.trim()
			: 'src/data/navigation.json';
	const catPath =
		typeof layout.categoriesPath === 'string' && layout.categoriesPath.trim()
			? layout.categoriesPath.trim()
			: 'omnipress-categories.json';

	const navPayload = `${JSON.stringify(nav, null, '\t')}\n`;
	const catPayload = `${JSON.stringify(
		{
			categories: layout.categories ?? [],
			displays: layout.categoryDisplays ?? {},
			slots: layout.slots ?? [],
			widgets: layout.widgets ?? {},
			banners: layout.banners ?? [],
		},
		null,
		'\t',
	)}\n`;

	const existingNav = await getGitHubFile(cfg, token, navPath);
	await putGitHubFile(cfg, token, navPath, navPayload, 'OmniPress: aktualizacja menu', existingNav?.sha);

	const existingCat = await getGitHubFile(cfg, token, catPath);
	await putGitHubFile(
		cfg,
		token,
		catPath,
		catPayload,
		'OmniPress: kategorie i przypisanie do komponentów',
		existingCat?.sha,
	);
	console.log('Sync layout:', navPath, '+', catPath);
}

await client.end();

console.log(
	`\nGotowe (${site.name}): utworzono ${created}, opublikowano ${published}, istniały ${skipped}, łącznie linków ${unique.size}`,
);
