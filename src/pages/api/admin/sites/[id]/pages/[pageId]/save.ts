import type { APIRoute } from 'astro';
import { guardAdminRedirect, isGuardBlocked } from '@/lib/api';
import { getSitePageById, updateSitePage } from '@/lib/site-pages';
import { resolvePageFormFields } from '@/lib/site-pages/save-attachments';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
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

	const resolved = await resolvePageFormFields(supabase, page, await request.formData());
	if (!resolved.ok) {
		return redirect(`/admin/units/${siteId}/pages/${pageId}?error=${resolved.error}`);
	}

	const saved = await updateSitePage(supabase, pageId, resolved.fields);
	if (!saved.ok) {
		return redirect(`/admin/units/${siteId}/pages/${pageId}?error=${saved.error}`);
	}

	return redirect(`/admin/units/${siteId}/pages/${pageId}?saved=1`);
};
