/**
 * Import załączników strony z folderu GitHub → Storage + `assets.page_id`.
 * Domyślnie upsert. `pruneStale` (reset do produkcji) zdejmuje lokalne pliki spoza origin.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { gitBlobShaFromBytes } from '@/lib/publish/git-blob';
import {
	getGitHubFileBinary,
	listGitHubDirectoryBlobs,
	type GitHubConfig,
	type GitHubDirBlob,
} from '@/lib/publish/github-api';
import { parseExternalGitHubPath } from '@/lib/publish/paths';
import {
	assetLabelFromBody,
	isManagedAttachmentFilename,
	mimeFromFilename,
	pdfDisplayMode,
	removablePaths,
	storageBasename,
} from '@/lib/publish/import-asset-model';
import { sitePageDirFromMarkdownPath, sitePageMarkdownPath } from './paths';
import type { SitePage } from './types';

const BUCKET = 'post-assets';

type LocalAsset = {
	id: string;
	storage_path: string;
	content_sha: string | null;
};

async function loadLocal(supabase: SupabaseClient, pageId: string): Promise<LocalAsset[]> {
	const { data } = await supabase
		.from('assets')
		.select('id, storage_path, content_sha')
		.eq('page_id', pageId);
	return (data ?? []).map((row) => ({
		id: row.id as string,
		storage_path: row.storage_path as string,
		content_sha: typeof row.content_sha === 'string' ? row.content_sha : null,
	}));
}

async function upsertPageAsset(
	supabase: SupabaseClient,
	cfg: GitHubConfig,
	token: string,
	pageId: string,
	blob: GitHubDirBlob,
	body: string,
	existing: LocalAsset | undefined,
): Promise<void> {
	if (existing?.content_sha && existing.content_sha === blob.sha) return;

	const binary = await getGitHubFileBinary(cfg, token, blob.path);
	if (!binary) return;

	const mime = mimeFromFilename(blob.name);
	const storagePath = existing?.storage_path ?? `${pageId}/${blob.name}`;
	const { error: uploadError } = await supabase.storage
		.from(BUCKET)
		.upload(storagePath, binary, { contentType: mime, upsert: true });
	if (uploadError) return;

	const shared = {
		storage_path: storagePath,
		mime_type: mime,
		display_mode: mime === 'application/pdf' ? pdfDisplayMode(body, blob.name) : 'link',
		content_sha: gitBlobShaFromBytes(binary),
	};

	if (existing) {
		await supabase.from('assets').update(shared).eq('id', existing.id);
		return;
	}

	await supabase.from('assets').insert({
		page_id: pageId,
		filename: assetLabelFromBody(body, blob.name) ?? blob.name,
		sort_order: 0,
		...shared,
	});
}

export async function importPageAssetsFromGitHub(
	supabase: SupabaseClient,
	cfg: GitHubConfig,
	token: string,
	pageId: string,
	markdownPath: string,
	body: string,
	pruneStale = false,
): Promise<void> {
	const folder = sitePageDirFromMarkdownPath(markdownPath);
	let remoteBlobs: GitHubDirBlob[] = [];
	try {
		remoteBlobs = (await listGitHubDirectoryBlobs(cfg, token, folder)).filter((blob) =>
			isManagedAttachmentFilename(blob.name),
		);
	} catch {
		return;
	}

	const local = await loadLocal(supabase, pageId);
	const localByName = new Map(local.map((asset) => [storageBasename(asset.storage_path), asset]));

	for (const blob of remoteBlobs) {
		await upsertPageAsset(supabase, cfg, token, pageId, blob, body, localByName.get(blob.name));
	}

	if (!pruneStale) return;
	const remoteNames = new Set(remoteBlobs.map((blob) => blob.name));
	const stale = local.filter((asset) => !remoteNames.has(storageBasename(asset.storage_path)));
	if (stale.length === 0) return;
	const kept = remoteBlobs.map(
		(blob) => localByName.get(blob.name)?.storage_path ?? `${pageId}/${blob.name}`,
	);
	const paths = removablePaths(
		stale.map((asset) => asset.storage_path),
		kept,
	);
	if (paths.length > 0) await supabase.storage.from(BUCKET).remove(paths);
	await supabase.from('assets').delete().in(
		'id',
		stale.map((asset) => asset.id),
	);
}

export function pageMarkdownPathFor(
	page: Pick<SitePage, 'path_prefix' | 'slug' | 'external_id'>,
	pagesRoot: string,
): string {
	return (
		parseExternalGitHubPath(page.external_id) ??
		sitePageMarkdownPath(pagesRoot, page.path_prefix, page.slug)
	);
}
