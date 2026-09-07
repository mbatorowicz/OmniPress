import { timingSafeEqual } from 'node:crypto';
import { isServiceSupabaseConfigured } from '@/lib/supabase/service';
import { jsonError, jsonOk, jsonResponse } from '@/lib/api/response';

function bearerMatches(header: string | null, secret: string): boolean {
	const expected = Buffer.from(`Bearer ${secret}`);
	const provided = Buffer.from(header ?? '');
	if (provided.length !== expected.length) return false;
	return timingSafeEqual(provided, expected);
}

export function authorizeCronRequest(request: Request): Response | null {
	const secret = import.meta.env.CRON_SECRET;
	if (!secret) return new Response('Unauthorized', { status: 401 });
	if (!bearerMatches(request.headers.get('authorization'), secret)) {
		return new Response('Unauthorized', { status: 401 });
	}
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
	} catch {
		return jsonResponse({ ok: false, error: 'worker_error' }, 500);
	}
}
