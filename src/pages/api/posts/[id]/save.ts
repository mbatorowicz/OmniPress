import type { APIRoute } from 'astro';
import { requireAuth } from '@/lib/auth';
import { canEditPost, getPostById, resolvePostCategoryFields, slugFromTitle, parseAssetDisplayModes, parseGalleryOrder, updateGalleryOrder, updatePostAssetDisplayModes } from '@/lib/posts';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
	const postId = params.id;
	if (!postId) return redirect('/dashboard');

	const auth = requireAuth(locals);
	if (!auth) return redirect('/login');
	const { user, profile, supabase } = auth;

	const post = await getPostById(supabase, postId);
	if (!post || !canEditPost(post, user.id, profile.role)) {
		return redirect(`/dashboard/posts/${postId}?error=forbidden`);
	}

	const form = await request.formData();
	const title = String(form.get('title') ?? '').trim();
	const content_md = String(form.get('content_md') ?? '');
	const slugInput = String(form.get('slug') ?? '').trim();
	const slug = slugInput || (title ? slugFromTitle(title) : post.slug);
	const categorySlug = String(form.get('category_slug') ?? '').trim();
	const categoryFields = await resolvePostCategoryFields(supabase, post.site_id, categorySlug);
	if (!categoryFields) {
		return redirect(`/dashboard/posts/${postId}?error=category_required`);
	}

	const { error } = await supabase
		.from('posts')
		.update({
			title,
			content_md,
			slug: slug || null,
			...categoryFields,
		})
		.eq('id', postId);

	if (error) {
		return redirect(`/dashboard/posts/${postId}?error=save_failed`);
	}

	await updatePostAssetDisplayModes(supabase, postId, parseAssetDisplayModes(form));
	await updateGalleryOrder(supabase, postId, parseGalleryOrder(form));

	return redirect(`/dashboard/posts/${postId}?saved=1`);
};
