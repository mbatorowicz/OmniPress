/**
 * Synchronizacja zalacznikow wpisu: repo Astro -> Supabase (baza + Storage).
 * Czyste reguly nazw i porzadkowania: `@/lib/publish/import-asset-model`.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { admin } from '@/i18n';
import type { ParsedAstroPost } from './astro-post-parse';
import { gitBlobShaFromBytes } from './git-blob';
import {
	getGitHubFileBinary,
	listGitHubDirectoryBlobs,
	type GitHubConfig,
	type GitHubDirBlob,
} from './github-api';
import {
	assetLabelFromBody,
	imageSortOrder,
	mimeFromFilename,
	pdfDisplayMode,
	removablePaths,
	storageBasename,
} from './import-asset-model';
import { postDirFromMarkdownPath } from './paths';

const BUCKET = 'post-assets';
const DETAIL_LIMIT = 80;

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
	const name = blob.name;
	if (existing?.content_sha && existing.content_sha === blob.sha) return null;

	const binary = await getGitHubFileBinary(cfg, token, blob.path);
	if (!binary) return admin.importPosts.assetErrors.missingOnGitHub(name);

	const sha = gitBlobShaFromBytes(binary);
	const mime = mimeFromFilename(name);
	const storagePath = existing?.storage_path ?? `${postId}/${name}`;
	const { error: uploadError } = await supabase.storage
		.from(BUCKET)
		.upload(storagePath, binary, { contentType: mime, upsert: true });
	if (uploadError) {
		return admin.importPosts.assetErrors.upload(
			name,
			uploadError.message.slice(0, DETAIL_LIMIT),
		);
	}

	const shared = {
		storage_path: storagePath,
		mime_type: mime,
		display_mode: mime === 'application/pdf' ? pdfDisplayMode(parsed.body, name) : 'link',
		sort_order: mime.startsWith('image/') ? imageSortOrder(parsed, name) : 0,
		content_sha: sha,
	};

	if (existing) {
		const { error } = await supabase.from('assets').update(shared).eq('id', existing.id);
		return error ? admin.importPosts.assetErrors.save(name) : null;
	}

	const { error: insertError } = await supabase.from('assets').insert({
		post_id: postId,
		filename: assetLabelFromBody(parsed.body, name) ?? name,
		...shared,
	});
	return insertError ? admin.importPosts.assetErrors.save(name) : null;
}

/** Doprowadza zalaczniki wpisu do stanu z repo; zwraca opisy problemow. */
export async function syncPostAssetsFromGitHub(
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
		const detail = err instanceof Error ? err.message.slice(0, DETAIL_LIMIT) : '';
		return [admin.importPosts.assetErrors.listing(folder, detail)];
	}

	const localAssets = await loadLocalAssets(supabase, postId);
	const localByStorageName = new Map(
		localAssets.map((asset) => [storageBasename(asset.storage_path), asset]),
	);
	const remoteNames = new Set(remoteBlobs.map((b) => b.name));

	for (const blob of remoteBlobs) {
		const err = await upsertAssetFromGitHub(
			supabase,
			cfg,
			token,
			postId,
			blob,
			parsed,
			localByStorageName.get(blob.name),
		);
		if (err) errors.push(err);
	}

	const stale = localAssets.filter(
		(asset) => !remoteNames.has(storageBasename(asset.storage_path)),
	);
	if (stale.length === 0) return errors;

	// Sciezki zalacznikow zostajacych po synchronizacji — wlacznie z wierszami
	// dopisanymi wyzej, ktore moglyby dzielic storage_path z wpisem osieroconym.
	const keptPaths = remoteBlobs.map(
		(blob) => localByStorageName.get(blob.name)?.storage_path ?? `${postId}/${blob.name}`,
	);
	const paths = removablePaths(
		stale.map((asset) => asset.storage_path),
		keptPaths,
	);
	if (paths.length > 0) {
		await supabase.storage.from(BUCKET).remove(paths);
	}
	await supabase
		.from('assets')
		.delete()
		.in(
			'id',
			stale.map((asset) => asset.id),
		);

	return errors;
}
