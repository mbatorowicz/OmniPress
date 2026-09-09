import type { SupabaseClient } from '@supabase/supabase-js';
import { hashLayoutFile } from '@/lib/astro-layout/layout-sync-meta.server';
import {
	fetchLiveLayoutFingerprint,
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
	draftHash: string;
	liveHash?: string | null;
	publishedHash?: string;
};

function isEmptyLayout(layout: SiteAstroLayout): boolean {
	return (
		layout.navigation.length === 0 &&
		layout.categories.length === 0 &&
		layout.slots.length === 0
	);
}

export function shouldAutoImportLayoutFromGitHub(
	layout: SiteAstroLayout,
	options: { draftHrefCount: number; hashes: LayoutAutoImportHashes },
): boolean {
	if (isEmptyLayout(layout)) return true;

	if (
		layout.navigation.length > 0 &&
		options.draftHrefCount === 0 &&
		navigationHasLeafWithoutHref(layout.navigation)
	) {
		return true;
	}

	const { draftHash, liveHash, publishedHash } = options.hashes;
	const liveDiffers = Boolean(liveHash) && draftHash !== liveHash;
	const localEditsAhead = Boolean(publishedHash) && draftHash !== publishedHash;
	return liveDiffers && !localEditsAhead;
}

export async function ensureLayoutFromGitHub(
	supabase: SupabaseClient,
	siteId: string,
): Promise<LayoutAutoImportResult> {
	const layout = await loadSiteAstroLayout(supabase, siteId);
	const hasAstroChannel = Boolean(await loadSiteAstroDestination(supabase, siteId));
	if (!hasAstroChannel) return { layout, imported: false };

	const draftHrefCount = countNavigationHrefs(layout.navigation);
	const draftHash = hashLayoutFile(layout);
	const publishedHash = layout.sync?.publishedLayoutHash;

	if (publishedHash && draftHash !== publishedHash) {
		return { layout, imported: false };
	}

	const liveFingerprint = await fetchLiveLayoutFingerprint(supabase, siteId, layout);
	if (
		liveFingerprint?.blobSha &&
		layout.sync?.publishedLiveBlobSha &&
		liveFingerprint.blobSha === layout.sync.publishedLiveBlobSha &&
		publishedHash &&
		draftHash === publishedHash
	) {
		return { layout, imported: false };
	}

	const hashes: LayoutAutoImportHashes = {
		draftHash,
		liveHash: liveFingerprint?.layoutHash,
		publishedHash,
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
