import type { APIRoute } from 'astro';
import { mapAuthError } from '@/i18n';
import { authResetPasswordUrl } from '@/config/app';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const form = await request.formData();
	const email = String(form.get('email') ?? '').trim();

	if (!email) {
		return redirect('/login?mode=reset&error=missing_email');
	}

	const supabase = createSupabaseServerClient(cookies, request);
	const { error } = await supabase.auth.resetPasswordForEmail(email, {
		redirectTo: authResetPasswordUrl(),
	});

	if (error) {
		return redirect(
			`/login?mode=reset&error=${encodeURIComponent(mapAuthError(error.message))}`,
		);
	}

	return redirect('/login?mode=reset&sent=1');
};
