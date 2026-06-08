import type { APIRoute } from 'astro';
import { auth, mapAuthError } from '@/i18n';
import { guardAuthMutationRequest } from '@/lib/auth/guard-request';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Przenosi sesję z fragmentu URL (#access_token) do ciasteczek httpOnly (SSR).
 */
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const guard = guardAuthMutationRequest(request, 'establish-session');
	if (!guard.ok) {
		return redirect(
			`/login?mode=reset&error=${encodeURIComponent(guard.message)}`,
		);
	}

	const form = await request.formData();
	const access_token = String(form.get('access_token') ?? '').trim();
	const refresh_token = String(form.get('refresh_token') ?? '').trim();

	if (!access_token || !refresh_token) {
		return redirect(`/login?mode=reset&error=invalid_session`);
	}

	const supabase = createSupabaseServerClient(cookies, request);
	const { error } = await supabase.auth.setSession({ access_token, refresh_token });

	if (error) {
		return redirect(
			`/login?mode=reset&error=${encodeURIComponent(auth.establishSession.expired)}`,
		);
	}

	return redirect('/auth/reset-password');
};
