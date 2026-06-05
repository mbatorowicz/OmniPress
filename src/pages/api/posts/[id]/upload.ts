import type { APIRoute } from 'astro';
import { api, formatUploadError } from '@/i18n';
import { requireAuth } from '@/lib/auth';
import {
	canEditPost,
	extensionForMime,
	getPostById,
	markdownForUploadedAsset,
	nextGallerySortOrder,
	validatePostAssetFile,
} from '@/lib/posts';

export const POST: APIRoute = async ({ params, request, locals }) => {
	const postId = params.id;
	if (!postId) {
		return new Response(JSON.stringify({ error: api.posts.missingPostId }), { status: 400 });
	}

	const auth = requireAuth(locals);
	if (!auth) {
		return new Response(JSON.stringify({ error: api.posts.unauthorized }), { status: 401 });
	}
	const { user, profile, supabase } = auth;

	const post = await getPostById(supabase, postId);
	if (!post || !canEditPost(post, user.id, profile.role)) {
		return new Response(JSON.stringify({ error: api.posts.forbidden }), { status: 403 });
	}

	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File)) {
		return new Response(JSON.stringify({ error: api.posts.missingFile }), { status: 400 });
	}

	const kind = String(form.get('kind') ?? 'gallery');
	const validationError = validatePostAssetFile(file);
	if (validationError) {
		return new Response(JSON.stringify({ error: validationError }), { status: 400 });
	}

	if (kind === 'gallery' && !file.type.startsWith('image/')) {
		return new Response(JSON.stringify({ error: api.posts.missingFile }), { status: 400 });
	}
	if (kind === 'pdf' && file.type !== 'application/pdf') {
		return new Response(JSON.stringify({ error: api.posts.missingFile }), { status: 400 });
	}

	const ext = extensionForMime(file.type);
	const filename = `${crypto.randomUUID()}.${ext}`;
	const storagePath = `${postId}/${filename}`;

	const buffer = await file.arrayBuffer();
	const { error: uploadError } = await supabase.storage
		.from('post-assets')
		.upload(storagePath, buffer, {
			contentType: file.type,
			upsert: false,
		});

	if (uploadError) {
		return new Response(
			JSON.stringify({
				error: formatUploadError(uploadError.message),
				detail: uploadError.message,
			}),
			{ status: 500 },
		);
	}

	const sortOrder =
		kind === 'gallery' ? await nextGallerySortOrder(supabase, postId) : 0;

	const { data: assetRow, error: insertError } = await supabase
		.from('assets')
		.insert({
			post_id: postId,
			storage_path: storagePath,
			filename: file.name,
			mime_type: file.type,
			sort_order: sortOrder,
		})
		.select('id, filename, mime_type, display_mode, sort_order')
		.single();

	if (insertError || !assetRow) {
		return new Response(JSON.stringify({ error: api.posts.uploadFailed }), { status: 500 });
	}

	const { data: publicData } = supabase.storage
		.from('post-assets')
		.getPublicUrl(storagePath);

	const publicUrl = publicData.publicUrl;
	const markdown =
		kind === 'pdf' ? markdownForUploadedAsset(file.name, publicUrl, file.type) : null;

	return new Response(
		JSON.stringify({
			url: publicUrl,
			markdown,
			asset: {
				id: assetRow.id,
				filename: assetRow.filename,
				mime_type: assetRow.mime_type,
				display_mode: assetRow.display_mode ?? 'link',
				sort_order: assetRow.sort_order ?? 0,
				url: publicUrl,
			},
		}),
		{
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		},
	);
};
