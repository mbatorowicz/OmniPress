import type { APIRoute } from 'astro';
import { guardAuthRedirect, isGuardBlocked, redirectPostError } from '@/lib/api';
import {
	loadEditablePost,
	resolvePostCategoryFields,
	resolveUniquePostSlug,
	slugFromTitle,
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
import { sanitizeStorageMarkdown } from '@/lib/content/sanitize';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
	const postId = params.id;
	if (!postId) return redirect('/dashboard');

	const auth = guardAuthRedirect(locals, redirect);
	if (isGuardBlocked(auth)) return auth;
	const { user, profile, supabase } = auth;

	const post = await loadEditablePost(supabase, postId, user.id, profile.role);
	if (!post) return redirectPostError(redirect, `/dashboard/posts/${postId}`, 'forbidden');

	const form = await request.formData();
	const title = String(form.get('title') ?? '').trim();
	const content_md = sanitizeStorageMarkdown(String(form.get('content_md') ?? ''));
	const slugInput = String(form.get('slug') ?? '').trim();
	const baseSlug = slugInput || (title ? slugFromTitle(title) : post.slug);
	const slug = baseSlug
		? await resolveUniquePostSlug(supabase, post.site_id, baseSlug, postId)
		: null;
	const categorySlug = String(form.get('category_slug') ?? '').trim();
	const categoryFields = await resolvePostCategoryFields(supabase, post.site_id, categorySlug);
	if (!categoryFields) {
		return redirectPostError(redirect, `/dashboard/posts/${postId}`, 'category_required');
	}

	const scheduleRaw = combineScheduleDateHour(
		form.get('scheduled_publish_date'),
		form.get('scheduled_publish_hour'),
	);
	let scheduled_publish_at: string | null = null;
	if (scheduleRaw) {
		scheduled_publish_at = wallTimeInZoneToUtcIso(scheduleRaw);
		if (!scheduled_publish_at) {
			return redirectPostError(redirect, `/dashboard/posts/${postId}`, 'schedule_invalid');
		}
	}

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
		return redirectPostError(redirect, `/dashboard/posts/${postId}`, 'save_failed');
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

	return redirect(`/dashboard/posts/${postId}?saved=1`);
};
