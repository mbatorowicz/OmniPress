import type { APIRoute } from 'astro';
import { guardAuthRedirect, isGuardBlocked, redirectPostError } from '@/lib/api';
import { deleteOwnPost } from '@/lib/posts';

export const POST: APIRoute = async ({ params, redirect, locals }) => {
	const postId = params.id;
	if (!postId) return redirect('/dashboard');

	const auth = guardAuthRedirect(locals, redirect);
	if (isGuardBlocked(auth)) return auth;
	const { user, supabase } = auth;

	const result = await deleteOwnPost(supabase, postId, user.id);
	if (!result.ok) {
		return redirectPostError(redirect, `/dashboard/posts/${postId}`, result.error);
	}

	return redirect('/dashboard?deleted=1');
};
