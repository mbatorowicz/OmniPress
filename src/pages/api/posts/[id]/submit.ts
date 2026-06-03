import type { APIRoute } from 'astro';
import { requireAuth } from '@/lib/auth';
import { canSubmitPost, getPostById } from '@/lib/posts';

export const POST: APIRoute = async ({ params, redirect, locals }) => {
	const postId = params.id;
	if (!postId) return redirect('/dashboard');

	const auth = requireAuth(locals);
	if (!auth) return redirect('/login');
	const { user, supabase } = auth;

	const post = await getPostById(supabase, postId);
	if (!post || !canSubmitPost(post, user.id)) {
		return redirect(`/dashboard/posts/${postId}?error=forbidden`);
	}

	if (!post.title.trim()) {
		return redirect(`/dashboard/posts/${postId}?error=title_required`);
	}

	if (!post.category_slug?.trim()) {
		return redirect(`/dashboard/posts/${postId}?error=category_required`);
	}

	const { error } = await supabase
		.from('posts')
		.update({ status: 'pending', rejection_note: null })
		.eq('id', postId);

	if (error) {
		return redirect(`/dashboard/posts/${postId}?error=submit_failed`);
	}

	return redirect('/dashboard?submitted=1');
};
