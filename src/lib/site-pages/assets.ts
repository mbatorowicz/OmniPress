/**
 * Załączniki stron statycznych — te same wiersze `assets` co wpisy, filtr `page_id`.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { canDeletePostAsset, type PostAssetRow } from '@/lib/posts/asset-model';
import type { AssetDisplayMode } from '@/lib/publish/asset-markdown';
import type { PostAsset } from '@/lib/publish/asset-model';

function asDisplayMode(value: string | null | undefined): AssetDisplayMode {
	return value === 'embed' ? 'embed' : 'link';
}

export async function loadPageAssets(
	supabase: SupabaseClient,
	pageId: string,
): Promise<PostAsset[]> {
	const { data } = await supabase
		.from('assets')
		.select('id, storage_path, filename, mime_type, display_mode, sort_order, content_sha')
		.eq('page_id', pageId)
		.order('sort_order', { ascending: true })
		.order('created_at', { ascending: true });
	return (data ?? []).map((row) => ({
		...row,
		display_mode: asDisplayMode(row.display_mode),
		sort_order: row.sort_order ?? 0,
		content_sha: typeof row.content_sha === 'string' ? row.content_sha : null,
	})) as PostAsset[];
}

export function pageAssetsForEditor(assets: PostAsset[]): PostAssetRow[] {
	return assets.map((asset) => ({
		id: asset.id ?? '',
		storage_path: asset.storage_path,
		filename: asset.filename,
		mime_type: asset.mime_type,
		display_mode: asDisplayMode(asset.display_mode),
		sort_order: asset.sort_order ?? 0,
	}));
}

export async function pageHasAssets(
	supabase: SupabaseClient,
	pageId: string,
): Promise<boolean> {
	const { count } = await supabase
		.from('assets')
		.select('id', { count: 'exact', head: true })
		.eq('page_id', pageId);
	return (count ?? 0) > 0;
}

export async function updatePageAssetDisplayModes(
	supabase: SupabaseClient,
	pageId: string,
	modes: Record<string, AssetDisplayMode>,
): Promise<void> {
	for (const [id, mode] of Object.entries(modes)) {
		if (mode !== 'link' && mode !== 'embed') continue;
		await supabase.from('assets').update({ display_mode: mode }).eq('id', id).eq('page_id', pageId);
	}
}

export async function updatePageFileAttachmentOrders(
	supabase: SupabaseClient,
	pageId: string,
	pdfIds: string[],
	docxIds: string[],
	fileIds: string[] = [],
): Promise<void> {
	let sortOrder = 0;
	for (const id of [...pdfIds, ...docxIds, ...fileIds]) {
		await supabase.from('assets').update({ sort_order: sortOrder++ }).eq('id', id).eq('page_id', pageId);
	}
}

export async function deletePageAsset(
	supabase: SupabaseClient,
	pageId: string,
	assetId: string,
): Promise<{ ok: true } | { ok: false; error: 'not_found' | 'delete_failed' }> {
	const { data: asset } = await supabase
		.from('assets')
		.select('id, storage_path, mime_type')
		.eq('id', assetId)
		.eq('page_id', pageId)
		.maybeSingle();

	if (!asset || !canDeletePostAsset(asset)) {
		return { ok: false, error: 'not_found' };
	}

	await supabase.storage.from('post-assets').remove([asset.storage_path]);
	const { error } = await supabase.from('assets').delete().eq('id', assetId).eq('page_id', pageId);
	if (error) return { ok: false, error: 'delete_failed' };
	return { ok: true };
}

export async function removePageAssetStorage(
	supabase: SupabaseClient,
	pageId: string,
): Promise<void> {
	const assets = await loadPageAssets(supabase, pageId);
	const paths = assets.map((asset) => asset.storage_path).filter(Boolean);
	if (paths.length > 0) await supabase.storage.from('post-assets').remove(paths);
}
