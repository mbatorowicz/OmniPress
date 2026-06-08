import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserRole } from '@/lib/types';
import { canViewPostAssets, getPostById } from './access';

export type ServePostAssetResult =
	| { ok: true; body: ArrayBuffer; mimeType: string; filename: string }
	| { ok: false; status: 403 | 404 | 500 };

export async function servePostAssetFile(
	supabase: SupabaseClient,
	postId: string,
	assetId: string,
	userId: string,
	role: UserRole,
): Promise<ServePostAssetResult> {
	const post = await getPostById(supabase, postId);
	if (!post) return { ok: false, status: 404 };
	if (!canViewPostAssets(post, userId, role)) return { ok: false, status: 403 };

	const { data: asset } = await supabase
		.from('assets')
		.select('id, storage_path, filename, mime_type')
		.eq('id', assetId)
		.eq('post_id', postId)
		.maybeSingle();

	if (!asset) return { ok: false, status: 404 };

	const { data, error } = await supabase.storage.from('post-assets').download(asset.storage_path);
	if (error || !data) return { ok: false, status: 500 };

	return {
		ok: true,
		body: await data.arrayBuffer(),
		mimeType: asset.mime_type,
		filename: asset.filename,
	};
}
