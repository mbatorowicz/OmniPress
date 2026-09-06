import type { SupabaseClient } from '@supabase/supabase-js';
import { admin } from '@/i18n';
import { parseAstroPostFile, slugFromGitHubMarkdownPath } from './astro-post-parse';
import { getGitHubFileText, type GitHubConfig } from './github-api';
import { stripPublishedAttachments } from './import-asset-model';
import { syncPostAssetsFromGitHub } from './import-assets';
import { ensureSuccessPublishLog, findExistingPostId } from './import-publish-log';
import { formatExternalGitHubPath } from './paths';
import type { DestinationForPublish } from './types';
import { prepareStorageMarkdown } from '@/lib/content/prepare-markdown';
import { decideReconcile, hashPublishedContent } from '@/lib/sync/policy';
import { toPublishAtIso } from './publish-date';

export type ImportOneAction = 'imported' | 'updated' | 'skipped';

type ExistingPost = {
	id: string;
	status: string;
	content_md: string;
	live_blob_sha: string | null;
	published_content_sha: string | null;
};

async function loadExistingPost(
	supabase: SupabaseClient,
	postId: string,
): Promise<ExistingPost | null> {
	const { data } = await supabase
		.from('posts')
		.select('id, status, content_md, live_blob_sha, published_content_sha')
		.eq('id', postId)
		.maybeSingle();
	return (data as ExistingPost | null) ?? null;
}

export async function importOnePost(
	supabase: SupabaseClient,
	cfg: GitHubConfig,
	token: string,
	destination: DestinationForPublish,
	siteId: string,
	authorId: string | null,
	markdownPath: string,
	liveBlobSha: string | null,
): Promise<{ action: ImportOneAction; errors: string[] }> {
	const slug = slugFromGitHubMarkdownPath(markdownPath, cfg.contentPath, cfg.contentLayout);
	const externalId = formatExternalGitHubPath(markdownPath);
	const existingId = await findExistingPostId(
		supabase,
		siteId,
		destination.id,
		externalId,
		slug,
	);
	const existing = existingId ? await loadExistingPost(supabase, existingId) : null;

	const first = decideReconcile({
		omniExists: Boolean(existing),
		omniContent: existing?.content_md ?? '',
		workflowStatus: existing?.status,
		liveBlobSha: liveBlobSha ?? '',
		storedLiveBlobSha: existing?.live_blob_sha ?? null,
		publishedContentSha: existing?.published_content_sha ?? null,
		currentContentSha: hashPublishedContent(existing?.content_md ?? ''),
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
