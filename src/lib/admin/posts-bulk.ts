/**
 * Akcje zbiorcze na wpisach (kolejka `/admin`) — akceptacja, odrzucenie,
 * anulowanie harmonogramu, zdjęcie ze strony i usunięcie.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PostRow } from '@/lib/posts';
import { APPROVABLE_STATUSES } from '@/lib/posts/access-model';
import type { PostStatus } from '@/lib/types';
import { approvePost } from './posts';
import { withdrawRemoteIfLive } from './posts-withdraw';

export type BulkPostsResult =
	| { ok: true; processed: number; skipped: number; remoteErrors: string[] }
	| { ok: false; error: string; remoteErrors?: string[] };

function uniqueIds(postIds: string[]): string[] {
	return [...new Set(postIds.filter(Boolean))];
}

/** Zawęża zaznaczenie do wpisów, które faktycznie mają wskazany status. */
async function idsWithStatus(
	supabase: SupabaseClient,
	ids: string[],
	status: PostStatus,
): Promise<string[]> {
	const { data } = await supabase
		.from('posts')
		.select('id')
		.in('id', ids)
		.eq('status', status);
	return (data ?? []).map((row) => row.id as string);
}

/** Zbiorcza akceptacja wpisów przed publikacją (kolejka publikacji / harmonogram). */
export async function bulkApprovePosts(
	supabase: SupabaseClient,
	postIds: string[],
): Promise<BulkPostsResult> {
	const ids = uniqueIds(postIds);
	if (ids.length === 0) return { ok: false, error: 'none_selected' };

	const { data: posts } = await supabase
		.from('posts')
		.select(
			'id, author_id, site_id, title, content_md, slug, status, rejection_note, category_slug, category_name, extra_category_slugs, scheduled_publish_at, pinned',
		)
		.in('id', ids)
		.in('status', [...APPROVABLE_STATUSES]);

	const approvable = (posts ?? []) as PostRow[];
	if (approvable.length === 0) return { ok: false, error: 'none_approvable' };

	let processed = 0;
	let failed = 0;
	for (const post of approvable) {
		const result = await approvePost(supabase, post);
		if (result.ok) processed += 1;
		else failed += 1;
	}

	if (processed === 0) return { ok: false, error: failed > 0 ? 'approve_failed' : 'none_approvable' };

	return { ok: true, processed, skipped: ids.length - processed, remoteErrors: [] };
}

/** Zbiorcze odrzucenie wpisów oczekujących (wspólna treść uwag). */
export async function bulkRejectPosts(
	supabase: SupabaseClient,
	postIds: string[],
	rejectionNote: string,
): Promise<BulkPostsResult> {
	const ids = uniqueIds(postIds);
	if (ids.length === 0) return { ok: false, error: 'none_selected' };

	const note = rejectionNote.trim();
	if (note.length < 3) return { ok: false, error: 'note_required' };

	const pendingIds = await idsWithStatus(supabase, ids, 'pending');
	if (pendingIds.length === 0) return { ok: false, error: 'none_pending' };

	const { error } = await supabase
		.from('posts')
		.update({ status: 'rejected', rejection_note: note })
		.in('id', pendingIds)
		.eq('status', 'pending');

	if (error) return { ok: false, error: 'update_failed' };

	return {
		ok: true,
		processed: pendingIds.length,
		skipped: ids.length - pendingIds.length,
		remoteErrors: [],
	};
}

/** Anuluje zaplanowaną publikację — wpis wraca do szkicu; pomija status publishing. */
export async function bulkCancelScheduledPosts(
	supabase: SupabaseClient,
	postIds: string[],
): Promise<BulkPostsResult> {
	const ids = uniqueIds(postIds);
	if (ids.length === 0) return { ok: false, error: 'none_selected' };

	const scheduledIds = await idsWithStatus(supabase, ids, 'scheduled');
	if (scheduledIds.length === 0) return { ok: false, error: 'none_scheduled' };

	await supabase
		.from('publish_logs')
		.delete()
		.in('post_id', scheduledIds)
		.eq('status', 'pending');

	const { error } = await supabase
		.from('posts')
		.update({ status: 'draft', rejection_note: null })
		.in('id', scheduledIds)
		.eq('status', 'scheduled');

	if (error) return { ok: false, error: 'update_failed' };

	return {
		ok: true,
		processed: scheduledIds.length,
		skipped: ids.length - scheduledIds.length,
		remoteErrors: [],
	};
}

/** Zbiorczo zdejmuje opublikowane wpisy ze strony (jeden commit GitHub na destynację). */
export async function bulkDeactivatePosts(
	supabase: SupabaseClient,
	postIds: string[],
): Promise<BulkPostsResult> {
	const ids = uniqueIds(postIds);
	if (ids.length === 0) return { ok: false, error: 'none_selected' };

	const publishedIds = await idsWithStatus(supabase, ids, 'published');
	if (publishedIds.length === 0) return { ok: false, error: 'none_published' };

	const remoteErrors = await withdrawRemoteIfLive(supabase, publishedIds);
	if (remoteErrors.length > 0) return { ok: false, error: 'remote_failed', remoteErrors };

	const { error } = await supabase
		.from('posts')
		.update({ status: 'draft', rejection_note: null })
		.in('id', publishedIds)
		.eq('status', 'published');

	if (error) return { ok: false, error: 'update_failed' };

	return {
		ok: true,
		processed: publishedIds.length,
		skipped: ids.length - publishedIds.length,
		remoteErrors,
	};
}

/** Zbiorczo usuwa wpisy z CMS (GitHub batch — jeden deploy). */
export async function bulkDeletePosts(
	supabase: SupabaseClient,
	postIds: string[],
): Promise<BulkPostsResult> {
	const ids = uniqueIds(postIds);
	if (ids.length === 0) return { ok: false, error: 'none_selected' };

	const { data: posts } = await supabase.from('posts').select('id').in('id', ids);
	const foundIds = (posts ?? []).map((p) => p.id);
	if (foundIds.length === 0) return { ok: false, error: 'not_found' };

	const remoteErrors = await withdrawRemoteIfLive(supabase, foundIds);
	if (remoteErrors.length > 0) return { ok: false, error: 'remote_failed', remoteErrors };

	const { error } = await supabase.from('posts').delete().in('id', foundIds);
	if (error) return { ok: false, error: 'delete_failed' };

	return {
		ok: true,
		processed: foundIds.length,
		skipped: ids.length - foundIds.length,
		remoteErrors,
	};
}
