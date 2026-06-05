import type { SupabaseClient } from '@supabase/supabase-js';
import type { PostRow } from '@/lib/posts';

async function queuePublishForDestination(
	supabase: SupabaseClient,
	postId: string,
	destinationId: string,
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
				next_retry_at: null,
				retry_count: 0,
			})
			.eq('id', previous.id);
		return !error;
	}

	const { error } = await supabase.from('publish_logs').insert({
		post_id: postId,
		destination_id: destinationId,
		status: 'pending',
	});
	return !error;
}

export async function approvePost(
	supabase: SupabaseClient,
	post: PostRow,
	destinationIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
	if (post.status !== 'pending') {
		return { ok: false, error: 'not_pending' };
	}
	if (destinationIds.length === 0) {
		return { ok: false, error: 'no_destinations' };
	}

	const { data: allowed } = await supabase
		.from('site_destinations')
		.select('destination_id')
		.eq('site_id', post.site_id)
		.in('destination_id', destinationIds);

	const allowedIds = new Set((allowed ?? []).map((r) => r.destination_id));
	if (destinationIds.some((id) => !allowedIds.has(id))) {
		return { ok: false, error: 'invalid_destinations' };
	}

	for (const destinationId of destinationIds) {
		const queued = await queuePublishForDestination(supabase, post.id, destinationId);
		if (!queued) return { ok: false, error: 'logs_failed' };
	}

	const { error: updateError } = await supabase
		.from('posts')
		.update({ status: 'publishing', rejection_note: null })
		.eq('id', post.id)
		.eq('status', 'pending');

	if (updateError) return { ok: false, error: 'update_failed' };

	return { ok: true };
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
