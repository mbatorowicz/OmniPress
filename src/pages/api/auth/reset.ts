import type { APIRoute } from 'astro';
import { auth } from '@/i18n';
import { authResetPasswordUrl } from '@/config/app';
import { guardAuthMutationRequest } from '@/lib/auth/guard-request';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const guard = await guardAuthMutationRequest(request, 'reset');
	if (!guard.ok) {
		if (guard.status === 429) {
			return redirect(
				`/login?mode=reset&error=${encodeURIComponent(guard.message)}`,
			);
		}
		return redirect('/login?mode=reset&sent=1');
	}

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
		const msg = error.message.toLowerCase();
		if (msg.includes('rate limit') || msg.includes('too many')) {
			return redirect(
				`/login?mode=reset&error=${encodeURIComponent(auth.supabase.rateLimit)}`,
			);
		}
	}

	return redirect('/login?mode=reset&sent=1');
};
