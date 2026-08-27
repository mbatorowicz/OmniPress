/**
 * Dry-run migracji slugów (podejście 3 audytu).
 *
 * Użycie:
 *   node scripts/migrate-slugs.mjs --dry-run
 *   npm run migrate:slugs:dry-run
 *
 * Bez --apply skrypt tylko raportuje. --apply zarezerwowane dla podejścia 4.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { normalizeSlug } from './lib/normalize-slug.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE_SLUG = process.env.SITE_SLUG || 'gmina-miedzna-pl';
const ASTRO_REPO =
	process.env.ASTRO_REPO ||
	resolve(root, '..', 'gmina-miedzna.pl');
const LAYOUT_PATH =
	process.env.LAYOUT_PATH || join(ASTRO_REPO, 'src', 'config', 'omnipress-layout.json');
const NEWS_ROOT =
	process.env.NEWS_ROOT || join(ASTRO_REPO, 'src', 'content', 'news');

const argv = new Set(process.argv.slice(2));
const dryRun = argv.has('--dry-run') || !argv.has('--apply');
const apply = argv.has('--apply');

if (apply) {
	console.error('Flaga --apply nie jest jeszcze zaimplementowana — użyj podejścia 4 po zatwierdzeniu raportu.');
	process.exit(1);
}

if (!dryRun) {
	console.error('Podaj --dry-run (domyślnie) albo --apply.');
	process.exit(1);
}

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

function yamlField(raw, key) {
	const re = new RegExp(`^${key}:\\s*(.+)$`, 'm');
	const m = raw.match(re);
	if (!m) return '';
	let val = m[1].trim();
	if (
		(val.startsWith('"') && val.endsWith('"')) ||
		(val.startsWith("'") && val.endsWith("'"))
	) {
		val = val.slice(1, -1);
	}
	return val;
}

function parseNewsEntry(dirName, indexPath) {
	const raw = readFileSync(indexPath, 'utf8');
	const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!fm) throw new Error(`Brak front-matter: ${indexPath}`);
	const body = fm[1];
	return {
		dirSlug: dirName,
		title: yamlField(body, 'title'),
		category: yamlField(body, 'category'),
		path: indexPath,
	};
}

function listNewsEntries() {
	if (!existsSync(NEWS_ROOT)) {
		console.error(`Brak katalogu news: ${NEWS_ROOT}`);
		process.exit(1);
	}
	const out = [];
	for (const name of readdirSync(NEWS_ROOT, { withFileTypes: true })) {
		if (!name.isDirectory()) continue;
		const indexPath = join(NEWS_ROOT, name.name, 'index.md');
		if (!existsSync(indexPath)) continue;
		out.push(parseNewsEntry(name.name, indexPath));
	}
	return out;
}

function loadLayoutFile() {
	if (!existsSync(LAYOUT_PATH)) {
		console.error(`Brak pliku layoutu: ${LAYOUT_PATH}`);
		process.exit(1);
	}
	return JSON.parse(readFileSync(LAYOUT_PATH, 'utf8'));
}

function collectLayoutHrefs(node, out = []) {
	if (node == null || typeof node !== 'object') return out;
	if (Array.isArray(node)) {
		for (const item of node) collectLayoutHrefs(item, out);
		return out;
	}
	if (typeof node.href === 'string' && node.href.trim()) {
		out.push({
			href: node.href.trim(),
			label: node.label?.trim() || node.title?.trim() || node.href,
		});
	}
	for (const value of Object.values(node)) collectLayoutHrefs(value, out);
	return out;
}

function printTable(title, rows) {
	console.log(`\n## ${title} (${rows.length})`);
	if (rows.length === 0) {
		console.log('(brak zmian)');
		return;
	}
	const oldW = Math.max(4, ...rows.map((r) => r.old.length));
	const newW = Math.max(4, ...rows.map((r) => r.new.length));
	console.log(`${'stare'.padEnd(oldW)} → ${'nowe'.padEnd(newW)}  ${'źródło'}`);
	console.log(`${'-'.repeat(oldW)}   ${'-'.repeat(newW)}  ${'-'.repeat(8)}`);
	for (const row of rows) {
		const extra = row.note ? `  (${row.note})` : '';
		console.log(`${row.old.padEnd(oldW)} → ${row.new.padEnd(newW)}  ${row.source}${extra}`);
	}
}

function detectCollisions(label, pairs) {
	const byNew = new Map();
	for (const { old, new: newSlug } of pairs) {
		if (old === newSlug) continue;
		const list = byNew.get(newSlug) ?? [];
		list.push(old);
		byNew.set(newSlug, list);
	}
	const conflicts = [...byNew.entries()].filter(([, olds]) => olds.length > 1);
	if (conflicts.length === 0) return;

	console.error(`\n❌ Kolizja slugów (${label}):`);
	for (const [newSlug, olds] of conflicts) {
		console.error(`  "${newSlug}" ← ${olds.map((o) => `"${o}"`).join(', ')}`);
	}
	process.exit(1);
}

function rewritePublicPath(path, categoryMap, postSlugMap) {
	const trimmed = path.trim().replace(/\/+$/, '') || '/';
	if (trimmed === '/') return trimmed;
	const segments = trimmed.slice(1).split('/').filter(Boolean);
	if (segments.length === 1) {
		const mapped = categoryMap.get(segments[0]);
		return mapped ? `/${mapped}` : trimmed;
	}
	if (segments.length === 2) {
		const [cat, postSlug] = segments;
		const newCat = categoryMap.get(cat) ?? cat;
		const newPost = postSlugMap.get(postSlug) ?? postSlug;
		if (newCat !== cat || newPost !== postSlug) return `/${newCat}/${newPost}`;
		return trimmed;
	}
	return trimmed;
}

function buildRedirects(categoryChanges, postChanges, newsEntries) {
	const categoryMap = new Map(categoryChanges.map((r) => [r.old, r.new]));
	const postSlugMap = new Map(postChanges.map((r) => [r.old, r.new]));
	const redirects = new Map();

	for (const { old, new: newSlug } of categoryChanges) {
		redirects.set(`/${old}`, `/${newSlug}`);
	}

	for (const entry of newsEntries) {
		const oldPostSlug = entry.dirSlug;
		const newPostSlug = postSlugMap.get(oldPostSlug) ?? oldPostSlug;
		const oldCategory = entry.category;
		const newCategory = categoryMap.get(oldCategory) ?? oldCategory;
		const oldPath = `/${oldCategory}/${oldPostSlug}`;
		const newPath = `/${newCategory}/${newPostSlug}`;
		if (oldPath !== newPath) redirects.set(oldPath, newPath);
	}

	return [...redirects.entries()]
		.sort(([a], [b]) => a.localeCompare(b, 'pl'))
		.map(([from, to]) => ({ from, to }));
}

function formatAstroRedirects(redirectEntries) {
	if (redirectEntries.length === 0) return 'redirects: {},';
	const lines = redirectEntries.map(
		({ from, to }) => `\t\t'${from.replace(/'/g, "\\'")}': '${to.replace(/'/g, "\\'")}',`,
	);
	return `redirects: {\n${lines.join('\n')}\n\t},`;
}

loadEnvLocal();

const dbUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
if (!dbUrl) {
	console.error('Brak POSTGRES_URL');
	process.exit(1);
}

console.log('=== Migracja slugów — DRY-RUN ===');
console.log(`Repo Astro: ${ASTRO_REPO}`);
console.log(`Layout:     ${LAYOUT_PATH}`);
console.log(`News:       ${NEWS_ROOT}`);
console.log(`Jednostka:  ${SITE_SLUG}`);
console.log('Nic nie zostanie zmienione.\n');

const layout = loadLayoutFile();
const newsEntries = listNewsEntries();
const navLinks = collectLayoutHrefs(layout);
const uniqueNavLinks = [];
const seenHrefs = new Set();
for (const link of navLinks) {
	if (seenHrefs.has(link.href)) continue;
	seenHrefs.add(link.href);
	uniqueNavLinks.push(link);
}

const client = new pg.Client(pgClientConfig(dbUrl));
await client.connect();

try {
	const siteRes = await client.query('select id from sites where slug = $1', [SITE_SLUG]);
	const siteId = siteRes.rows[0]?.id;
	if (!siteId) {
		console.error(`Brak jednostki o slug: ${SITE_SLUG}`);
		process.exit(1);
	}

	const postsRes = await client.query(
		`select id, slug, title, category_slug, status
     from posts
     where site_id = $1
       and slug is not null
       and slug <> ''
     order by slug`,
		[siteId],
	);

	const categoryRows = (layout.categories ?? []).map((cat) => ({
		slug: String(cat.slug ?? '').trim(),
		name: String(cat.name ?? '').trim(),
	}));

	const categoryChanges = [];
	for (const cat of categoryRows) {
		if (!cat.slug || !cat.name) continue;
		const next = normalizeSlug(cat.name);
		if (cat.slug === next) continue;
		const slugNormalized = normalizeSlug(cat.slug);
		const slugAsciiOnly = /^[a-z0-9-]+$/.test(cat.slug);
		// Celowe skróty (np. odpady) zostają — migrujemy tylko slugi z polskimi znakami / bez separatorów.
		if (slugAsciiOnly && slugNormalized === cat.slug) continue;
		categoryChanges.push({
			old: cat.slug,
			new: next,
			source: 'omnipress-layout.json',
			note: cat.name,
		});
	}

	const postDirChanges = [];
	const frontmatterCategoryChanges = [];
	for (const entry of newsEntries) {
		const nextSlug = normalizeSlug(entry.title);
		if (entry.dirSlug !== nextSlug) {
			postDirChanges.push({
				old: entry.dirSlug,
				new: nextSlug,
				source: 'src/content/news/',
				note: entry.title,
			});
		}
		const mappedCategory = categoryChanges.find((c) => c.old === entry.category);
		if (mappedCategory) {
			frontmatterCategoryChanges.push({
				old: entry.category,
				new: mappedCategory.new,
				source: entry.dirSlug,
				note: `category w ${entry.dirSlug}/index.md`,
			});
		}
	}

	const dbPostChanges = [];
	for (const row of postsRes.rows) {
		const next = normalizeSlug(row.title);
		if (row.slug !== next) {
			dbPostChanges.push({
				old: row.slug,
				new: next,
				source: `posts (${row.status})`,
				note: row.title,
				id: row.id,
			});
		}
	}

	const categoryMap = new Map(categoryChanges.map((r) => [r.old, r.new]));
	const postSlugMap = new Map(postDirChanges.map((r) => [r.old, r.new]));

	const menuChanges = [];
	const menuDeadLinks = [];
	for (const link of uniqueNavLinks) {
		if (/^https?:\/\//i.test(link.href)) continue;
		const normalized = link.href.trim().replace(/\/+$/, '') || '/';
		const rewritten = rewritePublicPath(normalized, categoryMap, postSlugMap);
		if (rewritten !== normalized) {
			menuChanges.push({
				old: normalized,
				new: rewritten,
				source: 'menu',
				note: link.label,
			});
		} else if (normalized.startsWith('/informacje/')) {
			menuDeadLinks.push({ href: normalized, label: link.label });
		}
	}

	detectCollisions('kategorie', categoryChanges);
	detectCollisions('wpisy (katalogi)', postDirChanges);
	detectCollisions('wpisy (baza)', dbPostChanges);

	const finalPostSlugs = new Set();
	for (const entry of newsEntries) {
		const slug = postSlugMap.get(entry.dirSlug) ?? entry.dirSlug;
		if (finalPostSlugs.has(slug)) {
			console.error(`\n❌ Kolizja końcowych slugów wpisów: "${slug}"`);
			process.exit(1);
		}
		finalPostSlugs.add(slug);
	}

	printTable('Baza OmniPress — posts.slug', dbPostChanges);
	printTable('Repo Astro — katalogi src/content/news/', postDirChanges);
	printTable('Layout — categories[].slug', categoryChanges);
	printTable('Front-matter — pole category', frontmatterCategoryChanges);
	printTable('Menu — href', menuChanges);

	if (menuDeadLinks.length > 0) {
		console.log(`\n## Martwe linki menu (P0-6, poza migracją slugów) (${menuDeadLinks.length})`);
		for (const link of menuDeadLinks) {
			console.log(`  ${link.href}  — ${link.label}`);
		}
	}

	const redirectEntries = buildRedirects(categoryChanges, postDirChanges, newsEntries);
	console.log(`\n## Przekierowania 301 dla astro.config.mjs (${redirectEntries.length})`);
	console.log('// Wklej do defineConfig({ … }) w repo Astro:\n');
	console.log(formatAstroRedirects(redirectEntries));

	console.log('\n## Podsumowanie');
	console.log(
		[
			`wpisy (repo): ${postDirChanges.length}/${newsEntries.length}`,
			`kategorie: ${categoryChanges.length}/${categoryRows.length}`,
			`category we front-matter: ${frontmatterCategoryChanges.length}`,
			`menu href: ${menuChanges.length}/${uniqueNavLinks.length}`,
			`posts.slug (baza): ${dbPostChanges.length}/${postsRes.rows.length}`,
			`redirects: ${redirectEntries.length}`,
		].join(' · '),
	);

	const expected = {
		posts: 7,
		categories: 2,
		frontmatter: 6,
		menu: 10,
		db: 7,
	};
	const checks = [
		['wpisy (repo)', postDirChanges.length, expected.posts],
		['kategorie', categoryChanges.length, expected.categories],
		['category FM', frontmatterCategoryChanges.length, expected.frontmatter],
		['menu href', menuChanges.length, expected.menu],
		['posts.slug', dbPostChanges.length, expected.db],
	];
	const mismatches = checks.filter(([, actual, exp]) => actual !== exp);
	if (mismatches.length > 0) {
		console.log('\n⚠ Odstępstwa od oczekiwanego zakresu audytu:');
		for (const [label, actual, exp] of mismatches) {
			console.log(`  ${label}: ${actual} (audyt zakładał ${exp})`);
		}
	} else {
		console.log('\n✓ Zakres zgodny z oczekiwaniem audytu (7/2/6/10/7).');
	}

	const repoSlugs = new Set(newsEntries.map((e) => e.dirSlug));
	const dbSlugs = new Set(postsRes.rows.map((r) => r.slug));
	const onlyInRepo = [...repoSlugs].filter((s) => !dbSlugs.has(s));
	const onlyInDb = [...dbSlugs].filter((s) => !repoSlugs.has(s));
	if (onlyInRepo.length > 0 || onlyInDb.length > 0) {
		console.log('\n⚠ Rozjazd baza ↔ repo (same slugi katalogów):');
		if (onlyInRepo.length) console.log(`  tylko w repo: ${onlyInRepo.join(', ')}`);
		if (onlyInDb.length) console.log(`  tylko w bazie: ${onlyInDb.join(', ')}`);
	}
} finally {
	await client.end();
}
