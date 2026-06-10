import type { APIRoute } from 'astro';
import { guardAdminRedirect, isGuardBlocked } from '@/lib/api';
import { deactivatePost } from '@/lib/admin';

export const POST: APIRoute = async ({ params, redirect, locals }) => {
	const auth = guardAdminRedirect(locals, redirect);
	if (isGuardBlocked(auth)) return auth;
	const { supabase } = auth;
	const postId = params.id;
	if (!postId) return redirect('/admin');

	const result = await deactivatePost(supabase, postId);
	if (!result.ok) {
		return redirect(`/admin/posts/${postId}?error=${result.error}`);
	}

	const q = result.remoteErrors.length ? '&remote_warning=1' : '';
	return redirect(`/admin?deactivated=1${q}`);
};
