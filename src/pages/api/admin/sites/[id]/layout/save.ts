import type { APIRoute } from 'astro';
import { requireAdmin } from '@/lib/admin';
import { parseLayoutFromFormData } from '@/lib/astro-layout/parse-form';
import {
	loadSiteAstroLayout,
	saveSiteAstroLayout,
	syncSiteAstroLayoutToGitHub,
} from '@/lib/astro-layout/store';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
	if (!requireAdmin(locals)) return redirect('/login');
	const siteId = params.id;
	if (!siteId) return redirect('/admin/sites');

	const existing = await loadSiteAstroLayout(locals.supabase, siteId);
	const form = await request.formData();
	const parsed = parseLayoutFromFormData(form, {
		navigationPath: existing.navigationPath,
		categoriesPath: existing.categoriesPath,
	});

	if (!parsed.ok) {
		return redirect(`/admin/units/${siteId}/layout?error=${parsed.error}`);
	}

	const saved = await saveSiteAstroLayout(locals.supabase, siteId, parsed.layout);
	if (!saved.ok) {
		return redirect(`/admin/units/${siteId}/layout?error=save_failed`);
	}

	const syncGitHub = form.get('sync_github') === 'on';
	if (syncGitHub) {
		const synced = await syncSiteAstroLayoutToGitHub(locals.supabase, siteId, parsed.layout);
		if (!synced.ok) {
			return redirect(`/admin/units/${siteId}/layout?error=${synced.error}&saved=1`);
		}
		return redirect(`/admin/units/${siteId}/layout?saved=1&synced=1`);
	}

	return redirect(`/admin/units/${siteId}/layout?saved=1`);
};
