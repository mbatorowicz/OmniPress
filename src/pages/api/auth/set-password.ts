import type { APIRoute } from 'astro';
import { auth, mapAuthError } from '@/i18n';
import { guardAuthMutationRequest } from '@/lib/auth/guard-request';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const guard = guardAuthMutationRequest(request, 'set-password');
	if (!guard.ok) {
		return redirect(
			`/auth/reset-password?error=${encodeURIComponent(guard.message)}`,
		);
	}

	const form = await request.formData();
	const password = String(form.get('password') ?? '');
	const password2 = String(form.get('password_confirm') ?? '');

	if (!password || password.length < 8) {
		return redirect(
			`/auth/reset-password?error=${encodeURIComponent(auth.resetPassword.errors.minLength)}`,
		);
	}

	if (password !== password2) {
		return redirect(
			`/auth/reset-password?error=${encodeURIComponent(auth.resetPassword.errors.mismatch)}`,
		);
	}

	const supabase = createSupabaseServerClient(cookies, request);
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return redirect(
			`/login?mode=reset&error=${encodeURIComponent(auth.resetPassword.errors.sessionExpired)}`,
		);
	}

	const { error } = await supabase.auth.updateUser({ password });

	if (error) {
		return redirect(
			`/auth/reset-password?error=${encodeURIComponent(mapAuthError(error.message))}`,
		);
	}

	await supabase.auth.signOut();

	return redirect(
		`/login?success=${encodeURIComponent(auth.login.passwordSaved)}`,
	);
};
