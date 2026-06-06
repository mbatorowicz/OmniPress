import type { APIRoute } from 'astro';
import { api } from '@/i18n';
import { requireAuth } from '@/lib/auth';
import { canEditPost, deletePostAsset, getPostById } from '@/lib/posts';

export const DELETE: APIRoute = async ({ params, locals }) => {
	const postId = params.id;
	const assetId = params.assetId;
	if (!postId || !assetId) {
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

	const result = await deletePostAsset(supabase, postId, assetId);
	if (!result.ok) {
		const message = result.error === 'not_found' ? api.posts.assetNotFound : api.posts.deleteFailed;
		return new Response(JSON.stringify({ error: message }), {
			status: result.error === 'not_found' ? 404 : 500,
		});
	}

	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
