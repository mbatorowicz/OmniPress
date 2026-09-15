import { getGitHubFile, getGitHubFileText, type GitHubConfig } from '@/lib/publish/github-api';
import { stripPublishedAttachments } from '@/lib/publish/import-asset-model';
import { parseExternalGitHubPath } from '@/lib/publish/paths';
import { isPlaceholderOrEmpty, shouldRefusePublish } from '@/lib/sync/policy';
import { buildSitePageMarkdown } from './frontmatter';
import { parseSitePageFile } from './parse';
import { pagesContentPathFromConfig, sitePageMarkdownPath } from './paths';
import type { SitePageForPublish } from './types';

export type PreparedPagePublish =
	| { ok: false; error: 'remote_richer' }
	| { ok: true; filePath: string; body: string; skipWrite: boolean; remoteSha: string | null };

export type PreparePagePublishOptions = {
	hasAssets?: boolean;
};

function omniForRefuse(contentMd: string, hasAssets: boolean): string {
	if (hasAssets && isPlaceholderOrEmpty(contentMd)) return '[assets]';
	return contentMd;
}

export async function prepareSitePagePublish(
	cfg: GitHubConfig,
	token: string,
	destConfig: Record<string, unknown>,
	page: SitePageForPublish,
	body: string,
	options?: PreparePagePublishOptions,
): Promise<PreparedPagePublish> {
	const pagesRoot = pagesContentPathFromConfig(destConfig);
	const filePath =
		parseExternalGitHubPath(page.external_id) ??
		sitePageMarkdownPath(pagesRoot, page.path_prefix, page.slug);
	const remote = await getGitHubFileText(cfg, token, filePath);
	const hasAssets = options?.hasAssets === true;
	const remoteForRefuse = hasAssets
		? remote
			? stripPublishedAttachments(parseSitePageFile(remote)?.body ?? remote)
			: null
		: remote;
	if (shouldRefusePublish(omniForRefuse(page.content_md, hasAssets), remoteForRefuse)) {
		return { ok: false, error: 'remote_richer' };
	}
	const meta = remote ? await getGitHubFile(cfg, token, filePath) : null;
	return {
		ok: true,
		filePath,
		body,
		skipWrite: remote === body,
		remoteSha: meta?.sha ?? null,
	};
}

export function buildSanitizedPageMarkdown(
	page: SitePageForPublish,
	contentMd: string,
): string {
	return buildSitePageMarkdown(page.title, page.path_prefix, page.slug, contentMd);
}
