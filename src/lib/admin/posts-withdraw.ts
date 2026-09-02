/**
 * Zdejmowanie wpisu ze strony publicznej i trwałe usunięcie z CMS — akcje,
 * które dotykają repozytorium GitHub. Decyzje przed publikacją: `posts.ts`.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { postsWithLivePublishLogs, withdrawPostsFromRemoteBatch } from '@/lib/publish/withdraw';

/** Usuwa pliki wpisów z destynacji, jeśli cokolwiek jest jeszcze na stronie. */
export async function withdrawRemoteIfLive(
	supabase: SupabaseClient,
	postIds: string[],
): Promise<string[]> {
	if (!(await postsWithLivePublishLogs(supabase, postIds))) return [];
	const withdraw = await withdrawPostsFromRemoteBatch(supabase, postIds);
	return withdraw.remoteErrors;
}

/** Zdejmuje wpis ze strony publicznej — usuwa z destynacji, wraca do szkicu w CMS. */
export async function deactivatePost(
	supabase: SupabaseClient,
	postId: string,
): Promise<{ ok: true; remoteErrors: string[] } | { ok: false; error: string }> {
	const { data: post } = await supabase
		.from('posts')
		.select('id, title, status')
		.eq('id', postId)
		.maybeSingle();
	if (!post) return { ok: false, error: 'not_found' };
	if (post.status !== 'published') return { ok: false, error: 'not_published' };

	const remoteErrors = await withdrawRemoteIfLive(supabase, [postId]);
	if (remoteErrors.length > 0) return { ok: false, error: 'remote_failed' };

	const { data, error } = await supabase
		.from('posts')
		.update({ status: 'draft', rejection_note: null })
		.eq('id', postId)
		.eq('status', 'published')
		.select('id')
		.maybeSingle();

	if (error) return { ok: false, error: 'update_failed' };
	if (!data) return { ok: false, error: 'not_published' };
	return { ok: true, remoteErrors };
}

/** Trwale usuwa wpis z CMS (oraz ze stron, jeśli był opublikowany). */
export async function deletePost(
	supabase: SupabaseClient,
	postId: string,
): Promise<{ ok: true; remoteErrors: string[] } | { ok: false; error: string }> {
	const { data: post } = await supabase
		.from('posts')
		.select('id, title, status')
		.eq('id', postId)
		.maybeSingle();
	if (!post) return { ok: false, error: 'not_found' };

	const remoteErrors = await withdrawRemoteIfLive(supabase, [postId]);
	if (remoteErrors.length > 0) return { ok: false, error: 'remote_failed' };

	const { error } = await supabase.from('posts').delete().eq('id', postId);
	if (error) return { ok: false, error: 'delete_failed' };
	return { ok: true, remoteErrors };
}
