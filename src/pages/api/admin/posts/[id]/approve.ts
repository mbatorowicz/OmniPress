import type { APIRoute } from 'astro';
import { approvePost, requireAdmin } from '@/lib/admin';
import { getPostById } from '@/lib/posts';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
	if (!requireAdmin(locals)) return redirect('/login');
	const postId = params.id;
	if (!postId) return redirect('/admin');

	const post = await getPostById(locals.supabase, postId);
	if (!post) return redirect('/admin?error=not_found');

	const result = await approvePost(locals.supabase, post);
	if (!result.ok) {
		return redirect(`/admin/posts/${postId}?error=${result.error}`);
	}
	const qs = result.scheduled ? 'approved=1&scheduled=1' : 'approved=1';
	return redirect(`/admin/posts/${postId}?${qs}`);
};
