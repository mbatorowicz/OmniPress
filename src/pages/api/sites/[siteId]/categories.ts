import type { APIRoute } from 'astro';
import { api } from '@/i18n';
import { getUserSites } from '@/lib/auth';
import { guardAuthJson, isGuardBlocked, jsonError, jsonOk } from '@/lib/api';
import { loadSiteCategories } from '@/lib/categories';
import { loadAllowedSites } from '@/lib/posts';

export const GET: APIRoute = async ({ params, locals }) => {
	const auth = guardAuthJson(locals);
	if (isGuardBlocked(auth)) return auth;

	const siteId = params.siteId;
	if (!siteId) return jsonError(api.posts.missingSiteId, 400);

	const userSites = await getUserSites(auth.supabase, auth.user.id);
	const allowed = await loadAllowedSites(auth.supabase, auth.profile, userSites);
	if (!allowed.some((site) => site.id === siteId)) {
		return jsonError(api.posts.forbidden, 403);
	}

	const { categories, warnings } = await loadSiteCategories(auth.supabase, siteId);
	return jsonOk({ categories, warnings });
};
