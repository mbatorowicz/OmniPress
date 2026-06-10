import type { APIRoute } from 'astro';
import { guardAdminRedirect, isGuardBlocked } from '@/lib/api';
import { resetPublishLogForRetry } from '@/lib/publish/queue';
import { schedulePublishWorker } from '@/lib/publish/trigger-worker';

export const POST: APIRoute = async ({ params, redirect, locals }) => {
	const auth = guardAdminRedirect(locals, redirect);
	if (isGuardBlocked(auth)) return auth;
	const { supabase } = auth;
	const postId = params.id;
	const logId = params.logId;
	if (!postId || !logId) return redirect('/admin');

	const ok = await resetPublishLogForRetry(supabase, logId);
	if (!ok) {
		return redirect(`/admin/posts/${postId}?error=retry_failed`);
	}
	schedulePublishWorker();
	return redirect(`/admin/posts/${postId}?retry=1`);
};
