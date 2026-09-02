/**
 * Kolejkowanie publikacji wpisu w `publish_logs` — wspólne dla akceptacji
 * i ponownego wysyłania front-matteru (np. po zmianie przypięcia).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { isScheduledPublishDue } from '@/lib/posts/scheduled-publish';

/** Data, przed którą worker nie ma ruszać publikacji (`null` = od razu). */
export function queueNotBefore(scheduledAt: string | null | undefined): string | null {
	if (!scheduledAt || isScheduledPublishDue(scheduledAt)) return null;
	return scheduledAt;
}

export async function queuePublishForDestination(
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
