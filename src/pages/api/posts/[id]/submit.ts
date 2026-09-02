import type { APIRoute } from 'astro';
import { guardAuthRedirect, isGuardBlocked, redirectPostError } from '@/lib/api';
import { loadSubmittablePost, resolvePostCategoryFields } from '@/lib/posts';
import { combineScheduleDateHour, parseScheduledPublishAtInput } from '@/lib/posts/scheduled-publish';
import { sanitizeStorageMarkdown } from '@/lib/content/sanitize';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
	const postId = params.id;
	if (!postId) return redirect('/dashboard');

	const auth = guardAuthRedirect(locals, redirect);
	if (isGuardBlocked(auth)) return auth;
	const { user, profile, supabase } = auth;

	const form = await request.formData();
	// Administrator prowadzi cudzy wpis z panelu akceptacji; redaktor zostaje w swoim panelu.
	const fromAdminReview = profile.role === 'admin' && form.get('return_to') === 'admin';
	const editorPath = fromAdminReview
		? `/admin/posts/${postId}/edit`
		: `/dashboard/posts/${postId}`;
	const submittedPath = fromAdminReview
		? `/admin/posts/${postId}?submitted=1`
		: '/dashboard?submitted=1';

	const post = await loadSubmittablePost(supabase, postId, user.id, profile.role);
	if (!post) return redirectPostError(redirect, editorPath, 'forbidden');

	const title = String(form.get('title') ?? '').trim() || post.title;
	const content_md = sanitizeStorageMarkdown(String(form.get('content_md') ?? post.content_md));
	const categorySlug = String(form.get('category_slug') ?? '').trim() || post.category_slug;

	if (!title.trim()) {
		return redirectPostError(redirect, editorPath, 'title_required');
	}

	if (!categorySlug?.trim()) {
		return redirectPostError(redirect, editorPath, 'category_required');
	}

	// Nazwa kategorii idzie do front-matteru; przy niedostępnej liście zostaje sam slug.
	const resolvedCategory = await resolvePostCategoryFields(supabase, post.site_id, categorySlug);
	const category = resolvedCategory ?? { category_slug: categorySlug };

	const scheduleRaw = combineScheduleDateHour(
		form.get('scheduled_publish_date'),
		form.get('scheduled_publish_hour'),
	);
	const schedule = parseScheduledPublishAtInput(scheduleRaw);
	if (schedule.error === 'invalid') {
		return redirectPostError(redirect, editorPath, 'schedule_invalid');
	}
	// Brak daty = publikacja w momencie wysłania (po akceptacji administratora).
	const scheduled_publish_at = schedule.value ?? new Date().toISOString();

	const { error } = await supabase
		.from('posts')
		.update({
			title,
			content_md,
			...category,
			scheduled_publish_at,
			status: 'pending',
			rejection_note: null,
		})
		.eq('id', postId);

	if (error) {
		return redirectPostError(redirect, editorPath, 'submit_failed');
	}

	return redirect(submittedPath);
};
