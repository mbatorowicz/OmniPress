import type { APIRoute } from 'astro';
import { requireAuth } from '@/lib/auth';
import { loadSiteCategories } from '@/lib/categories';

export const GET: APIRoute = async ({ params, locals }) => {
	const auth = requireAuth(locals);
	if (!auth) {
		return new Response(JSON.stringify({ ok: false, message: 'Brak uprawnień.' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const siteId = params.siteId;
	if (!siteId) {
		return new Response(JSON.stringify({ ok: false, message: 'Brak site_id.' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const { categories, warnings } = await loadSiteCategories(auth.supabase, siteId);
	return new Response(JSON.stringify({ ok: true, categories, warnings }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
