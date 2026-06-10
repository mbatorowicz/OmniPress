import { isServiceSupabaseConfigured } from '@/lib/supabase/service';
import { jsonError, jsonOk, jsonResponse } from '@/lib/api/response';

export function authorizeCronRequest(request: Request): Response | null {
	const secret = import.meta.env.CRON_SECRET;
	if (!secret) return new Response('Unauthorized', { status: 401 });
	const auth = request.headers.get('authorization');
	if (auth !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 });
	if (!isServiceSupabaseConfigured()) {
		return jsonError('service_role_not_configured', 503);
	}
	return null;
}

/** Uruchamia worker cron z ujednoliconą obsługą błędów JSON. */
export async function runCronJob<T extends Record<string, unknown>>(
	request: Request,
	job: () => Promise<T>,
): Promise<Response> {
	const denied = authorizeCronRequest(request);
	if (denied) return denied;

	try {
		const result = await job();
		return jsonOk(result);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'worker_error';
		return jsonResponse({ ok: false, error: message }, 500);
	}
}
