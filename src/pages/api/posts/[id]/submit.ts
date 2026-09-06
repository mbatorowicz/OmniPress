import type { APIRoute } from 'astro';
import { guardAuthRedirect, isGuardBlocked, redirectPostError } from '@/lib/api';
import { loadSubmittablePost, parseExtraCategorySlugs, resolvePostCategoryFields } from '@/lib/posts';
import { combineScheduleDateHour, parseScheduledPublishAtInput } from '@/lib/posts/scheduled-publish';
import { loadFirstPublishedAt, resolveSavedPublishAt } from '@/lib/publish/publish-date';
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
	const extraSlugs = parseExtraCategorySlugs(form);

	if (!title.trim()) {
		return redirectPostError(redirect, editorPath, 'title_required');
	}

	if (!categorySlug?.trim()) {
		return redirectPostError(redirect, editorPath, 'category_required');
	}

	// Nazwa kategorii idzie do front-matteru; przy niedostępnej liście zostaje sam slug.
	const resolvedCategory = await resolvePostCategoryFields(
		supabase,
		post.site_id,
		categorySlug,
		extraSlugs,
	);
	const category = resolvedCategory ?? {
		category_slug: categorySlug,
		extra_category_slugs: extraSlugs.filter((s) => s !== categorySlug),
	};

	const scheduleRaw = combineScheduleDateHour(
		form.get('scheduled_publish_date'),
		form.get('scheduled_publish_hour'),
	);
	const schedule = parseScheduledPublishAtInput(scheduleRaw);
	if (schedule.error === 'invalid') {
		return redirectPostError(redirect, editorPath, 'schedule_invalid');
	}
	// Brak daty przy pierwszym wysłaniu = teraz; poprawka zostawia datę pierwszej publikacji.
	const scheduled_publish_at = resolveSavedPublishAt({
		formValue: schedule.value,
		existingScheduledAt: post.scheduled_publish_at,
		firstPublishedAt: await loadFirstPublishedAt(supabase, postId),
		defaultToNow: true,
	});

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
