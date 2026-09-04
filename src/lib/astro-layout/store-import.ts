import type { SupabaseClient } from '@supabase/supabase-js';
import { categoriesConfigPath, layoutConfigPath, navigationConfigPath } from '@/lib/admin/config-paths';
import { loadSiteAstroDestination } from '@/lib/admin/sites';
import {
	decryptDestinationCredentials,
	isGitHubCredentials,
} from '@/lib/publish/credentials';
import { parseGitHubRepoConfig } from '@/lib/publish/github-api';
import { withImportedLiveMeta } from './layout-sync-meta.server';
import { importLegacyLayoutFromGitHub } from './store-import-legacy';
import { loadSiteAstroLayout, saveSiteAstroLayout } from './store-persist';
import type { SiteAstroLayout } from './types';
import { collectNavHrefs } from './validate-nav';

export type LayoutImportReport = {
	hrefCount: number;
	layoutPath: string;
	layoutHash: string;
	/** @deprecated */
	navigationPath: string;
	/** @deprecated */
	navHash: string;
};

export type LayoutImportResult =
	| { ok: true; layout: SiteAstroLayout; report: LayoutImportReport }
	| { ok: false; error: string };

export async function importSiteAstroLayoutFromGitHub(
	supabase: SupabaseClient,
	siteId: string,
): Promise<LayoutImportResult> {
	const dest = await loadSiteAstroDestination(supabase, siteId);
	if (!dest?.is_active) return { ok: false, error: 'no_astro_destination' };

	const cfg = parseGitHubRepoConfig(dest.config);
	if (!cfg) return { ok: false, error: 'invalid_repo' };

	const creds = await decryptDestinationCredentials(dest);
	if (!creds || !isGitHubCredentials(dest.type, creds)) {
		return { ok: false, error: 'no_github_token' };
	}

	const existing = await loadSiteAstroLayout(supabase, siteId);
	const layout: SiteAstroLayout = { ...existing };
	layout.layoutPath = layoutConfigPath(dest.config);
	layout.navigationPath = navigationConfigPath(dest.config);
	layout.categoriesPath = categoriesConfigPath(dest.config);

	const imported = await importLegacyLayoutFromGitHub(cfg, creds.token, dest.config, layout);
	if ('error' in imported) return { ok: false, error: imported.error };

	const merged = withImportedLiveMeta(imported.layout, {
		layoutHash: imported.layoutHash || null,
		liveBlobSha: imported.liveBlobSha ?? null,
		layoutContract: imported.layoutContract,
	});

	const saved = await saveSiteAstroLayout(supabase, siteId, merged, { updateDraftMeta: false });
	if (!saved.ok) return { ok: false, error: 'save_failed' };

	const persisted = await loadSiteAstroLayout(supabase, siteId);
	const persistedHrefCount = collectNavHrefs(persisted.navigation).length;

	return {
		ok: true,
		layout: persisted,
		report: {
			hrefCount: persistedHrefCount,
			layoutPath: layout.layoutPath,
			layoutHash: imported.layoutHash,
			navigationPath: layout.navigationPath,
			navHash: imported.layoutHash,
		},
	};
}
