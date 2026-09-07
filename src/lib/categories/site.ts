import type { SupabaseClient } from '@supabase/supabase-js';
import { loadSiteAstroLayout } from '@/lib/astro-layout/store';
import { categoriesFromLayout } from './published-model';
import type { CategoryOption } from './types';

/**
 * Szkic kategorii z `sites.astro_layout` — panel admina (edycja layoutu).
 * Select redaktora i akceptacja: `loadPublishedSiteCategories`.
 */
export async function loadDraftSiteCategories(
	supabase: SupabaseClient,
	siteId: string,
): Promise<{ categories: CategoryOption[]; warnings: string[] }> {
	const layout = await loadSiteAstroLayout(supabase, siteId);
	return { categories: categoriesFromLayout(layout), warnings: [] };
}
