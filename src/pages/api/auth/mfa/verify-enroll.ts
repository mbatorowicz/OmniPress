import type { APIRoute } from 'astro';
import { auth, mapAuthError } from '@/i18n';
import { getSessionUser } from '@/lib/auth';
import { guardSameOriginPost } from '@/lib/auth/guard-request';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const guard = guardSameOriginPost(request);
	if (!guard.ok) {
		return redirect('/auth/mfa/setup?error=' + encodeURIComponent(guard.message));
	}

	const form = await request.formData();
	const code = String(form.get('code') ?? '').trim();
	const factorId = String(form.get('factor_id') ?? '').trim();

	if (!code || !factorId) {
		return redirect('/auth/mfa/setup?error=' + encodeURIComponent(auth.mfa.missingCode));
	}

	const supabase = createSupabaseServerClient(cookies, request);
	const user = await getSessionUser(supabase);
	if (!user) return redirect('/login');

	const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
	if (challengeError || !challenge?.id) {
		return redirect('/auth/mfa/setup?error=' + encodeURIComponent(auth.mfa.verifyFailed));
	}

	const { error } = await supabase.auth.mfa.verify({
		factorId,
		challengeId: challenge.id,
		code,
	});

	if (error) {
		return redirect(
			'/auth/mfa/setup?error=' +
				encodeURIComponent(mapAuthError(error.message) || auth.mfa.verifyFailed),
		);
	}

	return redirect('/admin');
};
