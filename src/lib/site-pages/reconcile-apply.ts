import type { SupabaseClient } from '@supabase/supabase-js';
import { formatExternalGitHubPath } from '@/lib/publish/paths';
import { hashPublishedContent } from '@/lib/sync/policy';
import { stripPublishedAttachments } from '@/lib/publish/import-asset-model';
import type { GitHubConfig } from '@/lib/publish/github-api';
import { parseSitePageFile, parseSitePagePath } from './parse';
import { importPageAssetsFromGitHub } from './import-assets';
import type { SitePage } from './types';

export async function applySitePagePull(
	supabase: SupabaseClient,
	siteId: string,
	authorId: string | null,
	pagesRoot: string,
	filePath: string,
	liveBlobSha: string,
	existing: SitePage | undefined,
	raw: string,
	github?: { cfg: GitHubConfig; token: string; pruneStale?: boolean },
): Promise<boolean> {
	const parsed = parseSitePageFile(raw);
	const fromPath = parseSitePagePath(pagesRoot, filePath);
	if (!parsed || !fromPath) return false;
	const pathPrefix = parsed.pathPrefix || fromPath.pathPrefix;
	const slug = parsed.slug || fromPath.slug;
	const contentMd = stripPublishedAttachments(parsed.body);
	const payload = {
		title: parsed.title,
		slug,
		path_prefix: pathPrefix,
		content_md: contentMd,
		status: 'published' as const,
		external_id: formatExternalGitHubPath(filePath),
		live_blob_sha: liveBlobSha,
		published_content_sha: hashPublishedContent(contentMd),
	};
	let pageId = existing?.id;
	if (existing) {
		const { error } = await supabase.from('site_pages').update(payload).eq('id', existing.id);
		if (error) return false;
	} else {
		const { data, error } = await supabase
			.from('site_pages')
			.insert({
				...payload,
				site_id: siteId,
				author_id: authorId,
			})
			.select('id')
			.single();
		if (error || !data) return false;
		pageId = data.id as string;
	}
	if (pageId && github) {
		await importPageAssetsFromGitHub(
			supabase,
			github.cfg,
			github.token,
			pageId,
			filePath,
			parsed.body,
			Boolean(github.pruneStale),
		);
	}
	return true;
}
