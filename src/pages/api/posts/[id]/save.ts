import type { APIRoute } from 'astro';
import { canEditPost, getPostById, slugFromTitle } from '@/lib/posts';

export const POST: APIRoute = async ({ params, request, cookies, redirect, locals }) => {
	const postId = params.id;
	if (!postId) return redirect('/dashboard');

	const profile = locals.profile;
	const user = locals.user;
	if (!profile || !user) return redirect('/login');

	const post = await getPostById(locals.supabase, postId);
	if (!post || !canEditPost(post, user.id, profile.role)) {
		return redirect(`/dashboard/posts/${postId}?error=forbidden`);
	}

	const form = await request.formData();
	const title = String(form.get('title') ?? '').trim();
	const content_md = String(form.get('content_md') ?? '');
	const slugInput = String(form.get('slug') ?? '').trim();
	const slug = slugInput || (title ? slugFromTitle(title) : post.slug);

	const { error } = await locals.supabase
		.from('posts')
		.update({
			title,
			content_md,
			slug: slug || null,
		})
		.eq('id', postId);

	if (error) {
		return redirect(`/dashboard/posts/${postId}?error=save_failed`);
	}

	return redirect(`/dashboard/posts/${postId}?saved=1`);
};
