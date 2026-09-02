import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureLayoutFromGitHub } from '@/lib/admin/layout-auto-import';
import { loadSiteAstroLayout, type LayoutImportReport } from '@/lib/astro-layout/store';
import type { SiteAstroLayout } from '@/lib/astro-layout/types';
import { ensureSiteFromGitHub } from '@/lib/sync/ensure-site';

export type LayoutEditorLoadResult = {
	layout: SiteAstroLayout;
	autoImported: boolean;
	autoImportHrefCount?: number;
	autoImportPath?: string;
	autoImportError?: string;
};

export async function loadLayoutForEditor(
	supabase: SupabaseClient,
	siteId: string,
	options: { autoImport?: boolean; authorId?: string | null },
): Promise<LayoutEditorLoadResult> {
	if (options.autoImport === false) {
		return { layout: await loadSiteAstroLayout(supabase, siteId), autoImported: false };
	}

	await ensureSiteFromGitHub(supabase, siteId, options.authorId ?? null);
	const ensured = await ensureLayoutFromGitHub(supabase, siteId);
	const report: LayoutImportReport | undefined = ensured.importReport;
	return {
		layout: ensured.layout,
		autoImported: ensured.imported,
		autoImportHrefCount: report?.hrefCount,
		autoImportPath: report?.navigationPath,
		autoImportError: ensured.importError,
	};
}
