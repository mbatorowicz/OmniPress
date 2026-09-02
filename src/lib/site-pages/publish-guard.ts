import { getGitHubFile, getGitHubFileText, type GitHubConfig } from '@/lib/publish/github-api';
import { parseExternalGitHubPath } from '@/lib/publish/paths';
import { shouldRefusePublish } from '@/lib/sync/policy';
import { buildSitePageMarkdown } from './frontmatter';
import { pagesContentPathFromConfig, sitePageMarkdownPath } from './paths';
import type { SitePageForPublish } from './types';

export type PreparedPagePublish =
	| { ok: false; error: 'remote_richer' }
	| { ok: true; filePath: string; body: string; skipWrite: boolean; remoteSha: string | null };

export async function prepareSitePagePublish(
	cfg: GitHubConfig,
	token: string,
	destConfig: Record<string, unknown>,
	page: SitePageForPublish,
	body: string,
): Promise<PreparedPagePublish> {
	const pagesRoot = pagesContentPathFromConfig(destConfig);
	const filePath =
		parseExternalGitHubPath(page.external_id) ??
		sitePageMarkdownPath(pagesRoot, page.path_prefix, page.slug);
	const remote = await getGitHubFileText(cfg, token, filePath);
	if (shouldRefusePublish(page.content_md, remote)) {
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
