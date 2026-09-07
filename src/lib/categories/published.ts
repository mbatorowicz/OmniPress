import type { SupabaseClient } from '@supabase/supabase-js';
import { posts } from '@/i18n';
import { loadSiteAstroLayout } from '@/lib/astro-layout/store';
import { loadSiteAstroDestination } from '@/lib/admin/sites';
import { fetchAstroCategories } from './astro-github';
import { categoriesFromLayout, isLayoutInPublishedSync } from './published-model';
import type { CategoryOption } from './types';

export type PublishedCategoriesResult = {
	categories: CategoryOption[];
	warnings: string[];
};

/** Kategorie ze strony (GitHub / ostatnia publikacja) — nie ze szkicu layoutu. */
export async function loadPublishedSiteCategories(
	supabase: SupabaseClient,
	siteId: string,
): Promise<PublishedCategoriesResult> {
	const layout = await loadSiteAstroLayout(supabase, siteId);
	if (isLayoutInPublishedSync(layout) && layout.categories.length > 0) {
		return { categories: categoriesFromLayout(layout), warnings: [] };
	}

	return fetchPublishedFromGitHub(supabase, siteId);
}

async function fetchPublishedFromGitHub(
	supabase: SupabaseClient,
	siteId: string,
): Promise<PublishedCategoriesResult> {
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
		const detail = e instanceof Error ? e.message : posts.categorySource.unknownError;
		return { categories: [], warnings: [posts.categorySource.failed(dest.name, detail)] };
	}
}
