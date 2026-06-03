import type { SupabaseClient } from '@supabase/supabase-js';
import type { PostRow } from '@/lib/posts';

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

	const logs = destinationIds.map((destination_id) => ({
		post_id: post.id,
		destination_id,
		status: 'pending' as const,
	}));

	const { error: logError } = await supabase.from('publish_logs').insert(logs);
	if (logError) return { ok: false, error: 'logs_failed' };

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
