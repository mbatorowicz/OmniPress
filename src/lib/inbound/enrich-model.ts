import { findCategoryBySlug, type CategoryOption } from '@/lib/categories';
import { prepareStorageMarkdown } from '@/lib/content/prepare-markdown';
import { normalizeExtraCategorySlugs } from '@/lib/posts/category-model';
import { inboundEnrichSchema } from './enrich-schema';
import { parseInboundSubject } from './parse-subject';

export type EnrichDraft = {
	title: string;
	contentMd: string;
	categorySlug: string | null;
	extraCategorySlugs: string[];
};

export function enrichFallback(title: string, contentMd: string): EnrichDraft {
	return { title, contentMd, categorySlug: null, extraCategorySlugs: [] };
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

/** Sanityzacja + allowlista kategorii. Zły JSON → fallback (mail nie ginie). */
export function applyEnrichment(
	raw: unknown,
	categories: CategoryOption[],
	fallback: { title: string; contentMd: string },
): EnrichDraft {
	const parsed = inboundEnrichSchema.safeParse(raw);
	if (!parsed.success) return enrichFallback(fallback.title, fallback.contentMd);

	const title = parseInboundSubject(parsed.data.title) || fallback.title;
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
	};
}
