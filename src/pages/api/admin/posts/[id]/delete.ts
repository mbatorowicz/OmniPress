import type { APIRoute } from 'astro';
import { guardAdminRedirect, isGuardBlocked } from '@/lib/api';
import { deletePost } from '@/lib/admin';

export const POST: APIRoute = async ({ params, redirect, locals }) => {
	const auth = guardAdminRedirect(locals, redirect);
	if (isGuardBlocked(auth)) return auth;
	const { supabase } = auth;
	const postId = params.id;
	if (!postId) return redirect('/admin');

	const result = await deletePost(supabase, postId);
	if (!result.ok) {
		return redirect(`/admin/posts/${postId}?error=${result.error}`);
	}

	const q = result.remoteErrors.length ? '?deleted=1&remote_warning=1' : '?deleted=1';
	return redirect(`/admin${q}`);
};
