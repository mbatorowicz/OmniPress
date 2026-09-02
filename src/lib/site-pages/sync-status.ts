import type { DraftLiveStatus } from '@/lib/astro-layout/layout-sync-meta';
import { hashPublishedContent } from '@/lib/sync/policy';
import type { SitePage } from './types';

export function pageDraftLiveStatus(
	page: Pick<SitePage, 'status' | 'content_md' | 'live_blob_sha' | 'published_content_sha'>,
	liveBlobSha?: string | null,
): DraftLiveStatus {
	const currentSha = hashPublishedContent(page.content_md);
	const localAhead =
		page.status !== 'published' ||
		(Boolean(page.published_content_sha) && currentSha !== page.published_content_sha);
	const liveAhead = Boolean(
		liveBlobSha && page.live_blob_sha && liveBlobSha !== page.live_blob_sha,
	);
	if (localAhead) return 'draft_ahead';
	if (liveAhead) return 'live_ahead';
	if (page.status === 'published') return 'in_sync';
	return 'unknown';
}
