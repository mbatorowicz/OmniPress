import fs from 'node:fs';
import path from 'node:path';
import { NEW_LAYOUT_CATEGORIES, SIDEBAR_BANNERS } from './wp-migrate-map.mjs';
import { yamlQuote } from './wp-migrate-html.mjs';

const MAX_SINGLE_BYTES = 50 * 1024 * 1024;

export function newsDir(repoB, slug) {
	return path.join(repoB, 'src/content/news', slug);
}

export function hasIndex(repoB, slug) {
	return fs.existsSync(path.join(newsDir(repoB, slug), 'index.md'));
}

export function readExistingCategory(repoB, slug) {
	const file = path.join(newsDir(repoB, slug), 'index.md');
	if (!fs.existsSync(file)) return null;
	const m = fs.readFileSync(file, 'utf8').match(/^category:\s*"([^"]+)"/m);
	return m?.[1] ?? null;
}

export function buildFrontmatter({ title, date, category, categoryName, extras, cover, gallery, excerpt }) {
	const lines = [
		'---',
		`title: ${yamlQuote(title)}`,
		`date: ${yamlQuote(date)}`,
		'author: "Administrator"',
		`category: ${yamlQuote(category)}`,
		`categoryName: ${yamlQuote(categoryName)}`,
		'draft: false',
	];
	if (cover) lines.push(`coverImage: ${yamlQuote(`./${cover}`)}`);
	if (gallery.length) {
		lines.push(
			`galleryImages: [${gallery.map((f) => yamlQuote(`./${f}`)).join(', ')}]`,
		);
	}
	if (extras.length > 1) {
		lines.push(`categories: [${extras.map((s) => yamlQuote(s)).join(', ')}]`);
	}
	if (excerpt) lines.push(`excerpt: ${yamlQuote(excerpt)}`);
	lines.push('---');
	return lines.join('\n');
}

export async function downloadFile(url, dest) {
	if (fs.existsSync(dest)) return { ok: true, skipped: true, bytes: fs.statSync(dest).size };
	const res = await fetch(url, { headers: { 'User-Agent': 'OmniPress-WP-migrate' } });
	if (!res.ok) return { ok: false, error: `${res.status} ${url}` };
	const buf = Buffer.from(await res.arrayBuffer());
	if (buf.length > MAX_SINGLE_BYTES) {
		return { ok: false, error: `too large ${(buf.length / 1024 / 1024).toFixed(1)} MB: ${url}` };
	}
	fs.mkdirSync(path.dirname(dest), { recursive: true });
	fs.writeFileSync(dest, buf);
	return { ok: true, skipped: false, bytes: buf.length };
}

export function writePost(repoB, slug, frontmatter, body) {
	const dir = newsDir(repoB, slug);
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(path.join(dir, 'index.md'), `${frontmatter}\n\n${body.trim()}\n`, 'utf8');
}

export function updateLayout(repoB) {
	const file = path.join(repoB, 'src/config/omnipress-layout.json');
	const layout = JSON.parse(fs.readFileSync(file, 'utf8'));
	const have = new Set(layout.categories.map((c) => c.slug));
	for (const cat of NEW_LAYOUT_CATEGORIES) {
		if (!have.has(cat.slug)) layout.categories.push(cat);
	}

	const nav = layout.zones?.header?.components?.find((c) => c.component === 'header.navigation');
	const gmina = nav?.widget?.navigation?.find((item) => item.href === '/' || item.label === 'Gmina');
	const inwestycje = gmina?.children?.find((item) => item.label === 'Inwestycje');
	if (inwestycje) inwestycje.href = '/inwestycje';

	const sidebar = layout.zones?.sidebar?.components;
	if (Array.isArray(sidebar)) {
		const ochronaIdx = sidebar.findIndex((c) => c.id === 'slot_1781032181247_hnqvi');
		const insertAt = ochronaIdx >= 0 ? ochronaIdx + 1 : sidebar.length;
		const existingIds = new Set(sidebar.map((c) => c.id));
		const banners = SIDEBAR_BANNERS.filter((b) => !existingIds.has(b.id)).map((b) => ({
			id: b.id,
			label: b.label,
			component: 'sidebar.banner',
			widget: {
				order: b.order,
				style: 'image',
				imageUrl: b.imageUrl,
				linkType: 'category',
				categorySlug: b.categorySlug,
			},
		}));
		sidebar.splice(insertAt, 0, ...banners);
	}

	fs.writeFileSync(file, `${JSON.stringify(layout, null, '\t')}\n`, 'utf8');
}

export function writeRedirects(repoB, postRedirects) {
	const file = path.join(repoB, 'src/config/wp-legacy-redirects.mjs');
	const body = `/** 301 ze starych permalinków WordPressa — generowane przy migracji treści. */\nexport const wpLegacyRedirects = ${JSON.stringify(postRedirects, null, '\t')};\n`;
	fs.writeFileSync(file, body, 'utf8');
}

export function patchAstroConfig(repoB) {
	const file = path.join(repoB, 'astro.config.mjs');
	let src = fs.readFileSync(file, 'utf8');
	if (src.includes('wp-legacy-redirects')) return;
	src = src.replace(
		"import { remarkUnwrapHardWraps } from './src/lib/remark-unwrap-hard-wraps.js';\n",
		"import { remarkUnwrapHardWraps } from './src/lib/remark-unwrap-hard-wraps.js';\n" +
			"import { wpLegacyRedirects } from './src/config/wp-legacy-redirects.mjs';\n",
	);
	src = src.replace('redirects: {', 'redirects: {\n\t\t...wpLegacyRedirects,');
	fs.writeFileSync(file, src, 'utf8');
}
