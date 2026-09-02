import type { SupabaseClient } from '@supabase/supabase-js';
import { formatExternalGitHubPath } from '@/lib/publish/paths';
import { hashPublishedContent } from '@/lib/sync/policy';
import { parseSitePageFile, parseSitePagePath } from './parse';
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
): Promise<boolean> {
	const parsed = parseSitePageFile(raw);
	const fromPath = parseSitePagePath(pagesRoot, filePath);
	if (!parsed || !fromPath) return false;
	const pathPrefix = parsed.pathPrefix || fromPath.pathPrefix;
	const slug = parsed.slug || fromPath.slug;
	const payload = {
		title: parsed.title,
		slug,
		path_prefix: pathPrefix,
		content_md: parsed.body,
		status: 'published' as const,
		external_id: formatExternalGitHubPath(filePath),
		live_blob_sha: liveBlobSha,
		published_content_sha: hashPublishedContent(parsed.body),
	};
	if (existing) {
		const { error } = await supabase.from('site_pages').update(payload).eq('id', existing.id);
		return !error;
	}
	const { error } = await supabase.from('site_pages').insert({
		...payload,
		site_id: siteId,
		author_id: authorId,
	});
	return !error;
}
