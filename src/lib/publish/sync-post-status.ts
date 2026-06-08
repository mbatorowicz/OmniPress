import type { SupabaseClient } from '@supabase/supabase-js';
import type { PublishLogStatus } from '@/lib/types';

/** Ustawia posts.status wg publish_logs (PRD §5.3.1). */
export async function syncPostStatusFromLogs(
	supabase: SupabaseClient,
	postId: string,
): Promise<void> {
	const { data: logs } = await supabase
		.from('publish_logs')
		.select('status')
		.eq('post_id', postId);

	if (!logs?.length) return;

	const statuses = logs.map((l) => l.status as PublishLogStatus);
	const hasSuccess = statuses.includes('success');
	const hasActive = statuses.some((s) =>
		['pending', 'processing', 'failed'].includes(s),
	);

	const { data: post } = await supabase.from('posts').select('status').eq('id', postId).maybeSingle();
	if (!post || post.status === 'draft' || post.status === 'pending' || post.status === 'rejected') {
		return;
	}

	const isProcessing = statuses.includes('processing') || statuses.includes('failed');
	let next: 'scheduled' | 'publishing' | 'published' = 'publishing';
	if (hasSuccess) {
		next = 'published';
	} else if (post.status === 'scheduled' && !isProcessing) {
		next = 'scheduled';
	} else if (!hasActive) {
		next = post.status === 'scheduled' ? 'scheduled' : 'publishing';
	}

	if (post.status !== next) {
		await supabase.from('posts').update({ status: next }).eq('id', postId);
	}
}

export function derivePostStatusFromLogStatuses(
	logStatuses: PublishLogStatus[],
	currentPostStatus: string,
): 'scheduled' | 'publishing' | 'published' | null {
	if (['draft', 'pending', 'rejected'].includes(currentPostStatus)) return null;
	if (logStatuses.includes('success')) return 'published';
	const isProcessing = logStatuses.includes('processing') || logStatuses.includes('failed');
	if (currentPostStatus === 'scheduled' && !isProcessing) return 'scheduled';
	const hasActive = logStatuses.some((s) =>
		['pending', 'processing', 'failed'].includes(s),
	);
	return hasActive || currentPostStatus === 'publishing' || currentPostStatus === 'scheduled'
		? 'publishing'
		: null;
}
