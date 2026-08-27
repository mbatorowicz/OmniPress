import type { APIRoute } from 'astro';
import { guardAdminRedirect, isGuardBlocked } from '@/lib/api';
import { setPostPinned } from '@/lib/admin';
import { getPostById } from '@/lib/posts';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
	const auth = guardAdminRedirect(locals, redirect);
	if (isGuardBlocked(auth)) return auth;
	const { supabase } = auth;
	const postId = params.id;
	if (!postId) return redirect('/admin');

	const post = await getPostById(supabase, postId);
	if (!post) return redirect('/admin?error=not_found');

	const form = await request.formData();
	const pinned = form.get('pinned') === 'on';

	const result = await setPostPinned(supabase, post, pinned);
	if (!result.ok) {
		return redirect(`/admin/posts/${postId}?error=${result.error}`);
	}

	const qs = result.republishQueued ? 'pinned=1&republish=1' : 'pinned=1';
	return redirect(`/admin/posts/${postId}?${qs}`);
};
