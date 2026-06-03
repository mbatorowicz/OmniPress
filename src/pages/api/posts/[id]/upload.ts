import type { APIRoute } from 'astro';
import { canEditPost, extensionForMime, getPostById, validateImageFile } from '@/lib/posts';

export const POST: APIRoute = async ({ params, request, locals }) => {
	const postId = params.id;
	if (!postId) {
		return new Response(JSON.stringify({ error: 'Brak ID wpisu' }), { status: 400 });
	}

	const profile = locals.profile;
	const user = locals.user;
	if (!profile || !user) {
		return new Response(JSON.stringify({ error: 'Niezalogowany' }), { status: 401 });
	}

	const post = await getPostById(locals.supabase, postId);
	if (!post || !canEditPost(post, user.id, profile.role)) {
		return new Response(JSON.stringify({ error: 'Brak uprawnień' }), { status: 403 });
	}

	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File)) {
		return new Response(JSON.stringify({ error: 'Brak pliku' }), { status: 400 });
	}

	const validationError = validateImageFile(file);
	if (validationError) {
		return new Response(JSON.stringify({ error: validationError }), { status: 400 });
	}

	const ext = extensionForMime(file.type);
	const filename = `${crypto.randomUUID()}.${ext}`;
	const storagePath = `${postId}/${filename}`;

	const buffer = await file.arrayBuffer();
	const { error: uploadError } = await locals.supabase.storage
		.from('post-assets')
		.upload(storagePath, buffer, {
			contentType: file.type,
			upsert: false,
		});

	if (uploadError) {
		return new Response(
			JSON.stringify({
				error:
					'Upload nie powiódł się. Uruchom migrację storage w Supabase (post-assets).',
				detail: uploadError.message,
			}),
			{ status: 500 },
		);
	}

	await locals.supabase.from('assets').insert({
		post_id: postId,
		storage_path: storagePath,
		filename: file.name,
		mime_type: file.type,
	});

	const { data: publicData } = locals.supabase.storage
		.from('post-assets')
		.getPublicUrl(storagePath);

	const markdown = `![${file.name}](${publicData.publicUrl})`;

	return new Response(JSON.stringify({ url: publicData.publicUrl, markdown }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
