import type { SupabaseClient } from '@supabase/supabase-js';
import { findCategoryBySlug, loadPublishedSiteCategories } from '@/lib/categories';
import { normalizeExtraCategorySlugs } from './category-model';

export type PostCategoryFields = {
	category_slug: string;
	category_name: string;
	extra_category_slugs: string[];
};

export async function resolvePostCategoryFields(
	supabase: SupabaseClient,
	siteId: string,
	categorySlug: string,
	extraSlugs: readonly string[] = [],
): Promise<PostCategoryFields | null> {
	const slug = categorySlug.trim();
	if (!slug) return null;

	const { categories } = await loadPublishedSiteCategories(supabase, siteId);
	const found = findCategoryBySlug(categories, slug);
	if (!found) return null;

	return {
		category_slug: found.slug,
		category_name: found.name,
		extra_category_slugs: normalizeExtraCategorySlugs(
			extraSlugs,
			found.slug,
			new Set(categories.map((c) => c.slug)),
		),
	};
}
