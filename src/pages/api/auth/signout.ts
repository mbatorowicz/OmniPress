import type { APIRoute } from 'astro';
import { guardSameOriginPost } from '@/lib/auth/guard-request';
import { createSupabaseServerClient } from '../../../lib/supabase/server';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const guard = guardSameOriginPost(request);
	if (!guard.ok) {
		return new Response(null, { status: guard.status });
	}

	const supabase = createSupabaseServerClient(cookies, request);
	await supabase.auth.signOut();
	return redirect('/login');
};
