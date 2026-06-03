import type { SupabaseClient } from '@supabase/supabase-js';
import { dispatchPublish, loadDestinationForPublish, loadPostForPublish } from './dispatch';
import {
	claimPendingLogs,
	markLogFailure,
	markLogSuccess,
	skipDuplicateSuccess,
} from './queue';
import { syncPostStatusFromLogs } from './sync-post-status';
import type { WorkerRunResult } from './types';

const BATCH_SIZE = 10;
const STALE_PROCESSING_MS = 15 * 60_000;

async function recoverStaleProcessing(supabase: SupabaseClient): Promise<void> {
	const cutoff = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();
	await supabase
		.from('publish_logs')
		.update({ status: 'pending' })
		.eq('status', 'processing')
		.lt('updated_at', cutoff);
}

export async function runPublishWorker(supabase: SupabaseClient): Promise<WorkerRunResult> {
	await recoverStaleProcessing(supabase);
	const result: WorkerRunResult = { processed: 0, succeeded: 0, failed: 0, skipped: 0 };
	const logs = await claimPendingLogs(supabase, BATCH_SIZE);
	const touchedPosts = new Set<string>();

	for (const log of logs) {
		result.processed++;
		touchedPosts.add(log.post_id);

		if (log.external_id && log.status === 'processing') {
			// idempotencja — już ma external_id z poprzedniej próby
		}

		const duplicate = await skipDuplicateSuccess(supabase, log);
		if (duplicate) {
			await markLogSuccess(supabase, log.id, log.external_id ?? 'duplicate', 'Już opublikowano');
			result.skipped++;
			result.succeeded++;
			continue;
		}

		const post = await loadPostForPublish(supabase, log.post_id);
		if (!post) {
			await markLogFailure(supabase, log.id, log.retry_count, 'Wpis nie istnieje', false);
			result.failed++;
			continue;
		}

		const destination = await loadDestinationForPublish(supabase, log.destination_id);
		if (!destination) {
			await markLogFailure(supabase, log.id, log.retry_count, 'Destynacja nie istnieje', false);
			result.failed++;
			continue;
		}

		try {
			const outcome = await dispatchPublish(supabase, post, destination, log.external_id);
			if (outcome.ok) {
				await markLogSuccess(supabase, log.id, outcome.externalId, outcome.summary);
				result.succeeded++;
			} else {
				await markLogFailure(
					supabase,
					log.id,
					log.retry_count,
					outcome.summary,
					outcome.retryable,
				);
				result.failed++;
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Nieznany błąd workera';
			await markLogFailure(supabase, log.id, log.retry_count, msg, true);
			result.failed++;
		}
	}

	for (const postId of touchedPosts) {
		await syncPostStatusFromLogs(supabase, postId);
	}

	return result;
}
