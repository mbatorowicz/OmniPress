import type { SupabaseClient } from '@supabase/supabase-js';
import { loadSiteAstroDestination } from '@/lib/admin/sites';
import { importSiteAstroLayoutFromGitHub } from '@/lib/astro-layout/store';
import { slugFromGitHubMarkdownPath } from '@/lib/publish/astro-post-parse';
import { decryptDestinationCredentials, isGitHubCredentials } from '@/lib/publish/credentials';
import {
	filterGitHubMarkdownPosts,
	getBranchHeadCommitSha,
	listGitHubTreeBlobs,
	parseGitHubRepoConfig,
} from '@/lib/publish/github-api';
import { importPublishedPostsFromGitHub } from '@/lib/publish/github-import';
import { filterGitHubMarkdownPages, parseSitePagePath } from '@/lib/site-pages/parse';
import { pagesContentPathFromConfig } from '@/lib/site-pages/paths';
import { reconcileSitePagesFromGitHub } from '@/lib/site-pages/reconcile';
import { buildSitePagePublicPath } from '@/lib/site-pages/url';
import { saveSiteReconcileSha } from './github-head';
import {
	cancelOpenPublishJobs,
	deleteOmniOnlyDraftPages,
	deleteOmniOnlyUnpublishedPosts,
} from './reset-to-live-cleanup';

export type ResetToLiveResult = {
	skipped: boolean;
	pendingCancelled: number;
	postsPulled: number;
	pagesPulled: number;
	draftsDeleted: number;
	pagesDeleted: number;
	layoutImported: boolean;
	error?: string;
};

const idle = (): ResetToLiveResult => ({
	skipped: true,
	pendingCancelled: 0,
	postsPulled: 0,
	pagesPulled: 0,
	draftsDeleted: 0,
	pagesDeleted: 0,
	layoutImported: false,
});

/** Omni ← origin/main. Zero zapisu na GitHub. */
export async function resetOmniToLiveFromGitHub(
	supabase: SupabaseClient,
	siteId: string,
	authorId: string | null,
): Promise<ResetToLiveResult> {
	const dest = await loadSiteAstroDestination(supabase, siteId);
	if (!dest?.is_active) return { ...idle(), error: 'no_astro_destination' };

	const cfg = parseGitHubRepoConfig(dest.config);
	if (!cfg) return { ...idle(), error: 'invalid_repo' };

	const creds = await decryptDestinationCredentials(dest);
	if (!creds || !isGitHubCredentials(dest.type, creds)) {
		return { ...idle(), error: 'no_github_token' };
	}

	const pendingCancelled = await cancelOpenPublishJobs(supabase, siteId);

	let blobs;
	try {
		blobs = await listGitHubTreeBlobs(cfg, creds.token);
	} catch {
		return { ...idle(), pendingCancelled, skipped: false, error: 'github_tree_failed' };
	}

	const pagesRoot = pagesContentPathFromConfig(dest.config);
	const pages = await reconcileSitePagesFromGitHub(
		supabase,
		siteId,
		authorId,
		cfg,
		creds.token,
		blobs,
		pagesRoot,
		true,
	);
	const posts = await importPublishedPostsFromGitHub(supabase, siteId, authorId, blobs, {
		force: true,
	});

	const liveSlugs = new Set(
		filterGitHubMarkdownPosts(
			cfg,
			blobs.map((blob) => blob.path),
		).map((path) => slugFromGitHubMarkdownPath(path, cfg.contentPath, cfg.contentLayout)),
	);
	const liveHrefs = new Set(
		filterGitHubMarkdownPages(pagesRoot, blobs).flatMap((blob) => {
			const parsed = parseSitePagePath(pagesRoot, blob.path);
			return parsed ? [buildSitePagePublicPath(parsed.pathPrefix, parsed.slug)] : [];
		}),
	);

	const draftsDeleted = await deleteOmniOnlyUnpublishedPosts(supabase, siteId, liveSlugs);
	const pagesDeleted = await deleteOmniOnlyDraftPages(supabase, siteId, liveHrefs);
	const layout = await importSiteAstroLayoutFromGitHub(supabase, siteId);

	try {
		await saveSiteReconcileSha(supabase, siteId, await getBranchHeadCommitSha(cfg, creds.token));
	} catch {
		/* HEAD fingerprint is optional after a successful live pull */
	}

	return {
		skipped: false,
		pendingCancelled,
		postsPulled: posts.ok ? posts.imported + posts.updated : 0,
		pagesPulled: pages.pulled,
		draftsDeleted,
		pagesDeleted,
		layoutImported: layout.ok,
		error: posts.ok ? undefined : posts.error,
	};
}
