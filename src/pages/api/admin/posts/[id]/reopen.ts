import type { APIRoute } from 'astro';
import { guardAdminRedirect, isGuardBlocked } from '@/lib/api';
import { reopenPostForEditing } from '@/lib/admin';

export const POST: APIRoute = async ({ params, redirect, locals }) => {
	const auth = guardAdminRedirect(locals, redirect);
	if (isGuardBlocked(auth)) return auth;
	const { supabase } = auth;
	const postId = params.id;
	if (!postId) return redirect('/admin');

	const result = await reopenPostForEditing(supabase, postId);
	if (!result.ok) {
		return redirect(`/admin/posts/${postId}?error=${result.error}`);
	}

	return redirect(`/admin/posts/${postId}?reopened=1`);
};
