import type { APIRoute } from 'astro';
import { api } from '@/i18n';
import { guardAuthJson, isGuardBlocked, jsonError, jsonResponse } from '@/lib/api';
import { createPostAssetSignedUpload, loadEditablePost } from '@/lib/posts';

export const POST: APIRoute = async ({ params, request, locals }) => {
	const postId = params.id;
	if (!postId) return jsonError(api.posts.missingPostId, 400);

	const auth = guardAuthJson(locals);
	if (isGuardBlocked(auth)) return auth;
	const { user, profile, supabase } = auth;

	const post = await loadEditablePost(supabase, postId, user.id, profile.role);
	if (!post) return jsonError(api.posts.forbidden, 403);

	let body: { kind?: string; filename?: string; size?: number; mimeType?: string };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return jsonError(api.posts.missingFile, 400);
	}

	const kind = String(body.kind ?? '');
	const filename = String(body.filename ?? '').trim();
	const size = Number(body.size);
	const mimeType = String(body.mimeType ?? '');

	if (!filename || !Number.isFinite(size) || size < 1) {
		return jsonError(api.posts.missingFile, 400);
	}

	const result = await createPostAssetSignedUpload(supabase, postId, {
		kind,
		filename,
		size,
		mimeType,
	});

	if (!result.ok) return jsonError(result.error, result.status);

	return jsonResponse({
		path: result.path,
		token: result.token,
		signedUrl: result.signedUrl,
		mime: result.mime,
		filename: result.filename,
		kind: result.kind,
	});
};
