import type { APIRoute } from 'astro';
import { guardAdminRedirect, isGuardBlocked } from '@/lib/api';
import { importSiteAstroLayoutFromGitHub } from '@/lib/astro-layout/store';

export const POST: APIRoute = async ({ params, redirect, locals }) => {
	const auth = guardAdminRedirect(locals, redirect);
	if (isGuardBlocked(auth)) return auth;
	const { supabase } = auth;
	const siteId = params.id;
	if (!siteId) return redirect('/admin/sites');

	const result = await importSiteAstroLayoutFromGitHub(supabase, siteId);
	if (!result.ok) {
		return redirect(`/admin/units/${siteId}/layout?error=${result.error}`);
	}

	return redirect(`/admin/units/${siteId}/layout?imported=1`);
};
