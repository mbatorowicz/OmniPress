import { normalizeExtraCategorySlugs } from '@/lib/posts/category-model';
import { parseYamlQuotedStringArray } from './yaml-inline-array';

export type ParsedAstroPost = {
	title: string;
	date: string | null;
	author: string;
	categorySlug: string;
	categoryName: string;
	extraCategorySlugs: string[];
	draft: boolean;
	pinned: boolean;
	excerpt: string | null;
	coverImage: string | null;
	galleryImages: string[];
	body: string;
};

function parseYamlValue(raw: string): string | boolean {
	const v = raw.trim();
	if (v === 'true') return true;
	if (v === 'false') return false;
	if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
		return v.slice(1, -1);
	}
	return v;
}

/** Parsuje plik .md opublikowany przez OmniPress / Astro. */
export function parseAstroPostFile(raw: string): ParsedAstroPost | null {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
	if (!match) return null;

	const fm = match[1]!;
	const body = match[2]!.trim();
	const fields: Record<string, string | boolean> = {};

	for (const line of fm.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('galleryImages:') || trimmed.startsWith('categories:')) {
			continue;
		}
		const idx = trimmed.indexOf(':');
		if (idx <= 0) continue;
		const key = trimmed.slice(0, idx).trim();
		const value = parseYamlValue(trimmed.slice(idx + 1));
		fields[key] = value;
	}

	const lines = fm.split('\n');
	const galleryLine = lines.find((l) => l.trimStart().startsWith('galleryImages:'));
	const galleryImages = galleryLine
		? (parseYamlQuotedStringArray(galleryLine.trim(), 'galleryImages') ?? [])
		: [];
	const categoriesLine = lines.find((l) => l.trimStart().startsWith('categories:'));
	const allCategorySlugs = categoriesLine
		? (parseYamlQuotedStringArray(categoriesLine.trim(), 'categories') ?? [])
		: [];

	const title = String(fields.title ?? '').trim();
	if (!title) return null;

	const categorySlug = String(fields.category ?? '').trim();
	const pubDate =
		(typeof fields.date === 'string' && fields.date) ||
		(typeof fields.pubDate === 'string' && fields.pubDate) ||
		null;

	return {
		title,
		date: pubDate,
		author: String(fields.author ?? 'Administrator').trim() || 'Administrator',
		categorySlug,
		categoryName: String(fields.categoryName ?? categorySlug).trim() || categorySlug,
		extraCategorySlugs: normalizeExtraCategorySlugs(
			allCategorySlugs,
			categorySlug,
			new Set(allCategorySlugs),
		),
		draft: fields.draft === true,
		pinned: fields.pinned === true,
		excerpt: typeof fields.excerpt === 'string' ? fields.excerpt : null,
		coverImage: typeof fields.coverImage === 'string' ? fields.coverImage : null,
		galleryImages,
		body,
	};
}

export function slugFromGitHubMarkdownPath(
	filePath: string,
	contentPath: string,
	layout: 'flat' | 'folder',
): string {
	const root = contentPath.replace(/^\/+|\/+$/g, '');
	const rel = filePath.replace(/^\/+/, '').slice(root.length).replace(/^\//, '');

	if (layout === 'folder') {
		return rel.replace(/\/index\.md$/i, '').split('/').filter(Boolean).pop() ?? rel;
	}
	return rel.replace(/\.md$/i, '').split('/').pop() ?? rel;
}

export function siblingFolderPath(markdownPath: string): string {
	return markdownPath.replace(/\/[^/]+$/i, '');
}

export function assetBasename(ref: string): string {
	return ref.replace(/^\.\//, '').split('/').pop() ?? ref;
}
