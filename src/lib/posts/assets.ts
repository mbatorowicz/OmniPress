/**
 * Operacje na załącznikach w bazie. Kształt wiersza i czysta logika (rodzaj pliku,
 * adresy, odczyt formularza): `@/lib/posts/asset-model`.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { canDeletePostAsset, type PostAssetRow } from '@/lib/posts/asset-model';
import type { AssetDisplayMode } from '@/lib/publish/asset-markdown';

export async function loadPostAssetsForPost(
	supabase: SupabaseClient,
	postId: string,
): Promise<PostAssetRow[]> {
	const { data } = await supabase
		.from('assets')
		.select('id, storage_path, filename, mime_type, display_mode, sort_order')
		.eq('post_id', postId)
		.order('sort_order', { ascending: true })
		.order('created_at', { ascending: true });
	return (data ?? []).map((row) => ({
		...row,
		sort_order: row.sort_order ?? 0,
		display_mode: (row.display_mode === 'embed' ? 'embed' : 'link') as AssetDisplayMode,
	}));
}

export async function updatePostAssetDisplayModes(
	supabase: SupabaseClient,
	postId: string,
	modes: Record<string, AssetDisplayMode>,
): Promise<void> {
	for (const [id, mode] of Object.entries(modes)) {
		if (mode !== 'link' && mode !== 'embed') continue;
		await supabase
			.from('assets')
			.update({ display_mode: mode })
			.eq('id', id)
			.eq('post_id', postId);
	}
}

export async function updateGalleryOrder(
	supabase: SupabaseClient,
	postId: string,
	orderedIds: string[],
): Promise<void> {
	if (orderedIds.length === 0) return;
	for (let i = 0; i < orderedIds.length; i++) {
		await supabase
			.from('assets')
			.update({ sort_order: i })
			.eq('id', orderedIds[i]!)
			.eq('post_id', postId);
	}
}

/** Kolejność plików na stronie: PDF, DOCX, potem inne pliki do pobrania. */
export async function updateFileAttachmentOrders(
	supabase: SupabaseClient,
	postId: string,
	pdfIds: string[],
	docxIds: string[],
	fileIds: string[] = [],
): Promise<void> {
	let sortOrder = 0;
	for (const id of [...pdfIds, ...docxIds, ...fileIds]) {
		await supabase
			.from('assets')
			.update({ sort_order: sortOrder++ })
			.eq('id', id)
			.eq('post_id', postId);
	}
}

export async function nextGallerySortOrder(
	supabase: SupabaseClient,
	postId: string,
): Promise<number> {
	const { data } = await supabase
		.from('assets')
		.select('sort_order')
		.eq('post_id', postId)
		.order('sort_order', { ascending: false })
		.limit(1)
		.maybeSingle();
	return (data?.sort_order ?? -1) + 1;
}

export type DeletePostAssetError = 'not_found' | 'delete_failed';

export async function deletePostAsset(
	supabase: SupabaseClient,
	postId: string,
	assetId: string,
): Promise<{ ok: true } | { ok: false; error: DeletePostAssetError }> {
	const { data: asset } = await supabase
		.from('assets')
		.select('id, storage_path, mime_type')
		.eq('id', assetId)
		.eq('post_id', postId)
		.maybeSingle();

	if (!asset || !canDeletePostAsset(asset)) {
		return { ok: false, error: 'not_found' };
	}

	await supabase.storage.from('post-assets').remove([asset.storage_path]);

	const { error } = await supabase
		.from('assets')
		.delete()
		.eq('id', assetId)
		.eq('post_id', postId);

	if (error) return { ok: false, error: 'delete_failed' };
	return { ok: true };
}
