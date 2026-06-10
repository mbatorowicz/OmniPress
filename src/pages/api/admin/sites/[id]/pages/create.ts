import type { APIRoute } from 'astro';
import { guardAdminRedirect, isGuardBlocked } from '@/lib/api';
import { createSitePage } from '@/lib/site-pages';

export const POST: APIRoute = async ({ params, redirect, locals }) => {
	const auth = guardAdminRedirect(locals, redirect);
	if (isGuardBlocked(auth)) return auth;
	const { supabase } = auth;
	const siteId = params.id;
	if (!siteId) return redirect('/admin/sites');

	const user = locals.user;
	if (!user) return redirect('/login');

	const created = await createSitePage(supabase, siteId, user.id);
	if (!created.ok) {
		return redirect(`/admin/units/${siteId}/pages?error=${created.error}`);
	}

	return redirect(`/admin/units/${siteId}/pages/${created.page.id}`);
};
