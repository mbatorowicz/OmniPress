import type { APIRoute } from 'astro';
import { api } from '@/i18n';
import { guardAuthJson, isGuardBlocked, jsonError, jsonResponse } from '@/lib/api';
import { completePostAssetUpload, loadEditablePost } from '@/lib/posts';

export const POST: APIRoute = async ({ params, request, locals }) => {
	const postId = params.id;
	if (!postId) return jsonError(api.posts.missingPostId, 400);

	const auth = guardAuthJson(locals);
	if (isGuardBlocked(auth)) return auth;
	const { user, profile, supabase } = auth;

	const post = await loadEditablePost(supabase, postId, user.id, profile.role);
	if (!post) return jsonError(api.posts.forbidden, 403);

	let body: {
		kind?: string;
		path?: string;
		filename?: string;
		mime?: string;
		size?: number;
	};
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return jsonError(api.posts.missingFile, 400);
	}

	const kind = String(body.kind ?? '');
	const path = String(body.path ?? '').trim();
	const filename = String(body.filename ?? '').trim();
	const mime = String(body.mime ?? '').trim();
	const size = Number(body.size);

	if (!path || !filename || !mime || !Number.isFinite(size) || size < 1) {
		return jsonError(api.posts.missingFile, 400);
	}

	const result = await completePostAssetUpload(supabase, postId, {
		kind,
		path,
		filename,
		mime,
		size,
	});

	if (!result.ok) return jsonError(result.error, result.status);

	return jsonResponse({
		url: result.url,
		markdown: result.markdown,
		asset: result.asset,
	});
};
