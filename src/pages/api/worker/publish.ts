import type { APIRoute } from 'astro';
import { runPublishWorker } from '@/lib/publish';
import { createServiceSupabase, isServiceSupabaseConfigured } from '@/lib/supabase/service';

function isAuthorized(request: Request): boolean {
	const secret = import.meta.env.CRON_SECRET;
	if (!secret) return false;
	const auth = request.headers.get('authorization');
	return auth === `Bearer ${secret}`;
}

export const GET: APIRoute = async ({ request }) => {
	if (!isAuthorized(request)) {
		return new Response('Unauthorized', { status: 401 });
	}
	if (!isServiceSupabaseConfigured()) {
		return new Response(JSON.stringify({ error: 'service_role_not_configured' }), {
			status: 503,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const supabase = createServiceSupabase();
		const result = await runPublishWorker(supabase);
		return new Response(JSON.stringify({ ok: true, ...result }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : 'worker_error';
		return new Response(JSON.stringify({ ok: false, error: message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};
