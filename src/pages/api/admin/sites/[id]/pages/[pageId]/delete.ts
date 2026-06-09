import type { APIRoute } from 'astro';
import { requireAdmin } from '@/lib/admin';
import { deleteSitePage, getSitePageById, withdrawSitePageFromGitHub } from '@/lib/site-pages';

export const POST: APIRoute = async ({ params, redirect, locals }) => {
	if (!requireAdmin(locals)) return redirect('/login');
	const siteId = params.id;
	const pageId = params.pageId;
	if (!siteId || !pageId) return redirect('/admin/sites');

	const page = await getSitePageById(locals.supabase, pageId);
	if (!page || page.site_id !== siteId) {
		return redirect(`/admin/units/${siteId}/pages?error=not_found`);
	}

	if (page.status === 'published' && page.external_id) {
		const withdrawn = await withdrawSitePageFromGitHub(locals.supabase, page);
		if (!withdrawn.ok) {
			return redirect(`/admin/units/${siteId}/pages/${pageId}?error=${withdrawn.error}`);
		}
	}

	const deleted = await deleteSitePage(locals.supabase, pageId);
	if (!deleted) {
		return redirect(`/admin/units/${siteId}/pages/${pageId}?error=delete_failed`);
	}

	return redirect(`/admin/units/${siteId}/pages?deleted=1`);
};
