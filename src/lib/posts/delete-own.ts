import type { SupabaseClient } from '@supabase/supabase-js';
import { canDeletePost, getPostById } from './access';

export type DeleteOwnPostResult = { ok: true } | { ok: false; error: 'forbidden' | 'delete_failed' };

/** Redaktor trwale usuwa własny wpis (szkic / odrzucony) wraz z plikami w Storage. */
export async function deleteOwnPost(
	supabase: SupabaseClient,
	postId: string,
	userId: string,
): Promise<DeleteOwnPostResult> {
	const post = await getPostById(supabase, postId);
	if (!post || !canDeletePost(post, userId)) return { ok: false, error: 'forbidden' };

	const { data: assets } = await supabase
		.from('assets')
		.select('storage_path')
		.eq('post_id', postId);
	const storagePaths = (assets ?? []).map((a) => a.storage_path).filter(Boolean);
	if (storagePaths.length > 0) {
		await supabase.storage.from('post-assets').remove(storagePaths);
	}

	const { data, error } = await supabase
		.from('posts')
		.delete()
		.eq('id', postId)
		.select('id')
		.maybeSingle();

	if (error || !data) return { ok: false, error: 'delete_failed' };
	return { ok: true };
}
