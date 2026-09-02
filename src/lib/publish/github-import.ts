import type { SupabaseClient } from '@supabase/supabase-js';
import { admin } from '@/i18n';
import { loadSiteAstroDestination } from '@/lib/admin/sites';
import { parseAstroPostFile, slugFromGitHubMarkdownPath } from './astro-post-parse';
import { decryptDestinationCredentials, isGitHubCredentials } from './credentials';
import {
	getGitHubFileText,
	filterGitHubMarkdownPosts,
	listGitHubTreeBlobPaths,
	parseGitHubRepoConfig,
	type GitHubConfig,
} from './github-api';
import { stripPublishedAttachments } from './import-asset-model';
import { syncPostAssetsFromGitHub } from './import-assets';
import { ensureSuccessPublishLog, findExistingPostId } from './import-publish-log';
import { formatExternalGitHubPath } from './paths';
import type { DestinationForPublish } from './types';
import { sanitizeStorageMarkdown } from '@/lib/content/sanitize';

export type ImportPostsResult =
	| { ok: true; imported: number; updated: number; skipped: number; errors: string[] }
	| { ok: false; error: string };

async function importOnePost(
	supabase: SupabaseClient,
	cfg: GitHubConfig,
	token: string,
	destination: DestinationForPublish,
	siteId: string,
	authorId: string,
	markdownPath: string,
): Promise<{ action: 'imported' | 'updated' | 'skipped'; errors: string[] }> {
	const raw = await getGitHubFileText(cfg, token, markdownPath);
	if (!raw) {
		return { action: 'skipped', errors: [admin.importPosts.postErrors.noContent(markdownPath)] };
	}

	const parsed = parseAstroPostFile(raw);
	if (!parsed) {
		return {
			action: 'skipped',
			errors: [admin.importPosts.postErrors.badFrontmatter(markdownPath)],
		};
	}
	if (parsed.draft) return { action: 'skipped', errors: [] };

	const slug = slugFromGitHubMarkdownPath(markdownPath, cfg.contentPath, cfg.contentLayout);
	const externalId = formatExternalGitHubPath(markdownPath);
	const existingId = await findExistingPostId(
		supabase,
		siteId,
		destination.id,
		externalId,
		slug,
	);

	const postPayload = {
		title: parsed.title,
		slug,
		content_md: sanitizeStorageMarkdown(stripPublishedAttachments(parsed.body)),
		category_slug: parsed.categorySlug || null,
		category_name: parsed.categoryName || null,
		pinned: parsed.pinned,
		status: 'published' as const,
	};

	let postId = existingId;
	const errors: string[] = [];

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
			.insert({
				...postPayload,
				site_id: siteId,
				author_id: authorId,
			})
			.select('id')
			.single();
		if (error || !data) {
			return { action: 'skipped', errors: [admin.importPosts.postErrors.create(slug)] };
		}
		postId = data.id as string;
	}

	errors.push(
		...(await syncPostAssetsFromGitHub(
			supabase,
			cfg,
			token,
			postId,
			markdownPath,
			parsed,
		)),
	);
	await ensureSuccessPublishLog(
		supabase,
		postId,
		destination.id,
		externalId,
		parsed.date,
	);

	return { action: existingId ? 'updated' : 'imported', errors };
}

/** Importuje opublikowane wpisy z GitHub do OmniPress (status published + publish_log). */
export async function importPublishedPostsFromGitHub(
	supabase: SupabaseClient,
	siteId: string,
	authorId: string,
): Promise<ImportPostsResult> {
	const dest = await loadSiteAstroDestination(supabase, siteId);
	if (!dest?.is_active) return { ok: false, error: 'no_astro_destination' };

	const cfg = parseGitHubRepoConfig(dest.config);
	if (!cfg) return { ok: false, error: 'invalid_repo' };

	const creds = await decryptDestinationCredentials(dest);
	if (!creds || !isGitHubCredentials(dest.type, creds)) {
		return { ok: false, error: 'no_github_token' };
	}

	let allBlobPaths: string[];
	try {
		allBlobPaths = await listGitHubTreeBlobPaths(cfg, creds.token);
	} catch {
		return { ok: false, error: 'github_tree_failed' };
	}

	const markdownPaths = filterGitHubMarkdownPosts(cfg, allBlobPaths);
	if (markdownPaths.length === 0) {
		return { ok: true, imported: 0, updated: 0, skipped: 0, errors: [] };
	}

	let imported = 0;
	let updated = 0;
	let skipped = 0;
	const errors: string[] = [];

	for (const markdownPath of markdownPaths) {
		const result = await importOnePost(
			supabase,
			cfg,
			creds.token,
			dest,
			siteId,
			authorId,
			markdownPath,
		);
		if (result.action === 'imported') imported += 1;
		else if (result.action === 'updated') updated += 1;
		else skipped += 1;
		errors.push(...result.errors);
	}

	return { ok: true, imported, updated, skipped, errors };
}
