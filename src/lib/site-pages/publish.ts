import type { SupabaseClient } from '@supabase/supabase-js';
import { loadSiteAstroDestination } from '@/lib/admin/sites';
import {
	decryptDestinationCredentials,
	isGitHubCredentials,
} from '@/lib/publish/credentials';
import { preparePdfViewerWrites } from '@/lib/publish/github-pdf-viewer';
import { formatExternalGitHubPath, parseExternalGitHubPath } from '@/lib/publish/paths';
import { resolveSitePageFilePath } from './paths';
import {
	deleteGitHubFilesBatch,
	parseGitHubRepoConfig,
	putGitHubFilesBatch,
	type GitHubFileWrite,
} from '@/lib/publish/github-api';
import { hashPublishedContent } from '@/lib/sync/policy';
import { prepareRecentChangeAppendWrite } from '@/lib/recent-changes/github';
import type { RecentChangeEntry } from '@/lib/recent-changes/types';
import { loadPageAssets } from './assets';
import { collectPageAssetWrites, stalePageFolderDeletes } from './publish-assets';
import { buildPagePublishedMarkdown } from './publish-body';
import { prepareSitePagePublish } from './publish-guard';
import { buildSitePagePublicPath } from './url';
import type { SitePageForPublish } from './types';

export type SitePagePublishResult =
	| {
			ok: true;
			summary: string;
			externalId: string;
			liveBlobSha: string;
			publishedContentSha: string;
	  }
	| { ok: false; error: string; summary?: string };

function pageRecentChange(page: SitePageForPublish): RecentChangeEntry {
	return {
		title: page.title,
		href: buildSitePagePublicPath(page.path_prefix, page.slug),
		kind: 'page',
		changedAt: new Date().toISOString(),
		sourceId: page.id,
	};
}

export async function publishSitePageToGitHub(
	supabase: SupabaseClient,
	page: SitePageForPublish,
): Promise<SitePagePublishResult> {
	const dest = await loadSiteAstroDestination(supabase, page.site_id);
	if (!dest?.is_active) return { ok: false, error: 'no_astro_destination' };

	const cfg = parseGitHubRepoConfig(dest.config);
	if (!cfg) return { ok: false, error: 'invalid_repo' };

	const creds = await decryptDestinationCredentials(dest);
	if (!creds || !isGitHubCredentials(dest.type, creds)) {
		return { ok: false, error: 'no_github_token' };
	}

	const assets = await loadPageAssets(supabase, page.id);
	const collected = await collectPageAssetWrites(
		supabase,
		cfg,
		dest.config,
		creds.token,
		resolveSitePageFilePath(dest.config, page),
		assets,
		assets.length > 0,
	);
	if (collected.errors.length > 0) {
		return {
			ok: false,
			error: 'publish_failed',
			summary: collected.errors.join('; ').slice(0, 200),
		};
	}

	const published = buildPagePublishedMarkdown(page, assets, collected.map);
	const prepared = await prepareSitePagePublish(
		cfg,
		creds.token,
		dest.config,
		page,
		published.markdown,
		{ hasAssets: assets.length > 0 },
	);
	if (!prepared.ok) return { ok: false, error: prepared.error };

	const contentSha = hashPublishedContent(page.content_md);
	const pdfViewerWrites = published.hasPdfEmbed
		? await preparePdfViewerWrites(cfg, creds.token)
		: [];
	const oldPath = parseExternalGitHubPath(page.external_id);
	const staleFolder =
		oldPath && oldPath !== prepared.filePath
			? await stalePageFolderDeletes(cfg, creds.token, oldPath)
			: [];
	const deletes = [...new Set([...collected.deletes, ...staleFolder])];
	if (oldPath && oldPath !== prepared.filePath) deletes.push(oldPath);

	const batchFiles: GitHubFileWrite[] = [...collected.writes, ...pdfViewerWrites];
	if (!prepared.skipWrite) {
		batchFiles.push({ path: prepared.filePath, content: prepared.body });
	}

	if (batchFiles.length === 0 && deletes.length === 0) {
		return {
			ok: true,
			summary: `Bez zmian ${prepared.filePath}`,
			externalId: formatExternalGitHubPath(prepared.filePath),
			liveBlobSha: prepared.remoteSha ?? '',
			publishedContentSha: contentSha,
		};
	}

	try {
		batchFiles.push(
			await prepareRecentChangeAppendWrite(cfg, creds.token, dest.config, pageRecentChange(page)),
		);
	} catch {
		// Rejestr zmian nie blokuje publikacji strony
	}

	try {
		const { commitSha, blobShas } = await putGitHubFilesBatch(
			cfg,
			creds.token,
			batchFiles,
			`OmniPress: strona ${page.title}`,
			{ deletes },
		);
		return {
			ok: true,
			summary: `Opublikowano ${prepared.filePath} (${commitSha.slice(0, 7)}, 1 commit)`,
			externalId: formatExternalGitHubPath(prepared.filePath),
			liveBlobSha: blobShas[prepared.filePath] ?? '',
			publishedContentSha: contentSha,
		};
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'GitHub upload failed';
		return { ok: false, error: 'publish_failed', summary: msg.slice(0, 200) };
	}
}

export async function withdrawSitePageFromGitHub(
	supabase: SupabaseClient,
	page: SitePageForPublish,
): Promise<{ ok: true } | { ok: false; error: string }> {
	const filePath = parseExternalGitHubPath(page.external_id);
	if (!filePath) return { ok: true };

	const dest = await loadSiteAstroDestination(supabase, page.site_id);
	if (!dest?.is_active) return { ok: false, error: 'no_astro_destination' };

	const cfg = parseGitHubRepoConfig(dest.config);
	if (!cfg) return { ok: false, error: 'invalid_repo' };

	const creds = await decryptDestinationCredentials(dest);
	if (!creds || !isGitHubCredentials(dest.type, creds)) {
		return { ok: false, error: 'no_github_token' };
	}

	try {
		const extras = await stalePageFolderDeletes(cfg, creds.token, filePath);
		await deleteGitHubFilesBatch(
			cfg,
			creds.token,
			[filePath, ...extras],
			`OmniPress: zdejmij stronę ${page.title}`,
		);
	} catch {
		return { ok: false, error: 'withdraw_failed' };
	}
	return { ok: true };
}
