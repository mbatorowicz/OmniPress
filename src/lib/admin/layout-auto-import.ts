import type { SupabaseClient } from '@supabase/supabase-js';
import {
	hashCategoriesLayout,
	hashNavigationLayout,
} from '@/lib/astro-layout/layout-sync-meta.server';
import {
	fetchLiveLayoutHashes,
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

export type LayoutAutoImportHashes = {
	draftNavHash: string;
	draftCategoriesHash: string;
	liveNavHash?: string | null;
	liveCategoriesHash?: string | null;
	publishedNavHash?: string;
	publishedCategoriesHash?: string;
};

export function shouldAutoImportLayoutFromGitHub(
	layout: SiteAstroLayout,
	options: { draftHrefCount: number; hashes: LayoutAutoImportHashes },
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

	const {
		draftNavHash,
		draftCategoriesHash,
		liveNavHash,
		liveCategoriesHash,
		publishedNavHash,
		publishedCategoriesHash,
	} = options.hashes;

	const liveDiffers =
		(Boolean(liveNavHash) && draftNavHash !== liveNavHash) ||
		(Boolean(liveCategoriesHash) && draftCategoriesHash !== liveCategoriesHash);

	const localEditsAhead =
		(Boolean(publishedNavHash) && draftNavHash !== publishedNavHash) ||
		(Boolean(publishedCategoriesHash) && draftCategoriesHash !== publishedCategoriesHash);

	if (liveDiffers && !localEditsAhead) return true;

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
	const liveHashes = await fetchLiveLayoutHashes(supabase, siteId, layout);
	const hashes: LayoutAutoImportHashes = {
		draftNavHash: hashNavigationLayout(layout.navigation),
		draftCategoriesHash: hashCategoriesLayout(layout),
		liveNavHash: liveHashes?.navHash,
		liveCategoriesHash: liveHashes?.categoriesHash,
		publishedNavHash: layout.sync?.publishedNavHash,
		publishedCategoriesHash: layout.sync?.publishedCategoriesHash,
	};

	if (!shouldAutoImportLayoutFromGitHub(layout, { draftHrefCount, hashes })) {
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
