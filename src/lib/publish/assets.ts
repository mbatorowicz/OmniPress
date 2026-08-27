/**
 * Odczyt i zapis załączników w bazie na potrzeby publikacji.
 * Kształt wiersza, adresy publiczne i base64: `@/lib/publish/asset-model`.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PostAsset } from '@/lib/publish/asset-model';

export async function loadPostAssets(
	supabase: SupabaseClient,
	postId: string,
): Promise<PostAsset[]> {
	const { data } = await supabase
		.from('assets')
		.select('id, storage_path, filename, mime_type, display_mode, sort_order, content_sha')
		.eq('post_id', postId)
		.order('sort_order', { ascending: true })
		.order('created_at', { ascending: true });
	return (data ?? []).map((row) => ({
		...row,
		display_mode: row.display_mode === 'embed' ? 'embed' : 'link',
		sort_order: row.sort_order ?? 0,
		content_sha: typeof row.content_sha === 'string' ? row.content_sha : null,
	})) as PostAsset[];
}

export async function updateAssetContentSha(
	supabase: SupabaseClient,
	assetId: string | undefined,
	contentSha: string,
): Promise<void> {
	if (!assetId || !contentSha) return;
	await supabase.from('assets').update({ content_sha: contentSha }).eq('id', assetId);
}
