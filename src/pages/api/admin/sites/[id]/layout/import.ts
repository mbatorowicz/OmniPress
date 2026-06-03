import type { APIRoute } from 'astro';
import { requireAdmin } from '@/lib/admin';
import { importSiteAstroLayoutFromGitHub } from '@/lib/astro-layout/store';

export const POST: APIRoute = async ({ params, redirect, locals }) => {
	if (!requireAdmin(locals)) return redirect('/login');
	const siteId = params.id;
	if (!siteId) return redirect('/admin/sites');

	const result = await importSiteAstroLayoutFromGitHub(locals.supabase, siteId);
	if (!result.ok) {
		return redirect(`/admin/sites/${siteId}/layout?error=${result.error}`);
	}

	return redirect(`/admin/sites/${siteId}/layout?imported=1`);
};
