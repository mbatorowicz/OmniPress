import type { SupabaseClient } from '@supabase/supabase-js';
import type { PublishLogRow } from './types';
import { computeNextRetryAt, shouldRetry } from './retry';

export async function claimPendingLogs(
	supabase: SupabaseClient,
	limit: number,
): Promise<PublishLogRow[]> {
	const now = new Date().toISOString();
	const { data: candidates } = await supabase
		.from('publish_logs')
		.select('id')
		.in('status', ['pending'])
		.or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
		.order('created_at', { ascending: true })
		.limit(limit);

	if (!candidates?.length) return [];

	const claimed: PublishLogRow[] = [];
	for (const { id } of candidates) {
		const { data: row } = await supabase
			.from('publish_logs')
			.update({ status: 'processing' })
			.eq('id', id)
			.eq('status', 'pending')
			.select('*')
			.maybeSingle();

		if (row) claimed.push(row as PublishLogRow);
	}
	return claimed;
}

export async function markLogSuccess(
	supabase: SupabaseClient,
	logId: string,
	externalId: string,
	summary: string,
): Promise<void> {
	await supabase
		.from('publish_logs')
		.update({
			status: 'success',
			external_id: externalId,
			response_summary: summary.slice(0, 500),
			published_at: new Date().toISOString(),
			next_retry_at: null,
		})
		.eq('id', logId);
}

export async function markLogFailure(
	supabase: SupabaseClient,
	logId: string,
	retryCount: number,
	summary: string,
	retryable: boolean,
): Promise<void> {
	const canRetry = retryable && shouldRetry(retryCount);
	const nextRetry = canRetry ? computeNextRetryAt(retryCount) : null;

	await supabase
		.from('publish_logs')
		.update({
			status: canRetry ? 'pending' : 'failed',
			retry_count: retryCount + 1,
			response_summary: summary.slice(0, 500),
			next_retry_at: nextRetry?.toISOString() ?? null,
		})
		.eq('id', logId);
}

export async function skipDuplicateSuccess(
	supabase: SupabaseClient,
	log: PublishLogRow,
): Promise<boolean> {
	if (!log.external_id) return false;
	const { data } = await supabase
		.from('publish_logs')
		.select('id')
		.eq('post_id', log.post_id)
		.eq('destination_id', log.destination_id)
		.eq('status', 'success')
		.neq('id', log.id)
		.maybeSingle();
	return Boolean(data);
}
