import type { APIRoute } from 'astro';
import { guardAdminRedirect, isGuardBlocked } from '@/lib/api';
import { deleteSitePage, getSitePageById, withdrawSitePageFromGitHub } from '@/lib/site-pages';

export const POST: APIRoute = async ({ params, redirect, locals }) => {
	const auth = guardAdminRedirect(locals, redirect);
	if (isGuardBlocked(auth)) return auth;
	const { supabase } = auth;
	const siteId = params.id;
	const pageId = params.pageId;
	if (!siteId || !pageId) return redirect('/admin/sites');

	const page = await getSitePageById(supabase, pageId);
	if (!page || page.site_id !== siteId) {
		return redirect(`/admin/units/${siteId}/pages?error=not_found`);
	}

	if (page.status === 'published' && page.external_id) {
		const withdrawn = await withdrawSitePageFromGitHub(supabase, page);
		if (!withdrawn.ok) {
			return redirect(`/admin/units/${siteId}/pages/${pageId}?error=${withdrawn.error}`);
		}
	}

	const deleted = await deleteSitePage(supabase, pageId);
	if (!deleted) {
		return redirect(`/admin/units/${siteId}/pages/${pageId}?error=delete_failed`);
	}

	return redirect(`/admin/units/${siteId}/pages?deleted=1`);
};
