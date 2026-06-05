import type { SupabaseClient } from '@supabase/supabase-js';
import { loadSiteAstroDestination } from '@/lib/admin/sites';
import { fetchAstroCategories } from './astro-github';
import type { CategoryOption } from './types';

/** Kategorie z repozytorium GitHub powiązanego ze stroną. */
export async function loadSiteCategories(
	supabase: SupabaseClient,
	siteId: string,
): Promise<{ categories: CategoryOption[]; warnings: string[] }> {
	const dest = await loadSiteAstroDestination(supabase, siteId);
	if (!dest) {
		return { categories: [], warnings: [] };
	}

	try {
		const categories = await fetchAstroCategories(dest);
		return {
			categories: [...categories].sort((a, b) => a.name.localeCompare(b.name, 'pl')),
			warnings: [],
		};
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'nieznany błąd';
		return { categories: [], warnings: [`${dest.name}: ${msg}`] };
	}
}
