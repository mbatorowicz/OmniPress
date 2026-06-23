import type { APIRoute } from 'astro';
import { guardAuthRedirect, isGuardBlocked, redirectPostError } from '@/lib/api';
import { loadSubmittablePost } from '@/lib/posts';
import { combineScheduleDateHour, parseScheduledPublishAtInput } from '@/lib/posts/scheduled-publish';
import { sanitizeStorageMarkdown } from '@/lib/content/sanitize';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
	const postId = params.id;
	if (!postId) return redirect('/dashboard');

	const auth = guardAuthRedirect(locals, redirect);
	if (isGuardBlocked(auth)) return auth;
	const { user, supabase } = auth;

	const post = await loadSubmittablePost(supabase, postId, user.id);
	if (!post) return redirectPostError(redirect, `/dashboard/posts/${postId}`, 'forbidden');

	const form = await request.formData();
	const title = String(form.get('title') ?? '').trim() || post.title;
	const content_md = sanitizeStorageMarkdown(String(form.get('content_md') ?? post.content_md));
	const categorySlug = String(form.get('category_slug') ?? '').trim() || post.category_slug;

	if (!title.trim()) {
		return redirectPostError(redirect, `/dashboard/posts/${postId}`, 'title_required');
	}

	if (!categorySlug?.trim()) {
		return redirectPostError(redirect, `/dashboard/posts/${postId}`, 'category_required');
	}

	const scheduleRaw = combineScheduleDateHour(
		form.get('scheduled_publish_date'),
		form.get('scheduled_publish_hour'),
	);
	const schedule = parseScheduledPublishAtInput(scheduleRaw);
	if (schedule.error === 'invalid') {
		return redirectPostError(redirect, `/dashboard/posts/${postId}`, 'schedule_invalid');
	}
	// Brak daty = publikacja w momencie wysłania (po akceptacji administratora).
	const scheduled_publish_at = schedule.value ?? new Date().toISOString();

	const { error } = await supabase
		.from('posts')
		.update({
			title,
			content_md,
			category_slug: categorySlug,
			scheduled_publish_at,
			status: 'pending',
			rejection_note: null,
		})
		.eq('id', postId);

	if (error) {
		return redirectPostError(redirect, `/dashboard/posts/${postId}`, 'submit_failed');
	}

	return redirect('/dashboard?submitted=1');
};
