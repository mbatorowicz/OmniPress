import type { SupabaseClient } from '@supabase/supabase-js';
import { loadSiteAstroDestination } from '@/lib/admin/sites';
import {
	assetBasename,
	parseAstroPostFile,
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
	listGitHubDirectoryBlobs,
	listGitHubTreeBlobPaths,
	parseGitHubRepoConfig,
	type GitHubConfig,
	type GitHubDirBlob,
} from './github-api';
import { formatExternalGitHubPath, postDirFromMarkdownPath } from './paths';
import type { DestinationForPublish } from './types';
import { sanitizeStorageMarkdown } from '@/lib/content/sanitize';
import { gitBlobShaFromBytes } from './git-blob';

export type ImportPostsResult =
	| { ok: true; imported: number; updated: number; skipped: number; errors: string[] }
	| { ok: false; error: string };

function mimeFromFilename(filename: string): string {
	const lower = filename.toLowerCase();
	if (lower.endsWith('.pdf')) return 'application/pdf';
	if (lower.endsWith('.docx')) {
		return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
	}
	if (lower.endsWith('.gpkg')) return 'application/geopackage+sqlite3';
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

type LocalAsset = {
	id: string;
	filename: string;
	storage_path: string;
	content_sha: string | null;
};

async function loadLocalAssets(
	supabase: SupabaseClient,
	postId: string,
): Promise<LocalAsset[]> {
	const { data } = await supabase
		.from('assets')
		.select('id, filename, storage_path, content_sha')
		.eq('post_id', postId);
	return (data ?? []).map((row) => ({
		id: row.id as string,
		filename: row.filename as string,
		storage_path: row.storage_path as string,
		content_sha: typeof row.content_sha === 'string' ? row.content_sha : null,
	}));
}

async function upsertAssetFromGitHub(
	supabase: SupabaseClient,
	cfg: GitHubConfig,
	token: string,
	postId: string,
	blob: GitHubDirBlob,
	parsed: ParsedAstroPost,
	existing: LocalAsset | undefined,
): Promise<string | null> {
	const filename = blob.name;
	if (existing?.content_sha && existing.content_sha === blob.sha) {
		return null;
	}

	const binary = await getGitHubFileBinary(cfg, token, blob.path);
	if (!binary) return `${filename}: brak pliku na GitHub`;

	const sha = gitBlobShaFromBytes(binary);
	const mime = mimeFromFilename(filename);
	const storagePath = existing?.storage_path ?? `${postId}/${filename}`;
	const { error: uploadError } = await supabase.storage
		.from('post-assets')
		.upload(storagePath, binary, { contentType: mime, upsert: true });
	if (uploadError) return `${filename}: ${uploadError.message.slice(0, 80)}`;

	const display_mode = mime === 'application/pdf' ? pdfDisplayMode(parsed.body, filename) : 'link';
	const sort_order = mime.startsWith('image/') ? imageSortOrder(parsed, filename) : 0;

	if (existing) {
		const { error } = await supabase
			.from('assets')
			.update({
				storage_path: storagePath,
				mime_type: mime,
				display_mode,
				sort_order,
				content_sha: sha,
			})
			.eq('id', existing.id);
		if (error) return `${filename}: zapis w bazie`;
		return null;
	}

	const { error: insertError } = await supabase.from('assets').insert({
		post_id: postId,
		storage_path: storagePath,
		filename,
		mime_type: mime,
		display_mode,
		sort_order,
		content_sha: sha,
	});
	if (insertError) return `${filename}: zapis w bazie`;
	return null;
}

async function syncPostAssetsFromGitHub(
	supabase: SupabaseClient,
	cfg: GitHubConfig,
	token: string,
	postId: string,
	markdownPath: string,
	parsed: ParsedAstroPost,
): Promise<string[]> {
	const errors: string[] = [];
	const folder = postDirFromMarkdownPath(markdownPath);
	let remoteBlobs: GitHubDirBlob[] = [];
	try {
		remoteBlobs = (await listGitHubDirectoryBlobs(cfg, token, folder)).filter(
			(b) => !b.name.toLowerCase().endsWith('.md'),
		);
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'listing';
		return [`${folder}: ${msg.slice(0, 80)}`];
	}

	const localAssets = await loadLocalAssets(supabase, postId);
	const localByName = new Map(localAssets.map((a) => [a.filename, a]));
	const remoteNames = new Set(remoteBlobs.map((b) => b.name));

	for (const blob of remoteBlobs) {
		const err = await upsertAssetFromGitHub(
			supabase,
			cfg,
			token,
			postId,
			blob,
			parsed,
			localByName.get(blob.name),
		);
		if (err) errors.push(err);
	}

	const stale = localAssets.filter((a) => !remoteNames.has(a.filename));
	if (stale.length > 0) {
		const paths = stale.map((a) => a.storage_path).filter(Boolean);
		if (paths.length > 0) {
			await supabase.storage.from('post-assets').remove(paths);
		}
		await supabase
			.from('assets')
			.delete()
			.in(
				'id',
				stale.map((a) => a.id),
			);
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
