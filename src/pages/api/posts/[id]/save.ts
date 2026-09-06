import type { APIRoute } from 'astro';
import { guardAuthRedirect, isGuardBlocked, redirectPostError } from '@/lib/api';
import { normalizeSlug } from '@/lib/admin/slug';
import {
	loadEditablePost,
	parseExtraCategorySlugs,
	resolvePostCategoryFields,
	resolveUniquePostSlug,
	parseAssetDisplayModes,
	parseDocxOrder,
	parseFileOrder,
	parseGalleryOrder,
	parsePdfOrder,
	updateGalleryOrder,
	updateFileAttachmentOrders,
	updatePostAssetDisplayModes,
} from '@/lib/posts';
import { combineScheduleDateHour, wallTimeInZoneToUtcIso } from '@/lib/posts/scheduled-publish';
import { loadFirstPublishedAt, resolveSavedPublishAt } from '@/lib/publish/publish-date';
import { prepareStorageMarkdown } from '@/lib/content/prepare-markdown';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
	const postId = params.id;
	if (!postId) return redirect('/dashboard');

	const auth = guardAuthRedirect(locals, redirect);
	if (isGuardBlocked(auth)) return auth;
	const { user, profile, supabase } = auth;

	const form = await request.formData();
	// Korekta admina wraca do panelu akceptacji; redaktor zostaje w swoim panelu.
	const fromAdminReview = profile.role === 'admin' && form.get('return_to') === 'admin';
	const editorPath = fromAdminReview
		? `/admin/posts/${postId}/edit`
		: `/dashboard/posts/${postId}`;
	const savedPath = fromAdminReview ? `/admin/posts/${postId}` : `/dashboard/posts/${postId}`;

	const post = await loadEditablePost(supabase, postId, user.id, profile.role);
	if (!post) return redirectPostError(redirect, editorPath, 'forbidden');

	const title = String(form.get('title') ?? '').trim();
	const content_md = prepareStorageMarkdown(String(form.get('content_md') ?? ''));
	const slugInput = String(form.get('slug') ?? '').trim();
	const rawSlug = slugInput || (title ? normalizeSlug(title) : post.slug ?? '');
	const baseSlug = rawSlug ? normalizeSlug(rawSlug) : '';
	const slug = baseSlug
		? await resolveUniquePostSlug(supabase, post.site_id, baseSlug, postId)
		: null;
	const categorySlug = String(form.get('category_slug') ?? '').trim();
	const categoryFields = await resolvePostCategoryFields(
		supabase,
		post.site_id,
		categorySlug,
		parseExtraCategorySlugs(form),
	);
	if (!categoryFields) {
		return redirectPostError(redirect, editorPath, 'category_required');
	}

	const scheduleRaw = combineScheduleDateHour(
		form.get('scheduled_publish_date'),
		form.get('scheduled_publish_hour'),
	);
	let formSchedule: string | null = null;
	if (scheduleRaw) {
		formSchedule = wallTimeInZoneToUtcIso(scheduleRaw);
		if (!formSchedule) {
			return redirectPostError(redirect, editorPath, 'schedule_invalid');
		}
	}
	const scheduled_publish_at = resolveSavedPublishAt({
		formValue: formSchedule,
		existingScheduledAt: post.scheduled_publish_at,
		firstPublishedAt: await loadFirstPublishedAt(supabase, postId),
		defaultToNow: false,
	});

	const { error } = await supabase
		.from('posts')
		.update({
			title,
			content_md,
			slug: slug || null,
			scheduled_publish_at,
			...categoryFields,
		})
		.eq('id', postId);

	if (error) {
		return redirectPostError(redirect, editorPath, 'save_failed');
	}

	await updatePostAssetDisplayModes(supabase, postId, parseAssetDisplayModes(form));
	await updateGalleryOrder(supabase, postId, parseGalleryOrder(form));
	await updateFileAttachmentOrders(
		supabase,
		postId,
		parsePdfOrder(form),
		parseDocxOrder(form),
		parseFileOrder(form),
	);

	return redirect(`${savedPath}?saved=1`);
};
