import type { APIRoute } from 'astro';
import { api, formatUploadError } from '@/i18n';
import { guardAuthJson, isGuardBlocked, jsonError, jsonResponse } from '@/lib/api';
import {
	extensionForMime,
	loadEditablePost,
	markdownForUploadedAsset,
	nextGallerySortOrder,
	validatePostAssetFile,
} from '@/lib/posts';

export const POST: APIRoute = async ({ params, request, locals }) => {
	const postId = params.id;
	if (!postId) return jsonError(api.posts.missingPostId, 400);

	const auth = guardAuthJson(locals);
	if (isGuardBlocked(auth)) return auth;
	const { user, profile, supabase } = auth;

	const post = await loadEditablePost(supabase, postId, user.id, profile.role);
	if (!post) return jsonError(api.posts.forbidden, 403);

	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File)) return jsonError(api.posts.missingFile, 400);

	const kind = String(form.get('kind') ?? 'gallery');
	const validationError = await validatePostAssetFile(file);
	if (validationError) return jsonError(validationError, 400);

	if (kind === 'gallery' && !file.type.startsWith('image/')) {
		return jsonError(api.posts.missingFile, 400);
	}
	if (kind === 'pdf' && file.type !== 'application/pdf') {
		return jsonError(api.posts.missingFile, 400);
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
		return jsonError(formatUploadError(uploadError.message), 500);
	}

	const sortOrder = kind === 'gallery' ? await nextGallerySortOrder(supabase, postId) : 0;

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
		return jsonError(api.posts.uploadFailed, 500);
	}

	const { data: publicData } = supabase.storage.from('post-assets').getPublicUrl(storagePath);
	const publicUrl = publicData.publicUrl;
	const markdown = kind === 'pdf' ? markdownForUploadedAsset(file.name, publicUrl, file.type) : null;

	return jsonResponse({
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
	});
};
