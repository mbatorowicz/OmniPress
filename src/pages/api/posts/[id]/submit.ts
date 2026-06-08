import type { APIRoute } from 'astro';
import { requireAuth } from '@/lib/auth';
import { canSubmitPost, getPostById } from '@/lib/posts';
import { parseScheduledPublishAtInput } from '@/lib/posts/scheduled-publish';
import { sanitizeStorageMarkdown } from '@/lib/content/sanitize';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
	const postId = params.id;
	if (!postId) return redirect('/dashboard');

	const auth = requireAuth(locals);
	if (!auth) return redirect('/login');
	const { user, supabase } = auth;

	const post = await getPostById(supabase, postId);
	if (!post || !canSubmitPost(post, user.id)) {
		return redirect(`/dashboard/posts/${postId}?error=forbidden`);
	}

	const form = await request.formData();
	const title = String(form.get('title') ?? '').trim() || post.title;
	const content_md = sanitizeStorageMarkdown(String(form.get('content_md') ?? post.content_md));
	const categorySlug = String(form.get('category_slug') ?? '').trim() || post.category_slug;

	if (!title.trim()) {
		return redirect(`/dashboard/posts/${postId}?error=title_required`);
	}

	if (!categorySlug?.trim()) {
		return redirect(`/dashboard/posts/${postId}?error=category_required`);
	}

	const schedule = parseScheduledPublishAtInput(form.get('scheduled_publish_at'));
	if (schedule.error === 'invalid') {
		return redirect(`/dashboard/posts/${postId}?error=schedule_required`);
	}
	if (schedule.error === 'past') {
		return redirect(`/dashboard/posts/${postId}?error=schedule_past`);
	}

	const { error } = await supabase
		.from('posts')
		.update({
			title,
			content_md,
			category_slug: categorySlug,
			scheduled_publish_at: schedule.value,
			status: 'pending',
			rejection_note: null,
		})
		.eq('id', postId);

	if (error) {
		return redirect(`/dashboard/posts/${postId}?error=submit_failed`);
	}

	return redirect('/dashboard?submitted=1');
};
