/**
 * Decyzje administratora o wpisie przed publikacją: skierowanie na stronę,
 * odrzucenie z uwagami, przypięcie i ponowne otwarcie do poprawki.
 * Zdejmowanie ze strony: `posts-withdraw.ts`. Akcje zbiorcze: `posts-bulk.ts`.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PostRow } from '@/lib/posts';
import { isApprovableStatus, missingForPublish } from '@/lib/posts/access-model';
import { schedulePublishWorker } from '@/lib/publish/trigger-worker';
import { queueNotBefore, queuePublishForDestination } from './publish-queue';
import { resolveSitePublishDestinationIds } from './sites';

/**
 * Kieruje wpis na stronę. Poza `pending` przyjmuje też szkic i wpis do poprawki —
 * administrator publikuje treść redaktora bez czekania na wysłanie do akceptacji.
 */
export async function approvePost(
	supabase: SupabaseClient,
	post: PostRow,
	options: { pinned?: boolean } = {},
): Promise<{ ok: true; scheduled: boolean } | { ok: false; error: string }> {
	if (!isApprovableStatus(post.status)) {
		return { ok: false, error: 'not_approvable' };
	}

	// Szkic mógł nie mieć jeszcze tytułu ani kategorii — bez nich front-matter jest niepełny.
	const missing = missingForPublish(post);
	if (missing) {
		return { ok: false, error: missing === 'title' ? 'title_required' : 'category_required' };
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

	const updatePayload: {
		status: string;
		rejection_note: null;
		pinned?: boolean;
		scheduled_publish_at?: string;
	} = {
		status: nextStatus,
		rejection_note: null,
	};
	if (options.pinned !== undefined) updatePayload.pinned = options.pinned;
	// Wysłanie do akceptacji ustawia datę; szkic publikowany przez admina jeszcze jej nie ma.
	if (!post.scheduled_publish_at) updatePayload.scheduled_publish_at = new Date().toISOString();

	const { error: updateError } = await supabase
		.from('posts')
		.update(updatePayload)
		.eq('id', post.id)
		.eq('status', post.status);

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
