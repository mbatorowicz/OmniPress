import type { APIRoute } from 'astro';
import { approvePost, requireAdmin } from '@/lib/admin';
import { getPostById } from '@/lib/posts';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
	if (!requireAdmin(locals)) return redirect('/login');
	const postId = params.id;
	if (!postId) return redirect('/admin');

	const post = await getPostById(locals.supabase, postId);
	if (!post) return redirect('/admin?error=not_found');

	const form = await request.formData();
	const destinationIds = form.getAll('destination_id').map(String);

	const result = await approvePost(locals.supabase, post, destinationIds);
	if (!result.ok) {
		return redirect(`/admin/posts/${postId}?error=${result.error}`);
	}
	return redirect(`/admin/posts/${postId}?approved=1`);
};
