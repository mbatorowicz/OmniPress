import type { APIRoute } from 'astro';
import { deletePost, requireAdmin } from '@/lib/admin';

export const POST: APIRoute = async ({ params, redirect, locals }) => {
	if (!requireAdmin(locals)) return redirect('/login');
	const postId = params.id;
	if (!postId) return redirect('/admin');

	const result = await deletePost(locals.supabase, postId);
	if (!result.ok) {
		return redirect(`/admin/posts/${postId}?error=${result.error}`);
	}

	const q = result.remoteErrors.length ? '?deleted=1&remote_warning=1' : '?deleted=1';
	return redirect(`/admin${q}`);
};
