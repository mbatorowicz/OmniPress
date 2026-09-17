/**
 * Migracja WordPress SP Miedzna → repo Astro `sp-miedzna.pl`.
 * Użycie: node scripts/migrate-wp-sp-miedzna.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import {
	decodeHtml,
	excerptFrom,
	htmlToMarkdown,
	kindFromUrl,
	slugifyFilename,
	uniqueFilename,
	yamlQuote,
} from './lib/wp-migrate-html.mjs';
import { cleanMarkdownArtifacts } from './lib/clean-md-artifacts.mjs';
import { writeRedirects } from './lib/wp-migrate-fs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WP = 'https://sp-miedzna.pl';
const REPO = path.resolve(__dirname, '../../sp-miedzna.pl');
const NEWS_ROOT = path.join(REPO, 'src/content/news');
const PAGES_ROOT = path.join(REPO, 'src/content/pages');
const UA = { 'User-Agent': 'OmniPress-WP-migrate-sp-miedzna' };
const IMAGE_MAX = 1920;
const MAX_BYTES = 50 * 1024 * 1024;
const EMOJI_RE =
	/\p{RI}\p{RI}|\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|\uFE0F|\u20E3)*(?:\u200D\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|\uFE0F|\u20E3)*)*|[0-9#*]\uFE0F\u20E3/gu;

const YEAR_CATS = {
	5: { slug: 'rok-szkolny-2020-2021', name: 'Rok szkolny 2020/2021' },
	3: { slug: 'rok-szkolny-2021-2022', name: 'Rok szkolny 2021/2022' },
	7: { slug: 'rok-szkolny-2022-2023', name: 'Rok szkolny 2022/2023' },
	8: { slug: 'rok-szkolny-2023-2024', name: 'Rok szkolny 2023/2024' },
	19: { slug: 'rok-szkolny-2024-2025', name: 'Rok szkolny 2024/2025' },
	52: { slug: 'rok-szkolny-2025-2026', name: 'Rok szkolny 2025/2026' },
};

const PAGE_MAP = {
	159: { prefix: 'szkola', slug: 'kadra', title: 'Kadra' },
	10: { prefix: 'szkola', slug: 'dokumenty', title: 'Dokumenty' },
	82: { prefix: 'szkola', slug: 'deklaracja-dostepnosci', title: 'Deklaracja dostępności' },
	868: { prefix: 'dla-rodzicow', slug: 'konsultacje', title: 'Konsultacje' },
	837: { prefix: 'dla-rodzicow', slug: 'pielegniarka', title: 'Pielęgniarka' },
	1262: { prefix: 'dla-rodzicow', slug: 'fluoryzacja', title: 'Fluoryzacja' },
	1291: { prefix: 'dla-rodzicow', slug: 'godzina-dla-mlodych-glow', title: 'Godzina dla Młodych Głów' },
	33: { prefix: 'uczniowie', slug: 'samorzad', title: 'Samorząd uczniowski' },
	31: { prefix: 'uczniowie', slug: 'biblioteka', title: 'Biblioteka' },
	29: { prefix: 'uczniowie', slug: 'pedagog', title: 'Pedagog' },
	27: { prefix: 'uczniowie', slug: 'harcerze', title: 'Harcerze' },
	45: { prefix: 'uczniowie', slug: 'przedmioty', title: 'Przedmioty' },
	98: { prefix: 'informacje', slug: 'procedury-zdalnego-nauczania', title: 'Procedury zdalnego nauczania' },
	94: {
		prefix: 'informacje',
		slug: 'procedury-funkcjonowania-szkoly-w-czasie-covid-19',
		title: 'Procedury funkcjonowania szkoły w czasie COVID-19',
	},
	90: {
		prefix: 'informacje',
		slug: 'zasady-zachowania-uczniow-w-czasie-lekcji-online',
		title: 'Zasady zachowania uczniów w czasie lekcji online',
	},
};

const SKIP_PAGES = new Set([1706, 35, 47, 43]);

function stripEmoji(text) {
	return text.replace(EMOJI_RE, '').replace(/[^\S\n]{2,}/g, ' ');
}

function sanitizeWpHtml(html) {
	return html
		.replace(/\[(?:ngg|nggallery|slideshow|gallery)[^\]]*\]/gi, '')
		.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
		.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
		.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
		.replace(/javascript:/gi, '');
}

function stripWpUploads(md) {
	return md
		.replace(/\[[^\]]*\]\(https?:\/\/sp-miedzna\.pl\/wp-content\/[^)]+\)/g, '')
		.replace(/https?:\/\/sp-miedzna\.pl\/wp-content\/[^\s)]+/g, '')
		.replace(/\[[^\]]*\]\(https?:\/\/gmina-miedzna\.pl\/wp-content\/[^)]+\)/g, '')
		.replace(/https?:\/\/gmina-miedzna\.pl\/wp-content\/[^\s)]+/g, '')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

function toMarkdown(html, fileAssets) {
	const cleaned = sanitizeWpHtml(html || '');
	const md = htmlToMarkdown(cleaned, fileAssets);
	return stripEmoji(cleanMarkdownArtifacts(stripWpUploads(md)));
}

async function wpJson(url) {
	const res = await fetch(url, { headers: UA });
	if (!res.ok) throw new Error(`${res.status} ${url}`);
	return { json: await res.json(), headers: res.headers };
}

async function fetchAll(endpoint, fields) {
	const items = [];
	let page = 1;
	for (;;) {
		const url = `${WP}/wp-json/wp/v2/${endpoint}?per_page=50&page=${page}&_fields=${fields}`;
		const { json, headers } = await wpJson(url);
		if (!Array.isArray(json) || json.length === 0) break;
		items.push(...json);
		const total = Number(headers.get('X-WP-TotalPages') || '1');
		if (page >= total) break;
		page += 1;
	}
	return items;
}

async function fetchMedia(parentId) {
	try {
		const { json } = await wpJson(
			`${WP}/wp-json/wp/v2/media?parent=${parentId}&per_page=100&_fields=id,source_url,mime_type,title`,
		);
		return Array.isArray(json) ? json : [];
	} catch {
		return [];
	}
}

async function featuredUrl(id) {
	if (!id) return null;
	try {
		const { json } = await wpJson(`${WP}/wp-json/wp/v2/media/${id}?_fields=source_url`);
		return json.source_url || null;
	} catch {
		return null;
	}
}

function classifyYear(categoryIds) {
	for (const id of categoryIds || []) {
		if (YEAR_CATS[id]) return YEAR_CATS[id];
	}
	return null;
}

function isoDate(post) {
	const raw = post.date_gmt || post.date;
	if (!raw) return new Date().toISOString();
	return raw.endsWith('Z') ? raw : `${raw.replace(' ', 'T')}Z`;
}

function originalUploadUrl(url) {
	try {
		const u = new URL(url, WP);
		u.pathname = u.pathname.replace(/-\d+x\d+(?=\.[a-z0-9]+$)/i, '');
		return u.href;
	} catch {
		return url;
	}
}

function collectContentUrls(html) {
	const found = [];
	const seen = new Set();
	const push = (raw, label) => {
		if (!raw) return;
		const url = originalUploadUrl(raw.startsWith('/') ? `${WP}${raw}` : raw);
		if (!url.includes('/wp-content/uploads/')) return;
		if (seen.has(url)) return;
		seen.add(url);
		found.push({ url, label: decodeHtml(label || '') });
	};
	const fileBlock =
		/<div class="wp-block-file"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
	let m;
	while ((m = fileBlock.exec(html)) !== null) push(m[1], m[2]);
	const hrefs = /(?:href|src|data)=["']([^"']+)["']/gi;
	while ((m = hrefs.exec(html)) !== null) push(m[1], '');
	return found;
}

function isImageKind(kind, mime) {
	if (kind === 'image') return true;
	return typeof mime === 'string' && mime.startsWith('image/');
}

async function saveBinary(url, destDir, wantedName, kind) {
	const res = await fetch(url, { headers: UA });
	if (!res.ok) throw new Error(`${res.status} ${url}`);
	const buf = Buffer.from(await res.arrayBuffer());
	if (buf.length > MAX_BYTES) throw new Error(`too large ${url}`);
	fs.mkdirSync(destDir, { recursive: true });
	if (!isImageKind(kind, res.headers.get('content-type') || '')) {
		const dest = path.join(destDir, wantedName);
		fs.writeFileSync(dest, buf);
		return wantedName;
	}
	const image = sharp(buf, { failOn: 'none' }).rotate();
	const meta = await image.metadata();
	if ((meta.pages ?? 1) > 1) {
		fs.writeFileSync(path.join(destDir, wantedName), buf);
		return wantedName;
	}
	const webpName = wantedName.replace(/\.[a-z0-9]+$/i, '.webp');
	const out = await image
		.resize({ width: IMAGE_MAX, height: IMAGE_MAX, fit: 'inside', withoutEnlargement: true })
		.webp({ quality: 80, effort: 4 })
		.toBuffer();
	fs.writeFileSync(path.join(destDir, webpName), out);
	return webpName;
}

function collectAssets(html, mediaItems, coverUrl) {
	const used = new Set();
	const byUrl = new Map();
	const add = (url, label, kindHint) => {
		if (!url || byUrl.has(url)) return;
		const kind = kindHint || kindFromUrl(url);
		const fromUrl = slugifyFilename(decodeURIComponent(path.posix.basename(new URL(url).pathname)));
		const fromLabel = label ? slugifyFilename(`${label}${path.extname(fromUrl) || '.bin'}`) : fromUrl;
		byUrl.set(url, {
			url,
			kind,
			label: label || fromLabel,
			filename: uniqueFilename(fromLabel || fromUrl, used),
		});
	};
	for (const item of mediaItems) {
		if (!item.source_url) continue;
		add(item.source_url, decodeHtml(item.title?.rendered || ''), kindFromUrl(item.source_url));
	}
	if (coverUrl) add(coverUrl, 'okladka', 'image');
	for (const item of collectContentUrls(html)) add(item.url, item.label);
	return { assets: [...byUrl.values()], coverUrl };
}

function pageFrontmatter(title, slug, prefix) {
	return [
		'---',
		`title: ${yamlQuote(title)}`,
		'type: page',
		`slug: ${yamlQuote(slug)}`,
		`pathPrefix: ${yamlQuote(prefix)}`,
		'draft: false',
		'---',
	].join('\n');
}

function newsFrontmatter({ title, date, category, categoryName, extras, cover, gallery, excerpt }) {
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
		lines.push(`galleryImages: [${gallery.map((f) => yamlQuote(`./${f}`)).join(', ')}]`);
	}
	if (extras.length) lines.push(`categories: [${extras.map((s) => yamlQuote(s)).join(', ')}]`);
	if (excerpt) lines.push(`excerpt: ${yamlQuote(excerpt)}`);
	lines.push('---');
	return lines.join('\n');
}

async function persistAssets(dir, pack) {
	const saved = [];
	for (const asset of pack.assets) {
		try {
			asset.filename = await saveBinary(asset.url, dir, asset.filename, asset.kind);
			saved.push(asset);
		} catch (err) {
			console.warn('  skip asset:', asset.url, err.message);
		}
	}
	pack.assets = saved;
}

async function migratePages(redirects) {
	const pages = await fetchAll('pages', 'id,slug,title,content,link,parent,status');
	let written = 0;
	for (const page of pages) {
		if (SKIP_PAGES.has(page.id)) continue;
		const mapped = PAGE_MAP[page.id];
		if (!mapped) {
			console.warn('  unmapped page', page.id, page.slug);
			continue;
		}
		const dir = path.join(PAGES_ROOT, mapped.prefix, mapped.slug);
		const html = page.content?.rendered || '';
		const pack = collectAssets(html, await fetchMedia(page.id), null);
		await persistAssets(dir, pack);
		const files = pack.assets.filter((a) => a.kind !== 'image');
		let body = toMarkdown(html, files);
		if (!body.trim()) body = `Treść strony „${mapped.title}” zostanie uzupełniona.`;
		fs.mkdirSync(dir, { recursive: true });
		const title = stripEmoji(decodeHtml(page.title?.rendered || mapped.title)).trim() || mapped.title;
		fs.writeFileSync(
			path.join(dir, 'index.md'),
			`${pageFrontmatter(title, mapped.slug, mapped.prefix)}\n\n${body.trim()}\n`,
			'utf8',
		);
		const from = new URL(page.link).pathname.replace(/\/+$/, '') || '/';
		const to = `/${mapped.prefix}/${mapped.slug}`;
		if (from !== to) redirects[from] = to;
		written += 1;
		console.log('page', mapped.prefix, mapped.slug);
	}
	return written;
}

async function migratePosts(redirects) {
	const posts = await fetchAll(
		'posts',
		'id,slug,date,date_gmt,title,content,excerpt,categories,featured_media,link',
	);
	let written = 0;
	let skipped = 0;
	for (const post of posts) {
		const year = classifyYear(post.categories || []);
		if (!year) {
			skipped += 1;
			continue;
		}
		const slug = post.slug;
		if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
			console.warn('  invalid slug', slug);
			skipped += 1;
			continue;
		}
		const dir = path.join(NEWS_ROOT, slug);
		const html = post.content?.rendered || '';
		const coverUrl = await featuredUrl(post.featured_media);
		const pack = collectAssets(html, await fetchMedia(post.id), coverUrl);
		await persistAssets(dir, pack);
		const coverAsset = coverUrl
			? pack.assets.find((a) => a.url === coverUrl)
			: pack.assets.find((a) => a.kind === 'image');
		const gallery = pack.assets
			.filter((a) => a.kind === 'image' && a.filename !== coverAsset?.filename)
			.map((a) => a.filename);
		const files = pack.assets.filter((a) => a.kind !== 'image');
		const body = toMarkdown(html, files) || stripEmoji(decodeHtml(html)) || '—';
		const title = stripEmoji(decodeHtml(post.title?.rendered || slug)).trim() || slug;
		const excerpt = stripEmoji(excerptFrom(post.excerpt?.rendered || html));
		fs.mkdirSync(dir, { recursive: true });
		fs.writeFileSync(
			path.join(dir, 'index.md'),
			`${newsFrontmatter({
				title,
				date: isoDate(post),
				category: year.slug,
				categoryName: year.name,
				extras: ['aktualnosci'],
				cover: coverAsset?.filename ?? null,
				gallery,
				excerpt,
			})}\n\n${body.trim()}\n`,
			'utf8',
		);
		const from = `/${slug}`;
		redirects[from] = `/${year.slug}/${slug}`;
		written += 1;
		if (written % 10 === 0) console.log('posts', written, '/', posts.length);
	}
	return { written, skipped, total: posts.length };
}

async function main() {
	if (!fs.existsSync(REPO)) throw new Error(`Brak repo szkoły: ${REPO}`);
	const redirects = {
		'/informacje/deklaracja-dostepnosci': '/szkola/deklaracja-dostepnosci',
		'/informacje/harmonogram-konsultacji-dla-rodzicow-i-uczniow-w-roku-szkolnym-2023-2024':
			'/dla-rodzicow/konsultacje',
		'/informacje/informacja-od-pielegniarki-szkolnej': '/dla-rodzicow/pielegniarka',
		'/informacje/procedura-fluoryzacji-w-sp-miedzna': '/dla-rodzicow/fluoryzacja',
		'/informacje/godzina-dla-mlodych-glow': '/dla-rodzicow/godzina-dla-mlodych-glow',
		'/category/20-21': '/rok-szkolny-2020-2021',
		'/category/21-22': '/rok-szkolny-2021-2022',
		'/category/22-23': '/rok-szkolny-2022-2023',
		'/category/23-24': '/rok-szkolny-2023-2024',
		'/category/rok-szkolny-2024-2025': '/rok-szkolny-2024-2025',
		'/category/rok-szkolny-2025-2026': '/rok-szkolny-2025-2026',
	};
	console.log('pages…');
	const pages = await migratePages(redirects);
	console.log('posts…');
	const posts = await migratePosts(redirects);
	writeRedirects(REPO, redirects);
	console.log(JSON.stringify({ pages, posts, redirects: Object.keys(redirects).length }, null, 2));
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
