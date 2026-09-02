import type { SupabaseClient } from '@supabase/supabase-js';
import { loadSiteAstroDestination } from '@/lib/admin/sites';
import { decryptDestinationCredentials, isGitHubCredentials } from './credentials';
import {
	filterGitHubMarkdownPosts,
	listGitHubTreeBlobs,
	parseGitHubRepoConfig,
	type GitHubTreeBlob,
} from './github-api';
import { importOnePost } from './github-import-one';

export type ImportPostsResult =
	| { ok: true; imported: number; updated: number; skipped: number; errors: string[] }
	| { ok: false; error: string };

/** Importuje opublikowane wpisy z GitHub (auto-reconcile; nie rusza szkiców). */
export async function importPublishedPostsFromGitHub(
	supabase: SupabaseClient,
	siteId: string,
	authorId: string | null,
	treeBlobs?: GitHubTreeBlob[],
): Promise<ImportPostsResult> {
	const dest = await loadSiteAstroDestination(supabase, siteId);
	if (!dest?.is_active) return { ok: false, error: 'no_astro_destination' };

	const cfg = parseGitHubRepoConfig(dest.config);
	if (!cfg) return { ok: false, error: 'invalid_repo' };

	const creds = await decryptDestinationCredentials(dest);
	if (!creds || !isGitHubCredentials(dest.type, creds)) {
		return { ok: false, error: 'no_github_token' };
	}

	let blobs: GitHubTreeBlob[];
	try {
		blobs = treeBlobs ?? (await listGitHubTreeBlobs(cfg, creds.token));
	} catch {
		return { ok: false, error: 'github_tree_failed' };
	}

	const markdownPaths = filterGitHubMarkdownPosts(
		cfg,
		blobs.map((blob) => blob.path),
	);
	const shaByPath = new Map(blobs.map((blob) => [blob.path, blob.sha]));
	let imported = 0;
	let updated = 0;
	let skipped = 0;
	const errors: string[] = [];

	for (const markdownPath of markdownPaths) {
		const result = await importOnePost(
			supabase,
			cfg,
			creds.token,
			dest,
			siteId,
			authorId,
			markdownPath,
			shaByPath.get(markdownPath) ?? null,
		);
		if (result.action === 'imported') imported += 1;
		else if (result.action === 'updated') updated += 1;
		else skipped += 1;
		errors.push(...result.errors);
	}

	return { ok: true, imported, updated, skipped, errors };
}
