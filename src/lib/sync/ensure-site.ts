import type { SupabaseClient } from '@supabase/supabase-js';
import { loadSiteAstroDestination } from '@/lib/admin/sites';
import { decryptDestinationCredentials, isGitHubCredentials } from '@/lib/publish/credentials';
import {
	getBranchHeadCommitSha,
	listGitHubTreeBlobs,
	parseGitHubRepoConfig,
} from '@/lib/publish/github-api';
import { importPublishedPostsFromGitHub } from '@/lib/publish/github-import';
import { pagesContentPathFromConfig } from '@/lib/site-pages/paths';
import { reconcileSitePagesFromGitHub } from '@/lib/site-pages/reconcile';
import { loadSiteReconcileSha, saveSiteReconcileSha, shouldSkipReconcile } from './github-head';

export type EnsureSiteResult = {
	skipped: boolean;
	pagesPulled: number;
	postsPulled: number;
	error?: string;
};

export async function ensureSiteFromGitHub(
	supabase: SupabaseClient,
	siteId: string,
	authorId: string | null,
): Promise<EnsureSiteResult> {
	const dest = await loadSiteAstroDestination(supabase, siteId);
	if (!dest?.is_active) return { skipped: true, pagesPulled: 0, postsPulled: 0 };

	const cfg = parseGitHubRepoConfig(dest.config);
	if (!cfg) return { skipped: true, pagesPulled: 0, postsPulled: 0, error: 'invalid_repo' };

	const creds = await decryptDestinationCredentials(dest);
	if (!creds || !isGitHubCredentials(dest.type, creds)) {
		return { skipped: true, pagesPulled: 0, postsPulled: 0, error: 'no_github_token' };
	}

	let headSha: string;
	try {
		headSha = await getBranchHeadCommitSha(cfg, creds.token);
	} catch {
		return { skipped: true, pagesPulled: 0, postsPulled: 0, error: 'github_head_failed' };
	}

	const stored = await loadSiteReconcileSha(supabase, siteId);
	if (shouldSkipReconcile(stored, headSha)) {
		return { skipped: true, pagesPulled: 0, postsPulled: 0 };
	}

	let blobs;
	try {
		blobs = await listGitHubTreeBlobs(cfg, creds.token);
	} catch {
		return { skipped: false, pagesPulled: 0, postsPulled: 0, error: 'github_tree_failed' };
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
	);
	const posts = await importPublishedPostsFromGitHub(supabase, siteId, authorId, blobs);

	await saveSiteReconcileSha(supabase, siteId, headSha);
	const postsPulled = posts.ok ? posts.imported + posts.updated : 0;
	return {
		skipped: false,
		pagesPulled: pages.pulled,
		postsPulled,
		error: posts.ok ? undefined : posts.error,
	};
}

export async function ensureSitesFromGitHub(
	supabase: SupabaseClient,
	siteIds: string[],
	authorId: string | null,
): Promise<void> {
	for (const siteId of siteIds) {
		await ensureSiteFromGitHub(supabase, siteId, authorId);
	}
}
