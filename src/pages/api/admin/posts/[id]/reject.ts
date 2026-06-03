import type { APIRoute } from 'astro';
import { rejectPost, requireAdmin } from '@/lib/admin';
import { getPostById } from '@/lib/posts';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
	if (!requireAdmin(locals)) return redirect('/login');
	const postId = params.id;
	if (!postId) return redirect('/admin');

	const post = await getPostById(locals.supabase, postId);
	if (!post || post.status !== 'pending') {
		return redirect(`/admin/posts/${postId}?error=not_pending`);
	}

	const form = await request.formData();
	const note = String(form.get('rejection_note') ?? '');

	const result = await rejectPost(locals.supabase, postId, note);
	if (!result.ok) {
		return redirect(`/admin/posts/${postId}?error=${result.error}`);
	}
	return redirect(`/admin/posts/${postId}?rejected=1`);
};
