import { findCategoryBySlug, type CategoryOption } from '@/lib/categories';
import { prepareStorageMarkdown } from '@/lib/content/prepare-markdown';
import { normalizeExtraCategorySlugs } from '@/lib/posts/category-model';
import type { AttachmentDisplay } from './attachment-display';
import { inboundEnrichPostSchema, inboundEnrichSchema } from './enrich-schema';
import { resolveEnrichTitle } from './generic-title';

export type EnrichAttachment = { filename: string; display: AttachmentDisplay };

export type EnrichDraft = {
	title: string;
	contentMd: string;
	categorySlug: string | null;
	extraCategorySlugs: string[];
	attachments: EnrichAttachment[];
};

const MAX_POSTS = 3;

export function enrichFallback(title: string, contentMd: string): EnrichDraft {
	return { title, contentMd, categorySlug: null, extraCategorySlugs: [], attachments: [] };
}

export function isSameEnrichDraft(a: EnrichDraft, b: EnrichDraft): boolean {
	return (
		a.title === b.title &&
		a.contentMd === b.contentMd &&
		a.categorySlug === b.categorySlug &&
		a.extraCategorySlugs.length === b.extraCategorySlugs.length &&
		a.extraCategorySlugs.every((slug, i) => slug === b.extraCategorySlugs[i])
	);
}

function asCanonicalSlug(categories: CategoryOption[], slug: string | null | undefined): string | null {
	if (!slug?.trim()) return null;
	return findCategoryBySlug(categories, slug)?.slug ?? null;
}

function canonFilename(known: Map<string, string>, name: string): string | null {
	const trimmed = name.trim();
	if (!trimmed) return null;
	return known.get(trimmed.toLowerCase()) ?? null;
}

function mapAttachments(
	raw: { filename: string; display: AttachmentDisplay }[] | undefined,
	known: Map<string, string>,
): EnrichAttachment[] {
	const out: EnrichAttachment[] = [];
	const seen = new Set<string>();
	for (const row of raw ?? []) {
		const filename = canonFilename(known, row.filename);
		if (!filename || seen.has(filename)) continue;
		seen.add(filename);
		out.push({ filename, display: row.display });
	}
	return out;
}

function mapPost(
	raw: unknown,
	categories: CategoryOption[],
	fallback: { title: string; contentMd: string },
	known: Map<string, string>,
	fileTexts: Map<string, string>,
): EnrichDraft | null {
	const parsed = inboundEnrichPostSchema.safeParse(raw);
	if (!parsed.success) return null;
	const attachments = mapAttachments(parsed.data.attachments, known);
	const excerpts = attachments
		.map((row) => fileTexts.get(row.filename) ?? '')
		.filter(Boolean);
	const title = resolveEnrichTitle(parsed.data.title, fallback.title, excerpts);
	const contentMd = prepareStorageMarkdown(parsed.data.content_md);
	const categorySlug = asCanonicalSlug(categories, parsed.data.category_slug);
	const allowed = new Set(categories.map((c) => c.slug));
	const extraCategorySlugs = categorySlug
		? normalizeExtraCategorySlugs(
				(parsed.data.extra_category_slugs ?? []).map(
					(slug) => asCanonicalSlug(categories, slug) ?? '',
				),
				categorySlug,
				allowed,
			)
		: [];
	return {
		title,
		contentMd: contentMd || fallback.contentMd,
		categorySlug,
		extraCategorySlugs,
		attachments,
	};
}

function asPostsRaw(raw: unknown): unknown {
	if (raw && typeof raw === 'object' && Array.isArray((raw as { posts?: unknown }).posts)) return raw;
	if (raw && typeof raw === 'object' && 'content_md' in raw) return { posts: [raw] };
	return raw;
}

/** Sanityzacja + allowlista kategorii. Puste albo zły JSON → []. */
export function applyEnrichment(
	raw: unknown,
	categories: CategoryOption[],
	fallback: { title: string; contentMd: string },
	knownFilenames: string[] = [],
	fileTexts: Map<string, string> = new Map(),
): EnrichDraft[] {
	const known = new Map(knownFilenames.map((name) => [name.toLowerCase(), name]));
	const parsed = inboundEnrichSchema.safeParse(asPostsRaw(raw));
	if (!parsed.success) return [];
	const drafts: EnrichDraft[] = [];
	for (const post of parsed.data.posts.slice(0, MAX_POSTS)) {
		const mapped = mapPost(post, categories, fallback, known, fileTexts);
		if (mapped) drafts.push(mapped);
	}
	return drafts;
}
