import type { SupabaseClient } from '@supabase/supabase-js';
import { admin } from '@/i18n';
import { parseAstroPostFile, slugFromGitHubMarkdownPath } from './astro-post-parse';
import { getGitHubFileText, type GitHubConfig } from './github-api';
import { stripPublishedAttachments } from './import-asset-model';
import { syncPostAssetsFromGitHub } from './import-assets';
import { ensureSuccessPublishLog } from './import-publish-log';
import { type ExistingPostIndex, resolveExistingPost } from './import-existing';
import { formatExternalGitHubPath } from './paths';
import type { DestinationForPublish } from './types';
import { prepareStorageMarkdown } from '@/lib/content/prepare-markdown';
import { decideReconcile, hashPublishedContent } from '@/lib/sync/policy';
import { toPublishAtIso } from './publish-date';

export type ImportOneAction = 'imported' | 'updated' | 'skipped';

export async function importOnePost(
	supabase: SupabaseClient,
	cfg: GitHubConfig,
	token: string,
	destination: DestinationForPublish,
	siteId: string,
	authorId: string | null,
	markdownPath: string,
	liveBlobSha: string | null,
	index?: ExistingPostIndex,
	force = false,
): Promise<{ action: ImportOneAction; errors: string[] }> {
	const slug = slugFromGitHubMarkdownPath(markdownPath, cfg.contentPath, cfg.contentLayout);
	const externalId = formatExternalGitHubPath(markdownPath);
	const { existingId, existing } = await resolveExistingPost(
		supabase,
		siteId,
		destination.id,
		externalId,
		slug,
		index,
	);

	const first = decideReconcile({
		omniExists: Boolean(existing),
		omniContent: existing?.content_md ?? '',
		workflowStatus: existing?.status,
		liveBlobSha: liveBlobSha ?? '',
		storedLiveBlobSha: existing?.live_blob_sha ?? null,
		publishedContentSha: existing?.published_content_sha ?? null,
		currentContentSha: hashPublishedContent(existing?.content_md ?? ''),
		forcePull: force,
	});
	if (first === 'keep' || first === 'mark') {
		if (first === 'mark' && existing && liveBlobSha) {
			await supabase
				.from('posts')
				.update({
					live_blob_sha: liveBlobSha,
					published_content_sha:
						existing.published_content_sha ?? hashPublishedContent(existing.content_md),
				})
				.eq('id', existing.id);
		}
		return { action: 'skipped', errors: [] };
	}

	const raw = await getGitHubFileText(cfg, token, markdownPath);
	if (!raw) {
		return { action: 'skipped', errors: [admin.importPosts.postErrors.noContent(markdownPath)] };
	}
	const parsed = parseAstroPostFile(raw);
	if (!parsed) {
		return { action: 'skipped', errors: [admin.importPosts.postErrors.badFrontmatter(markdownPath)] };
	}
	if (parsed.draft) return { action: 'skipped', errors: [] };

	if (first === 'inspect' && existing) {
		const next = decideReconcile({
			omniExists: true,
			omniContent: existing.content_md,
			workflowStatus: existing.status,
			liveBlobSha: liveBlobSha ?? '',
			storedLiveBlobSha: existing.live_blob_sha,
			publishedContentSha: existing.published_content_sha,
			currentContentSha: hashPublishedContent(existing.content_md),
			liveContentSha: hashPublishedContent(stripPublishedAttachments(parsed.body)),
			forcePull: force,
		});
		if (next !== 'pull') return { action: 'skipped', errors: [] };
	}

	const contentMd = prepareStorageMarkdown(stripPublishedAttachments(parsed.body));
	const postPayload = {
		title: parsed.title,
		slug,
		content_md: contentMd,
		category_slug: parsed.categorySlug || null,
		category_name: parsed.categoryName || null,
		extra_category_slugs: parsed.extraCategorySlugs,
		pinned: parsed.pinned,
		status: 'published' as const,
		scheduled_publish_at: toPublishAtIso(parsed.date),
		live_blob_sha: liveBlobSha,
		published_content_sha: hashPublishedContent(contentMd),
	};

	let postId = existingId;
	if (postId) {
		const { error } = await supabase.from('posts').update(postPayload).eq('id', postId);
		if (error) {
			return {
				action: 'skipped',
				errors: [admin.importPosts.postErrors.save(slug, error.message.slice(0, 80))],
			};
		}
	} else {
		const { data, error } = await supabase
			.from('posts')
			.insert({ ...postPayload, site_id: siteId, author_id: authorId })
			.select('id')
			.single();
		if (error || !data) {
			return { action: 'skipped', errors: [admin.importPosts.postErrors.create(slug)] };
		}
		postId = data.id as string;
	}

	const errors = await syncPostAssetsFromGitHub(
		supabase,
		cfg,
		token,
		postId,
		markdownPath,
		parsed,
	);
	await ensureSuccessPublishLog(supabase, postId, destination.id, externalId, parsed.date);
	return { action: existingId ? 'updated' : 'imported', errors };
}
