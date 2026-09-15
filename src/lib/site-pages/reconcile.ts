import type { SupabaseClient } from '@supabase/supabase-js';
import { getGitHubFileText, type GitHubConfig, type GitHubTreeBlob } from '@/lib/publish/github-api';
import { formatExternalGitHubPath } from '@/lib/publish/paths';
import { decideReconcile, hashPublishedContent, type ReconcileDecision } from '@/lib/sync/policy';
import { listSitePages } from './access';
import { pageIdsWithAssets } from './assets';
import { filterGitHubMarkdownPages, parseSitePageFile, parseSitePagePath } from './parse';
import { applySitePagePull } from './reconcile-apply';
import { buildSitePagePublicPath } from './url';
import { stripPublishedAttachments } from '@/lib/publish/import-asset-model';
import type { SitePage } from './types';

export type PageReconcileResult = { pulled: number; kept: number };

function findExistingPage(
	pages: SitePage[],
	pathPrefix: string,
	slug: string,
	filePath: string,
): SitePage | undefined {
	const href = buildSitePagePublicPath(pathPrefix, slug);
	const externalId = formatExternalGitHubPath(filePath);
	return pages.find(
		(page) =>
			page.external_id === externalId ||
			buildSitePagePublicPath(page.path_prefix, page.slug) === href,
	);
}

function decisionFor(
	existing: SitePage | undefined,
	liveBlobSha: string,
	liveContentSha?: string,
	treatAsFilled = false,
): ReconcileDecision {
	return decideReconcile({
		omniExists: Boolean(existing),
		omniContent: existing?.content_md ?? '',
		workflowStatus: existing?.status,
		liveBlobSha,
		storedLiveBlobSha: existing?.live_blob_sha ?? null,
		publishedContentSha: existing?.published_content_sha ?? null,
		currentContentSha: hashPublishedContent(existing?.content_md ?? ''),
		liveContentSha,
		treatAsFilled,
	});
}

function editorialShaFromRaw(raw: string): string {
	return hashPublishedContent(stripPublishedAttachments(parseSitePageFile(raw)?.body ?? raw));
}

export async function reconcileSitePagesFromGitHub(
	supabase: SupabaseClient,
	siteId: string,
	authorId: string | null,
	cfg: GitHubConfig,
	token: string,
	blobs: GitHubTreeBlob[],
	pagesRoot: string,
): Promise<PageReconcileResult> {
	const pages = await listSitePages(supabase, siteId);
	const pagesWithAssets = await pageIdsWithAssets(
		supabase,
		pages.map((page) => page.id),
	);
	let pulled = 0;
	let kept = 0;

	for (const blob of filterGitHubMarkdownPages(pagesRoot, blobs)) {
		const fromPath = parseSitePagePath(pagesRoot, blob.path);
		if (!fromPath) continue;
		const existing = findExistingPage(pages, fromPath.pathPrefix, fromPath.slug, blob.path);
		const treatAsFilled = existing ? pagesWithAssets.has(existing.id) : false;
		let decision = decisionFor(existing, blob.sha, undefined, treatAsFilled);

		if (decision === 'inspect' || decision === 'pull') {
			const raw = await getGitHubFileText(cfg, token, blob.path);
			if (!raw) {
				kept += 1;
				continue;
			}
			if (decision === 'inspect') {
				decision = decisionFor(existing, blob.sha, editorialShaFromRaw(raw), treatAsFilled);
			}
			if (decision === 'pull') {
				if (
					await applySitePagePull(
						supabase,
						siteId,
						authorId,
						pagesRoot,
						blob.path,
						blob.sha,
						existing,
						raw,
						{ cfg, token },
					)
				) {
					pulled += 1;
				}
				continue;
			}
		}

		if (decision === 'mark' && existing) {
			await supabase
				.from('site_pages')
				.update({
					live_blob_sha: blob.sha,
					published_content_sha:
						existing.published_content_sha ?? hashPublishedContent(existing.content_md),
				})
				.eq('id', existing.id);
		} else {
			kept += 1;
		}
	}

	return { pulled, kept };
}
