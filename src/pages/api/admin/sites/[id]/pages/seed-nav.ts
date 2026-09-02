import type { APIRoute } from 'astro';
import { guardAdminRedirect, isGuardBlocked } from '@/lib/api';
import { seedNavSitePages } from '@/lib/site-pages/seed-nav';

export const POST: APIRoute = async ({ params, redirect, locals }) => {
	const auth = guardAdminRedirect(locals, redirect);
	if (isGuardBlocked(auth)) return auth;
	const { supabase } = auth;
	const siteId = params.id;
	if (!siteId) return redirect('/admin/sites');

	const user = locals.user;
	if (!user) return redirect('/login');

	const result = await seedNavSitePages(supabase, siteId, user.id);
	return redirect(`/admin/units/${siteId}/pages?seeded=${result.created}`);
};
