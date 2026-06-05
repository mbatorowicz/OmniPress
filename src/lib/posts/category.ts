import type { SupabaseClient } from '@supabase/supabase-js';
import { findCategoryBySlug, loadSiteCategories } from '@/lib/categories';

export async function resolvePostCategoryFields(
	supabase: SupabaseClient,
	siteId: string,
	categorySlug: string,
): Promise<{ category_slug: string; category_name: string } | null> {
	const slug = categorySlug.trim();
	if (!slug) return null;

	const { categories } = await loadSiteCategories(supabase, siteId);
	const found = findCategoryBySlug(categories, slug);
	if (!found) return null;

	return {
		category_slug: found.slug,
		category_name: found.name,
	};
}
