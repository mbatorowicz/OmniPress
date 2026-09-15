import type { SupabaseClient } from '@supabase/supabase-js';
import { loadSiteAstroDestination } from '@/lib/admin/sites';
import { decryptDestinationCredentials, isGitHubCredentials } from '@/lib/publish/credentials';
import { parseGitHubRepoConfig } from '@/lib/publish/github-api';
import { hasPublishedAttachments, stripPublishedAttachments } from '@/lib/publish/import-asset-model';
import { pagesContentPathFromConfig } from './paths';
import { importPageAssetsFromGitHub, pageMarkdownPathFor } from './import-assets';
import { loadPageAssets } from './assets';
import type { SitePage } from './types';
import type { PostAsset } from '@/lib/publish/asset-model';

export type PageEditorAttachments = {
	assets: PostAsset[];
	contentMd: string;
};

/**
 * Przy otwarciu edytora: wciąga PDF/DOCX z folderu strony na GitHub
 * (jeśli jeszcze nie ma ich w bazie) i chowa linki z treści — jak we wpisach.
 */
export async function loadPageEditorAttachments(
	supabase: SupabaseClient,
	page: SitePage,
): Promise<PageEditorAttachments> {
	let assets = await loadPageAssets(supabase, page.id);
	if (assets.length === 0 && hasPublishedAttachments(page.content_md)) {
		await importFromDestination(supabase, page, page.content_md);
		assets = await loadPageAssets(supabase, page.id);
	}
	return {
		assets,
		contentMd: assets.length > 0 ? stripPublishedAttachments(page.content_md) : page.content_md,
	};
}

async function importFromDestination(
	supabase: SupabaseClient,
	page: SitePage,
	body: string,
): Promise<void> {
	const dest = await loadSiteAstroDestination(supabase, page.site_id);
	if (!dest?.is_active) return;
	const cfg = parseGitHubRepoConfig(dest.config);
	if (!cfg) return;
	const creds = await decryptDestinationCredentials(dest);
	if (!creds || !isGitHubCredentials(dest.type, creds)) return;
	const pagesRoot = pagesContentPathFromConfig(dest.config);
	await importPageAssetsFromGitHub(
		supabase,
		cfg,
		creds.token,
		page.id,
		pageMarkdownPathFor(page, pagesRoot),
		body,
	);
}
