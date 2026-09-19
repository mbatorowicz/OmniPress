import type { SupabaseClient } from '@supabase/supabase-js';
import { loadPublishedSiteCategories, type CategoryOption } from '@/lib/categories';

function asId(value: unknown): string | null {
	return typeof value === 'string' && value ? value : null;
}

export async function loadInboundSiteCategories(
	supabase: SupabaseClient,
	siteSlug: string,
): Promise<CategoryOption[]> {
	const slug = siteSlug.trim();
	if (!slug) return [];
	const { data } = await supabase
		.from('sites')
		.select('id')
		.eq('slug', slug)
		.eq('is_active', true)
		.maybeSingle();
	const siteId = asId((data as { id?: unknown } | null)?.id);
	if (!siteId) return [];
	const { categories } = await loadPublishedSiteCategories(supabase, siteId);
	return categories;
}
