import type { SupabaseClient } from '@supabase/supabase-js';
import { loadSiteAstroDestination } from '@/lib/admin/sites';
import {
	parseAstroPostFile,
	siblingFolderPath,
	slugFromGitHubMarkdownPath,
	type ParsedAstroPost,
} from './astro-post-parse';
import {
	decryptDestinationCredentials,
	isGitHubCredentials,
} from './credentials';
import {
	getGitHubFileBinary,
	getGitHubFileText,
	filterGitHubMarkdownPosts,
	listGitHubSiblingAssets,
	listGitHubTreeBlobPaths,
	parseGitHubRepoConfig,
	type GitHubConfig,
} from './github-api';
import { formatExternalGitHubPath } from './paths';
import type { DestinationForPublish } from './types';
import { sanitizeStorageMarkdown } from '@/lib/content/sanitize';

export type ImportPostsResult =
	| { ok: true; imported: number; updated: number; skipped: number; errors: string[] }
	| { ok: false; error: string };

function mimeFromFilename(filename: string): string {
	const lower = filename.toLowerCase();
	if (lower.endsWith('.pdf')) return 'application/pdf';
	if (lower.endsWith('.png')) return 'image/png';
	if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
	if (lower.endsWith('.webp')) return 'image/webp';
	if (lower.endsWith('.gif')) return 'image/gif';
	return 'application/octet-stream';
}

function pdfDisplayMode(body: string, filename: string): 'link' | 'embed' {
	const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return new RegExp(
		`(?:iframe[^>]+src=["']\\.\\/${escaped}["']|data-op-pdf-src=["']\\.\\/${escaped}["'])`,
		'i',
	).test(body)
		? 'embed'
		: 'link';
}

function imageSortOrder(parsed: ParsedAstroPost, filename: string): number {
	const order: string[] = [];
	if (parsed.coverImage) order.push(assetBasename(parsed.coverImage));
	for (const ref of parsed.galleryImages) {
		const base = assetBasename(ref);
		if (!order.includes(base)) order.push(base);
	}
	const idx = order.indexOf(filename);
	return idx >= 0 ? idx : 100;
}

async function findExistingPostId(
	supabase: SupabaseClient,
	siteId: string,
	destinationId: string,
	externalId: string,
	slug: string,
): Promise<string | null> {
	const { data: byExternal } = await supabase
		.from('publish_logs')
		.select('post_id')
		.eq('destination_id', destinationId)
		.eq('external_id', externalId)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();
	if (byExternal?.post_id) return byExternal.post_id as string;

	const { data: bySlug } = await supabase
		.from('posts')
		.select('id')
		.eq('site_id', siteId)
		.eq('slug', slug)
		.maybeSingle();
	return (bySlug?.id as string | undefined) ?? null;
}

async function syncPostAssetsFromGitHub(
	supabase: SupabaseClient,
	cfg: GitHubConfig,
	token: string,
	postId: string,
	markdownPath: string,
	parsed: ParsedAstroPost,
	allBlobPaths: string[],
	skipIfUnchanged: boolean,
): Promise<string[]> {
	const assetPaths = listGitHubSiblingAssets(allBlobPaths, markdownPath);

	if (skipIfUnchanged) {
		const { data: oldAssets } = await supabase
			.from('assets')
			.select('filename')
			.eq('post_id', postId);
		const existing = new Set((oldAssets ?? []).map((a) => a.filename));
		const needed = assetPaths.map((p) => p.split('/').pop() ?? p);
		if (
			needed.length === existing.size &&
			needed.every((name) => existing.has(name))
		) {
			return [];
		}
	}

	return replacePostAssetsFromGitHub(
		supabase,
		cfg,
		token,
		postId,
		markdownPath,
		parsed,
		allBlobPaths,
	);
}

async function replacePostAssetsFromGitHub(
	supabase: SupabaseClient,
	cfg: GitHubConfig,
	token: string,
	postId: string,
	markdownPath: string,
	parsed: ParsedAstroPost,
	allBlobPaths: string[],
): Promise<string[]> {
	const errors: string[] = [];
	const assetPaths = listGitHubSiblingAssets(allBlobPaths, markdownPath);

	const { data: oldAssets } = await supabase
		.from('assets')
		.select('storage_path')
		.eq('post_id', postId);
	const storagePaths = (oldAssets ?? []).map((a) => a.storage_path).filter(Boolean);
	if (storagePaths.length > 0) {
		await supabase.storage.from('post-assets').remove(storagePaths);
	}
	await supabase.from('assets').delete().eq('post_id', postId);

	for (const assetPath of assetPaths) {
		const filename = assetPath.split('/').pop() ?? assetPath;
		try {
			const binary = await getGitHubFileBinary(cfg, token, assetPath);
			if (!binary) {
				errors.push(`${filename}: brak pliku na GitHub`);
				continue;
			}

			const mime = mimeFromFilename(filename);
			const storagePath = `${postId}/${filename}`;
			const { error: uploadError } = await supabase.storage
				.from('post-assets')
				.upload(storagePath, binary, { contentType: mime, upsert: true });
			if (uploadError) {
				errors.push(`${filename}: ${uploadError.message.slice(0, 80)}`);
				continue;
			}

			const display_mode =
				mime === 'application/pdf' ? pdfDisplayMode(parsed.body, filename) : 'link';
			const sort_order = mime.startsWith('image/') ? imageSortOrder(parsed, filename) : 0;

			const { error: insertError } = await supabase.from('assets').insert({
				post_id: postId,
				storage_path: storagePath,
				filename,
				mime_type: mime,
				display_mode,
				sort_order,
			});
			if (insertError) errors.push(`${filename}: zapis w bazie`);
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'błąd pobierania';
			errors.push(`${filename}: ${msg.slice(0, 80)}`);
		}
	}

	return errors;
}

async function ensureSuccessPublishLog(
	supabase: SupabaseClient,
	postId: string,
	destinationId: string,
	externalId: string,
	publishedAt: string | null,
): Promise<void> {
	const payload = {
		status: 'success' as const,
		external_id: externalId,
		response_summary: 'Import z GitHub',
		published_at: publishedAt ?? new Date().toISOString(),
		retry_count: 0,
		next_retry_at: null,
	};

	const { data: existing } = await supabase
		.from('publish_logs')
		.select('id')
		.eq('post_id', postId)
		.eq('destination_id', destinationId)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (existing?.id) {
		await supabase.from('publish_logs').update(payload).eq('id', existing.id);
		return;
	}

	await supabase.from('publish_logs').insert({
		post_id: postId,
		destination_id: destinationId,
		...payload,
	});
}

async function importOnePost(
	supabase: SupabaseClient,
	cfg: GitHubConfig,
	token: string,
	destination: DestinationForPublish,
	siteId: string,
	authorId: string,
	markdownPath: string,
	allBlobPaths: string[],
): Promise<{ action: 'imported' | 'updated' | 'skipped'; errors: string[] }> {
	const raw = await getGitHubFileText(cfg, token, markdownPath);
	if (!raw) return { action: 'skipped', errors: [`${markdownPath}: brak treści`] };

	const parsed = parseAstroPostFile(raw);
	if (!parsed) return { action: 'skipped', errors: [`${markdownPath}: nieprawidłowy frontmatter`] };
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
		content_md: sanitizeStorageMarkdown(parsed.body),
		category_slug: parsed.categorySlug || null,
		category_name: parsed.categoryName || null,
		status: 'published' as const,
	};

	let postId = existingId;
	const errors: string[] = [];

	if (postId) {
		const { error } = await supabase.from('posts').update(postPayload).eq('id', postId);
		if (error) return { action: 'skipped', errors: [`${slug}: ${error.message.slice(0, 80)}`] };
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
			return { action: 'skipped', errors: [`${slug}: nie udało się utworzyć wpisu`] };
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
			allBlobPaths,
			Boolean(existingId),
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
			allBlobPaths,
		);
		if (result.action === 'imported') imported += 1;
		else if (result.action === 'updated') updated += 1;
		else skipped += 1;
		errors.push(...result.errors);
	}

	return { ok: true, imported, updated, skipped, errors };
}
