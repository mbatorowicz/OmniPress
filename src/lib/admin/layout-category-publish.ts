import type { SupabaseClient } from '@supabase/supabase-js';
import { mergeDraftCategoriesOntoLive } from '@/lib/astro-layout/category-merge';
import { importSiteAstroLayoutFromGitHub } from '@/lib/astro-layout/store';
import type { SiteAstroLayout } from '@/lib/astro-layout/types';

export type CategoryPublishLayout = {
	layout: SiteAstroLayout;
	baseline: SiteAstroLayout;
	rebased: boolean;
};

export async function resolveLayoutForCategoryPublish(
	supabase: SupabaseClient,
	siteId: string,
	draft: SiteAstroLayout,
): Promise<CategoryPublishLayout> {
	const imported = await importSiteAstroLayoutFromGitHub(supabase, siteId, { persist: false });
	if (!imported.ok) return { layout: draft, baseline: draft, rebased: false };
	return {
		layout: mergeDraftCategoriesOntoLive(imported.layout, draft),
		baseline: imported.layout,
		rebased: true,
	};
}
