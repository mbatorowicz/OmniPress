import type { APIRoute } from 'astro';
import { requireAdmin } from '@/lib/admin';
import { resetPublishLogForRetry } from '@/lib/publish/queue';
import { schedulePublishWorker } from '@/lib/publish/trigger-worker';

export const POST: APIRoute = async ({ params, redirect, locals }) => {
	if (!requireAdmin(locals)) return redirect('/login');
	const postId = params.id;
	const logId = params.logId;
	if (!postId || !logId) return redirect('/admin');

	const ok = await resetPublishLogForRetry(locals.supabase, logId);
	if (!ok) {
		return redirect(`/admin/posts/${postId}?error=retry_failed`);
	}
	schedulePublishWorker();
	return redirect(`/admin/posts/${postId}?retry=1`);
};
