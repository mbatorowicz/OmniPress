import type { APIRoute } from 'astro';
import { canSubmitPost, getPostById } from '@/lib/posts';

export const POST: APIRoute = async ({ params, request, cookies, redirect, locals }) => {
	const postId = params.id;
	if (!postId) return redirect('/dashboard');

	const user = locals.user;
	if (!user) return redirect('/login');

	const post = await getPostById(locals.supabase, postId);
	if (!post || !canSubmitPost(post, user.id)) {
		return redirect(`/dashboard/posts/${postId}?error=forbidden`);
	}

	if (!post.title.trim()) {
		return redirect(`/dashboard/posts/${postId}?error=title_required`);
	}

	const { error } = await locals.supabase
		.from('posts')
		.update({ status: 'pending', rejection_note: null })
		.eq('id', postId);

	if (error) {
		return redirect(`/dashboard/posts/${postId}?error=submit_failed`);
	}

	return redirect('/dashboard?submitted=1');
};
