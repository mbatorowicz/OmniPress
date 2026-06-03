import type { SupabaseClient } from '@supabase/supabase-js';
import type { PublishLogRow } from './types';

export type PublishLogWithDestination = PublishLogRow & {
	destinations: { name: string; type: string } | null;
};

export async function listPublishLogsForPost(
	supabase: SupabaseClient,
	postId: string,
): Promise<PublishLogWithDestination[]> {
	const { data } = await supabase
		.from('publish_logs')
		.select(
			'id, post_id, destination_id, status, external_id, response_summary, retry_count, next_retry_at, published_at, created_at, destinations(name, type)',
		)
		.eq('post_id', postId)
		.order('created_at');
	return (data ?? []) as PublishLogWithDestination[];
}
