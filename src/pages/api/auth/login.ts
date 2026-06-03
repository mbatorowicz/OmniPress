import type { APIRoute } from 'astro';
import { mapAuthError } from '@/lib/auth/messages';
import { getProfile, roleHomePath } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const form = await request.formData();
	const email = String(form.get('email') ?? '').trim();
	const password = String(form.get('password') ?? '');

	if (!email || !password) {
		return redirect('/login?error=missing');
	}

	const supabase = createSupabaseServerClient(cookies, request);
	const { error } = await supabase.auth.signInWithPassword({ email, password });

	if (error) {
		return redirect(
			`/login?error=${encodeURIComponent(mapAuthError(error.message))}`,
		);
	}

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return redirect('/login?error=session');
	}

	const profile = await getProfile(supabase, user.id);
	return redirect(roleHomePath(profile?.role ?? 'editor'));
};
