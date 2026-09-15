import type { APIRoute } from 'astro';
import { api } from '@/i18n';
import { guardAdminJson, isGuardBlocked, jsonError, jsonOk } from '@/lib/api';
import { getSitePageById } from '@/lib/site-pages';
import { deletePageAsset } from '@/lib/site-pages/assets';

export const DELETE: APIRoute = async ({ params, locals }) => {
	const siteId = params.id;
	const pageId = params.pageId;
	const assetId = params.assetId;
	if (!siteId || !pageId || !assetId) return jsonError(api.posts.missingPostId, 400);

	const auth = guardAdminJson(locals);
	if (isGuardBlocked(auth)) return auth;

	const page = await getSitePageById(auth.supabase, pageId);
	if (!page || page.site_id !== siteId) return jsonError(api.posts.forbidden, 403);

	const result = await deletePageAsset(auth.supabase, pageId, assetId);
	if (!result.ok) {
		const message = result.error === 'not_found' ? api.posts.assetNotFound : api.posts.deleteFailed;
		return jsonError(message, result.error === 'not_found' ? 404 : 500);
	}

	return jsonOk({});
};
