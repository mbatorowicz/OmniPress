import type { SupabaseClient } from '@supabase/supabase-js';
import { loadSiteAstroLayout } from '@/lib/astro-layout/store';
import { loadSiteAstroDestination } from '@/lib/admin/sites';
import { fetchAstroCategories } from './astro-github';
import type { CategoryOption } from './types';

/** Kategorie — najpierw z layoutu w Supabase, potem fallback z GitHub. */
export async function loadSiteCategories(
	supabase: SupabaseClient,
	siteId: string,
): Promise<{ categories: CategoryOption[]; warnings: string[] }> {
	const layout = await loadSiteAstroLayout(supabase, siteId);
	if (layout.categories.length > 0) {
		return {
			categories: layout.categories
				.map((c) => ({
					slug: c.slug,
					name: c.name,
					sources: ['github_astro'] as const,
				}))
				.sort((a, b) => a.name.localeCompare(b.name, 'pl')),
			warnings: [],
		};
	}

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
