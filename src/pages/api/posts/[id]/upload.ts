import type { APIRoute } from 'astro';
import { api, formatUploadError } from '@/i18n';
import { requireAuth } from '@/lib/auth';
import { canEditPost, extensionForMime, getPostById, markdownForUploadedAsset, validatePostAssetFile } from '@/lib/posts';

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

	const validationError = validatePostAssetFile(file);
	if (validationError) {
		return new Response(JSON.stringify({ error: validationError }), { status: 400 });
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

	await supabase.from('assets').insert({
		post_id: postId,
		storage_path: storagePath,
		filename: file.name,
		mime_type: file.type,
	});

	const { data: publicData } = supabase.storage
		.from('post-assets')
		.getPublicUrl(storagePath);

	const markdown = markdownForUploadedAsset(file.name, publicData.publicUrl, file.type);

	return new Response(JSON.stringify({ url: publicData.publicUrl, markdown }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
