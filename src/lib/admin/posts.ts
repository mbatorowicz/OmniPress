import type { SupabaseClient } from '@supabase/supabase-js';
import type { PostRow } from '@/lib/posts';
import { isScheduledPublishDue } from '@/lib/posts/scheduled-publish';
import { schedulePublishWorker } from '@/lib/publish/trigger-worker';
import { resolveSitePublishDestinationIds } from './sites';
import { postsWithLivePublishLogs, withdrawPostsFromRemoteBatch } from '@/lib/publish/withdraw';

function queueNotBefore(scheduledAt: string | null | undefined): string | null {
	if (!scheduledAt || isScheduledPublishDue(scheduledAt)) return null;
	return scheduledAt;
}

async function queuePublishForDestination(
	supabase: SupabaseClient,
	postId: string,
	destinationId: string,
	notBefore: string | null = null,
): Promise<boolean> {
	const { data: previous } = await supabase
		.from('publish_logs')
		.select('id')
		.eq('post_id', postId)
		.eq('destination_id', destinationId)
		.eq('status', 'success')
		.order('published_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (previous) {
		await supabase
			.from('publish_logs')
			.update({ status: 'withdrawn' })
			.eq('post_id', postId)
			.eq('destination_id', destinationId)
			.eq('status', 'success')
			.neq('id', previous.id);

		const { error } = await supabase
			.from('publish_logs')
			.update({
				status: 'pending',
				response_summary: null,
				next_retry_at: notBefore,
				retry_count: 0,
			})
			.eq('id', previous.id);
		return !error;
	}

	const { error } = await supabase.from('publish_logs').insert({
		post_id: postId,
		destination_id: destinationId,
		status: 'pending',
		next_retry_at: notBefore,
	});
	return !error;
}

export async function approvePost(
	supabase: SupabaseClient,
	post: PostRow,
	options: { pinned?: boolean } = {},
): Promise<{ ok: true; scheduled: boolean } | { ok: false; error: string }> {
	if (post.status !== 'pending') {
		return { ok: false, error: 'not_pending' };
	}

	const destinationIds = await resolveSitePublishDestinationIds(supabase, post.site_id);
	if (destinationIds.length === 0) {
		return { ok: false, error: 'no_site_channel' };
	}

	const notBefore = queueNotBefore(post.scheduled_publish_at);
	const nextStatus = notBefore ? 'scheduled' : 'publishing';

	for (const destinationId of destinationIds) {
		const queued = await queuePublishForDestination(supabase, post.id, destinationId, notBefore);
		if (!queued) return { ok: false, error: 'logs_failed' };
	}

	const updatePayload: { status: string; rejection_note: null; pinned?: boolean } = {
		status: nextStatus,
		rejection_note: null,
	};
	if (options.pinned !== undefined) updatePayload.pinned = options.pinned;

	const { error: updateError } = await supabase
		.from('posts')
		.update(updatePayload)
		.eq('id', post.id)
		.eq('status', 'pending');

	if (updateError) return { ok: false, error: 'update_failed' };

	if (!notBefore) schedulePublishWorker();

	return { ok: true, scheduled: Boolean(notBefore) };
}

/** Przypięcie wpisu na stronie głównej — po publikacji ponawia sync front-matter. */
export async function setPostPinned(
	supabase: SupabaseClient,
	post: PostRow,
	pinned: boolean,
): Promise<{ ok: true; republishQueued: boolean } | { ok: false; error: string }> {
	if (post.pinned === pinned) return { ok: true, republishQueued: false };

	const { error } = await supabase.from('posts').update({ pinned }).eq('id', post.id);
	if (error) return { ok: false, error: 'update_failed' };

	if (post.status !== 'published') return { ok: true, republishQueued: false };

	const destinationIds = await resolveSitePublishDestinationIds(supabase, post.site_id);
	for (const destinationId of destinationIds) {
		const queued = await queuePublishForDestination(supabase, post.id, destinationId);
		if (!queued) return { ok: false, error: 'logs_failed' };
	}
	schedulePublishWorker();
	return { ok: true, republishQueued: destinationIds.length > 0 };
}

export async function rejectPost(
	supabase: SupabaseClient,
	postId: string,
	rejectionNote: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
	const note = rejectionNote.trim();
	if (note.length < 3) return { ok: false, error: 'note_required' };

	const { data, error } = await supabase
		.from('posts')
		.update({ status: 'rejected', rejection_note: note })
		.eq('id', postId)
		.eq('status', 'pending')
		.select('id')
		.maybeSingle();

	if (error) return { ok: false, error: 'update_failed' };
	if (!data) return { ok: false, error: 'not_pending' };
	return { ok: true };
}

/** Czy wpis był już na stronie i można go otworzyć do poprawki. */
export async function canReopenPost(
	supabase: SupabaseClient,
	postId: string,
	status: string,
): Promise<boolean> {
	if (status === 'published') return true;
	if (status !== 'publishing') return false;

	const { data } = await supabase
		.from('publish_logs')
		.select('id')
		.eq('post_id', postId)
		.eq('status', 'success')
		.limit(1)
		.maybeSingle();

	return Boolean(data);
}

/** Opublikowany wpis → szkic (redaktor może poprawić i wysłać ponownie). */
export async function reopenPostForEditing(
	supabase: SupabaseClient,
	postId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
	const { data: post } = await supabase.from('posts').select('status').eq('id', postId).maybeSingle();
	if (!post) return { ok: false, error: 'not_published' };

	const allowed = await canReopenPost(supabase, postId, post.status);
	if (!allowed) return { ok: false, error: 'not_published' };

	const { data, error } = await supabase
		.from('posts')
		.update({ status: 'draft', rejection_note: null })
		.eq('id', postId)
		.in('status', ['published', 'publishing'])
		.select('id')
		.maybeSingle();

	if (error) return { ok: false, error: 'update_failed' };
	if (!data) return { ok: false, error: 'not_published' };
	return { ok: true };
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

	let remoteErrors: string[] = [];
	if (await postsWithLivePublishLogs(supabase, [postId])) {
		const withdraw = await withdrawPostsFromRemoteBatch(supabase, [postId]);
		remoteErrors = withdraw.remoteErrors;
		if (remoteErrors.length > 0) {
			return { ok: false, error: 'remote_failed' };
		}
	}

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

	let remoteErrors: string[] = [];
	if (await postsWithLivePublishLogs(supabase, [postId])) {
		const withdraw = await withdrawPostsFromRemoteBatch(supabase, [postId]);
		remoteErrors = withdraw.remoteErrors;
		if (remoteErrors.length > 0) {
			return { ok: false, error: 'remote_failed' };
		}
	}

	const { error } = await supabase.from('posts').delete().eq('id', postId);
	if (error) return { ok: false, error: 'delete_failed' };
	return { ok: true, remoteErrors };
}

export type BulkPostsResult =
	| { ok: true; processed: number; skipped: number; remoteErrors: string[] }
	| { ok: false; error: string; remoteErrors?: string[] };

/** Zbiorcza akceptacja wpisów oczekujących (kolejka publikacji / harmonogram). */
export async function bulkApprovePosts(
	supabase: SupabaseClient,
	postIds: string[],
): Promise<BulkPostsResult> {
	const ids = [...new Set(postIds.filter(Boolean))];
	if (ids.length === 0) return { ok: false, error: 'none_selected' };

	const { data: posts } = await supabase
		.from('posts')
		.select(
			'id, author_id, site_id, title, content_md, slug, status, rejection_note, category_slug, category_name, scheduled_publish_at, pinned',
		)
		.in('id', ids)
		.eq('status', 'pending');

	const pending = (posts ?? []) as PostRow[];
	if (pending.length === 0) return { ok: false, error: 'none_pending' };

	let processed = 0;
	let failed = 0;
	for (const post of pending) {
		const result = await approvePost(supabase, post);
		if (result.ok) processed += 1;
		else failed += 1;
	}

	if (processed === 0) return { ok: false, error: failed > 0 ? 'approve_failed' : 'none_pending' };

	return {
		ok: true,
		processed,
		skipped: ids.length - processed,
		remoteErrors: [],
	};
}

/** Zbiorcze odrzucenie wpisów oczekujących (wspólna treść uwag). */
export async function bulkRejectPosts(
	supabase: SupabaseClient,
	postIds: string[],
	rejectionNote: string,
): Promise<BulkPostsResult> {
	const ids = [...new Set(postIds.filter(Boolean))];
	if (ids.length === 0) return { ok: false, error: 'none_selected' };

	const note = rejectionNote.trim();
	if (note.length < 3) return { ok: false, error: 'note_required' };

	const { data: posts } = await supabase
		.from('posts')
		.select('id')
		.in('id', ids)
		.eq('status', 'pending');

	const pendingIds = (posts ?? []).map((p) => p.id);
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
	const ids = [...new Set(postIds.filter(Boolean))];
	if (ids.length === 0) return { ok: false, error: 'none_selected' };

	const { data: posts } = await supabase
		.from('posts')
		.select('id')
		.in('id', ids)
		.eq('status', 'scheduled');

	const scheduledIds = (posts ?? []).map((p) => p.id);
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
	const ids = [...new Set(postIds.filter(Boolean))];
	if (ids.length === 0) return { ok: false, error: 'none_selected' };

	const { data: posts } = await supabase
		.from('posts')
		.select('id')
		.in('id', ids)
		.eq('status', 'published');

	const publishedIds = (posts ?? []).map((p) => p.id);
	if (publishedIds.length === 0) return { ok: false, error: 'none_published' };

	const needsRemote = await postsWithLivePublishLogs(supabase, publishedIds);
	let remoteErrors: string[] = [];
	if (needsRemote) {
		const withdraw = await withdrawPostsFromRemoteBatch(supabase, publishedIds);
		remoteErrors = withdraw.remoteErrors;
		if (remoteErrors.length > 0) {
			return { ok: false, error: 'remote_failed', remoteErrors };
		}
	}

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
	const ids = [...new Set(postIds.filter(Boolean))];
	if (ids.length === 0) return { ok: false, error: 'none_selected' };

	const { data: posts } = await supabase.from('posts').select('id').in('id', ids);
	const foundIds = (posts ?? []).map((p) => p.id);
	if (foundIds.length === 0) return { ok: false, error: 'not_found' };

	const needsRemote = await postsWithLivePublishLogs(supabase, foundIds);
	let remoteErrors: string[] = [];
	if (needsRemote) {
		const withdraw = await withdrawPostsFromRemoteBatch(supabase, foundIds);
		remoteErrors = withdraw.remoteErrors;
		if (remoteErrors.length > 0) {
			return { ok: false, error: 'remote_failed', remoteErrors };
		}
	}

	const { error } = await supabase.from('posts').delete().in('id', foundIds);
	if (error) return { ok: false, error: 'delete_failed' };

	return {
		ok: true,
		processed: foundIds.length,
		skipped: ids.length - foundIds.length,
		remoteErrors,
	};
}
