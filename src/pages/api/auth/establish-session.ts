import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Przenosi sesję z fragmentu URL (#access_token) do ciasteczek httpOnly (SSR).
 */
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const form = await request.formData();
	const access_token = String(form.get('access_token') ?? '').trim();
	const refresh_token = String(form.get('refresh_token') ?? '').trim();

	if (!access_token || !refresh_token) {
		return redirect('/login?mode=reset&error=invalid_session');
	}

	const supabase = createSupabaseServerClient(cookies, request);
	const { error } = await supabase.auth.setSession({ access_token, refresh_token });

	if (error) {
		return redirect(
			`/login?mode=reset&error=${encodeURIComponent('Link wygasł — wyślij nowy.')}`,
		);
	}

	return redirect('/auth/reset-password');
};
