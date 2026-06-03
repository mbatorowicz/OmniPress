import type { APIRoute } from 'astro';
import { mapAuthError } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const form = await request.formData();
	const password = String(form.get('password') ?? '');
	const password2 = String(form.get('password_confirm') ?? '');

	if (!password || password.length < 8) {
		return redirect(
			`/auth/reset-password?error=${encodeURIComponent('Hasło musi mieć co najmniej 8 znaków.')}`,
		);
	}

	if (password !== password2) {
		return redirect(
			`/auth/reset-password?error=${encodeURIComponent('Hasła muszą być takie same.')}`,
		);
	}

	const supabase = createSupabaseServerClient(cookies, request);
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return redirect(
			`/login?mode=reset&error=${encodeURIComponent('Sesja wygasła — wyślij nowy link.')}`,
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
		`/login?success=${encodeURIComponent('Hasło zapisane. Zaloguj się nowym hasłem.')}`,
	);
};
