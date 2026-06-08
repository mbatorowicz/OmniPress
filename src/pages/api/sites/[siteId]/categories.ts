import type { APIRoute } from 'astro';
import { api } from '@/i18n';
import { getUserSites, requireAuth } from '@/lib/auth';
import { loadSiteCategories } from '@/lib/categories';
import { loadAllowedSites } from '@/lib/posts';

export const GET: APIRoute = async ({ params, locals }) => {
	const auth = requireAuth(locals);
	if (!auth) {
		return new Response(JSON.stringify({ ok: false, message: api.posts.unauthorized }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const siteId = params.siteId;
	if (!siteId) {
		return new Response(JSON.stringify({ ok: false, message: api.posts.missingSiteId }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const userSites = await getUserSites(auth.supabase, auth.user.id);
	const allowed = await loadAllowedSites(auth.supabase, auth.profile, userSites);
	if (!allowed.some((site) => site.id === siteId)) {
		return new Response(JSON.stringify({ ok: false, message: api.posts.forbidden }), {
			status: 403,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const { categories, warnings } = await loadSiteCategories(auth.supabase, siteId);
	return new Response(JSON.stringify({ ok: true, categories, warnings }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
