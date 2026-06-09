import type { APIRoute } from 'astro';
import { requireAdmin } from '@/lib/admin';
import { createSitePage } from '@/lib/site-pages';

export const POST: APIRoute = async ({ params, redirect, locals }) => {
	if (!requireAdmin(locals)) return redirect('/login');
	const siteId = params.id;
	if (!siteId) return redirect('/admin/sites');

	const user = locals.user;
	if (!user) return redirect('/login');

	const created = await createSitePage(locals.supabase, siteId, user.id);
	if (!created.ok) {
		return redirect(`/admin/units/${siteId}/pages?error=${created.error}`);
	}

	return redirect(`/admin/units/${siteId}/pages/${created.page.id}`);
};
