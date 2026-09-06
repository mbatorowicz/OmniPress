import type { SupabaseClient } from '@supabase/supabase-js';
import { loadSiteAstroDestination } from '@/lib/admin/sites';
import { preparePublishMarkdown } from '@/lib/content/prepare-markdown';
import {
	decryptDestinationCredentials,
	isGitHubCredentials,
} from '@/lib/publish/credentials';
import type { SitePageForPublish } from './types';
import { formatExternalGitHubPath, parseExternalGitHubPath } from '@/lib/publish/paths';
import {
	getGitHubFile,
	parseGitHubRepoConfig,
	putGitHubFilesBatch,
	deleteGitHubFile,
	type GitHubFileWrite,
} from '@/lib/publish/github-api';
import { hashPublishedContent } from '@/lib/sync/policy';
import { buildSanitizedPageMarkdown, prepareSitePagePublish } from './publish-guard';
import { prepareRecentChangeAppendWrite } from '@/lib/recent-changes/github';
import type { RecentChangeEntry } from '@/lib/recent-changes/types';
import { buildSitePagePublicPath } from './url';

export type SitePagePublishResult =
	| {
			ok: true;
			summary: string;
			externalId: string;
			liveBlobSha: string;
			publishedContentSha: string;
	  }
	| { ok: false; error: string; summary?: string };

function buildPageRecentChangeEntry(page: SitePageForPublish): RecentChangeEntry {
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

	const body = buildSanitizedPageMarkdown(page, preparePublishMarkdown(page.content_md));
	const prepared = await prepareSitePagePublish(cfg, creds.token, dest.config, page, body);
	if (!prepared.ok) return { ok: false, error: prepared.error };

	const { filePath } = prepared;
	const contentSha = hashPublishedContent(page.content_md);
	if (prepared.skipWrite) {
		return {
			ok: true,
			summary: `Bez zmian ${filePath}`,
			externalId: formatExternalGitHubPath(filePath),
			liveBlobSha: prepared.remoteSha ?? '',
			publishedContentSha: contentSha,
		};
	}

	const batchFiles: GitHubFileWrite[] = [{ path: filePath, content: body }];
	try {
		const rcWrite = await prepareRecentChangeAppendWrite(
			cfg,
			creds.token,
			dest.config,
			buildPageRecentChangeEntry(page),
		);
		batchFiles.push(rcWrite);
	} catch {
		// Rejestr zmian nie blokuje publikacji strony
	}

	try {
		const { commitSha, blobShas } = await putGitHubFilesBatch(
			cfg,
			creds.token,
			batchFiles,
			`OmniPress: strona ${page.title}`,
		);
		return {
			ok: true,
			summary: `Opublikowano ${filePath} (${commitSha.slice(0, 7)}, 1 commit)`,
			externalId: formatExternalGitHubPath(filePath),
			liveBlobSha: blobShas[filePath] ?? '',
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

	const existing = await getGitHubFile(cfg, creds.token, filePath);
	if (!existing) return { ok: true };

	try {
		await deleteGitHubFile(
			cfg,
			creds.token,
			filePath,
			`OmniPress: zdejmij stronę ${page.title}`,
		);
	} catch {
		return { ok: false, error: 'withdraw_failed' };
	}
	return { ok: true };
}
