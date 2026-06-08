import type { APIRoute } from 'astro';
import { mapAuthError, getProfile, roleHomePath } from '@/lib/auth';
import { guardAuthMutationRequest } from '@/lib/auth/guard-request';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const guard = guardAuthMutationRequest(request, 'login');
	if (!guard.ok) {
		return redirect(`/login?error=${encodeURIComponent(guard.message)}`);
	}

	const form = await request.formData();
	const email = String(form.get('email') ?? '').trim().toLowerCase();
	const password = String(form.get('password') ?? '');

	if (!email || !password) {
		return redirect('/login?error=missing');
	}

	const supabase = createSupabaseServerClient(cookies, request);
	const { data, error } = await supabase.auth.signInWithPassword({ email, password });

	if (error) {
		return redirect(`/login?error=${encodeURIComponent(mapAuthError(error.message))}`);
	}

	const user = data.user ?? data.session?.user;
	if (!user) {
		return redirect('/login?error=session');
	}

	const profile = await getProfile(supabase, user.id);
	return redirect(roleHomePath(profile?.role ?? 'editor'));
};
