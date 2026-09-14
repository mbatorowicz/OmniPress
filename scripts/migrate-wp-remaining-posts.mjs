/**
 * Migracja pozostałych wpisów WP (poza pominiętymi kategoriami) do repo Astro.
 * Użycie: node scripts/migrate-wp-remaining-posts.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	CATEGORY_ARCHIVE_REDIRECTS,
	RESERVED_REDIRECT_SOURCES,
	SIDEBAR_BANNERS,
	WP,
	classifyPost,
	isValidSlug,
	takeIdsQuery,
} from './lib/wp-migrate-map.mjs';
import {
	collectContentUrls,
	decodeHtml,
	excerptFrom,
	htmlToMarkdown,
	kindFromUrl,
	slugifyFilename,
	uniqueFilename,
} from './lib/wp-migrate-html.mjs';
import {
	downloadFile,
	hasIndex,
	patchAstroConfig,
	readExistingCategory,
	updateLayout,
	writePost,
	writeRedirects,
	buildFrontmatter,
	newsDir,
} from './lib/wp-migrate-fs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_B = path.resolve(__dirname, '../../gmina-miedzna.pl');
const IMG_DIR = path.join(REPO_B, 'public/img');

async function wpJson(url) {
	const res = await fetch(url, { headers: { 'User-Agent': 'OmniPress-WP-migrate' } });
	if (!res.ok) throw new Error(`${res.status} ${url}`);
	return res.json();
}

async function fetchAllPosts() {
	const url =
		`${WP}/wp-json/wp/v2/posts?categories=${takeIdsQuery()}` +
		'&per_page=100&_fields=id,slug,date,date_gmt,title,content,excerpt,categories,featured_media';
	return wpJson(url);
}

async function fetchMedia(postId) {
	const items = await wpJson(
		`${WP}/wp-json/wp/v2/media?parent=${postId}&per_page=100&_fields=id,source_url,mime_type,title,featured_media`,
	);
	return Array.isArray(items) ? items : [];
}

async function featuredUrl(id) {
	if (!id) return null;
	try {
		const media = await wpJson(`${WP}/wp-json/wp/v2/media/${id}?_fields=source_url`);
		return media.source_url || null;
	} catch {
		return null;
	}
}

function toIsoDate(post) {
	const raw = post.date_gmt || post.date;
	if (!raw) return new Date().toISOString();
	return raw.endsWith('Z') ? raw : `${raw.replace(' ', 'T')}Z`;
}

async function assembleAssets(post) {
	const used = new Set();
	const byUrl = new Map();
	const add = (url, label, kindHint) => {
		if (!url || byUrl.has(url)) return;
		const kind = kindHint || kindFromUrl(url);
		const fromUrl = slugifyFilename(decodeURIComponent(path.posix.basename(new URL(url).pathname)));
		const fromLabel = label ? slugifyFilename(`${label}${path.extname(fromUrl)}`) : fromUrl;
		const filename = uniqueFilename(fromLabel || fromUrl, used);
		byUrl.set(url, {
			url,
			kind,
			label: label || filename,
			filename,
		});
	};

	for (const item of await fetchMedia(post.id)) {
		if (!item.source_url) continue;
		add(item.source_url, decodeHtml(item.title?.rendered || ''), kindFromUrl(item.source_url));
	}
	const coverUrl = await featuredUrl(post.featured_media);
	if (coverUrl) add(coverUrl, 'cover', 'image');
	for (const item of collectContentUrls(post.content?.rendered || '')) {
		add(item.url, item.label);
	}

	const assets = [...byUrl.values()];
	const cover = coverUrl ? byUrl.get(coverUrl) : assets.find((a) => a.kind === 'image') ?? null;
	return { assets, cover };
}

function addPostRedirect(redirects, slug, categorySlug) {
	const from = `/${slug}`;
	if (RESERVED_REDIRECT_SOURCES.has(from)) return;
	redirects[from] = `/${categorySlug}/${slug}`;
}

async function migrateOne(post, redirects) {
	const classified = classifyPost(post.categories || []);
	if (!classified) return 'skip-cat';
	if (!isValidSlug(post.slug)) {
		console.warn('  invalid slug:', post.slug);
		return 'skip-slug';
	}

	if (hasIndex(REPO_B, post.slug)) {
		const current = readExistingCategory(REPO_B, post.slug) || classified.primarySlug;
		addPostRedirect(redirects, post.slug, current);
		return 'exists';
	}

	const title = decodeHtml(post.title?.rendered || post.slug);
	const { assets, cover } = await assembleAssets(post);
	const dir = newsDir(REPO_B, post.slug);
	fs.mkdirSync(dir, { recursive: true });

	const downloaded = [];
	for (const asset of assets) {
		const dest = path.join(dir, asset.filename);
		const result = await downloadFile(asset.url, dest);
		if (!result.ok) {
			console.warn('  skip file:', result.error);
			continue;
		}
		downloaded.push(asset);
	}

	const images = downloaded.filter((a) => a.kind === 'image');
	const coverName = cover && downloaded.some((a) => a.filename === cover.filename) ? cover.filename : images[0]?.filename;
	const gallery = images.filter((a) => a.filename !== coverName).map((a) => a.filename);
	const bodyAssets = downloaded.filter((a) => a.kind !== 'image');
	const body = htmlToMarkdown(post.content?.rendered || '', bodyAssets);
	const excerpt = excerptFrom(post.excerpt?.rendered || body.replace(/<[^>]+>/g, ''));
	const extras = classified.allSlugs;

	writePost(
		REPO_B,
		post.slug,
		buildFrontmatter({
			title,
			date: toIsoDate(post),
			category: classified.primarySlug,
			categoryName: classified.primaryName,
			extras,
			cover: coverName,
			gallery,
			excerpt,
		}),
		body,
	);
	addPostRedirect(redirects, post.slug, classified.primarySlug);
	console.log('  wrote', post.slug, '→', classified.primarySlug);
	return 'imported';
}

async function downloadBanners() {
	fs.mkdirSync(IMG_DIR, { recursive: true });
	for (const banner of SIDEBAR_BANNERS) {
		const dest = path.join(REPO_B, 'public', banner.imageUrl.replace(/^\//, ''));
		const result = await downloadFile(banner.source, dest);
		if (!result.ok) console.warn('  banner skip:', result.error);
		else console.log('  banner', banner.imageUrl);
	}
}

console.log('Migracja WP remaining posts →', REPO_B);
const posts = await fetchAllPosts();
console.log('WP posts:', posts.length);

const redirects = { ...CATEGORY_ARCHIVE_REDIRECTS };
const counts = { imported: 0, exists: 0, skipped: 0 };
for (const post of posts) {
	const action = await migrateOne(post, redirects);
	if (action === 'imported') counts.imported += 1;
	else if (action === 'exists') counts.exists += 1;
	else counts.skipped += 1;
}

await downloadBanners();
updateLayout(REPO_B);
writeRedirects(REPO_B, redirects);
patchAstroConfig(REPO_B);
console.log('Gotowe.', counts, 'redirects:', Object.keys(redirects).length);
