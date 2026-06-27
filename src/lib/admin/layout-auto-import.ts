import type { SupabaseClient } from '@supabase/supabase-js';
import {
	fetchLiveNavigationHrefCount,
	importSiteAstroLayoutFromGitHub,
	loadSiteAstroLayout,
	type LayoutImportReport,
} from '@/lib/astro-layout/store';
import type { SiteAstroLayout } from '@/lib/astro-layout/types';
import {
	countNavigationHrefs,
	navigationHasLeafWithoutHref,
} from '@/lib/astro-layout/validate-nav';
import { loadSiteAstroDestination } from './sites';

export type LayoutAutoImportResult = {
	layout: SiteAstroLayout;
	imported: boolean;
	importError?: string;
	importReport?: LayoutImportReport;
};

export function shouldAutoImportLayoutFromGitHub(
	layout: SiteAstroLayout,
	options: { draftHrefCount: number; liveHrefCount: number | null },
): boolean {
	const emptyLayout =
		layout.navigation.length === 0 &&
		layout.categories.length === 0 &&
		layout.slots.length === 0;
	if (emptyLayout) return true;

	if (
		layout.navigation.length > 0 &&
		options.draftHrefCount === 0 &&
		navigationHasLeafWithoutHref(layout.navigation)
	) {
		return true;
	}

	if (options.liveHrefCount !== null && options.liveHrefCount > options.draftHrefCount) {
		return true;
	}

	return false;
}

export async function ensureLayoutFromGitHub(
	supabase: SupabaseClient,
	siteId: string,
): Promise<LayoutAutoImportResult> {
	const layout = await loadSiteAstroLayout(supabase, siteId);
	const hasAstroChannel = Boolean(await loadSiteAstroDestination(supabase, siteId));
	if (!hasAstroChannel) return { layout, imported: false };

	const draftHrefCount = countNavigationHrefs(layout.navigation);
	const needsLiveCheck =
		layout.navigation.length > 0 &&
		(draftHrefCount === 0 || navigationHasLeafWithoutHref(layout.navigation));
	const liveHrefCount = needsLiveCheck
		? await fetchLiveNavigationHrefCount(supabase, siteId, layout)
		: null;

	if (!shouldAutoImportLayoutFromGitHub(layout, { draftHrefCount, liveHrefCount })) {
		return { layout, imported: false };
	}

	const imported = await importSiteAstroLayoutFromGitHub(supabase, siteId);
	if (imported.ok) {
		return {
			layout: imported.layout,
			imported: true,
			importReport: imported.report,
		};
	}

	return { layout, imported: false, importError: imported.error };
}
