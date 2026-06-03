import { waitUntil } from '@vercel/functions';
import { runPublishWorker } from './worker';
import { createServiceSupabase, isServiceSupabaseConfigured } from '@/lib/supabase/service';

/** Uruchamia worker w tle (approve) lub synchronicznie (cron HTTP). */
export async function runPublishWorkerJob(): Promise<Awaited<ReturnType<typeof runPublishWorker>>> {
	if (!isServiceSupabaseConfigured()) {
		throw new Error('service_role_not_configured');
	}
	return runPublishWorker(createServiceSupabase());
}

export function schedulePublishWorker(): void {
	if (!isServiceSupabaseConfigured()) return;
	const task = runPublishWorkerJob().catch(() => {});
	try {
		waitUntil(task);
	} catch {
		void task;
	}
}
