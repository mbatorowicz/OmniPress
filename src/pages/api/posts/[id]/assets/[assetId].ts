import type { APIRoute } from 'astro';
import { api } from '@/i18n';
import { guardAuthJson, isGuardBlocked, jsonError, jsonOk } from '@/lib/api';
import { deletePostAsset, loadEditablePost } from '@/lib/posts';

export const DELETE: APIRoute = async ({ params, locals }) => {
	const postId = params.id;
	const assetId = params.assetId;
	if (!postId || !assetId) {
		return jsonError(api.posts.missingPostId, 400);
	}

	const auth = guardAuthJson(locals);
	if (isGuardBlocked(auth)) return auth;
	const { user, profile, supabase } = auth;

	const post = await loadEditablePost(supabase, postId, user.id, profile.role);
	if (!post) return jsonError(api.posts.forbidden, 403);

	const result = await deletePostAsset(supabase, postId, assetId);
	if (!result.ok) {
		const message = result.error === 'not_found' ? api.posts.assetNotFound : api.posts.deleteFailed;
		return jsonError(message, result.error === 'not_found' ? 404 : 500);
	}

	return jsonOk({});
};
