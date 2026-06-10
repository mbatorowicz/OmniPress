import type { APIRoute } from 'astro';
import { guardAdminRedirect, isGuardBlocked } from '@/lib/api';
import { parseLayoutFromFormData } from '@/lib/astro-layout/parse-form';
import {
	buildKnownNavPaths,
	validateNavigationLinks,
} from '@/lib/astro-layout/validate-nav';
import {
	loadSiteAstroLayout,
	saveSiteAstroLayout,
	syncSiteAstroLayoutToGitHub,
} from '@/lib/astro-layout/store';

const DEFAULT_STATIC_ROUTES = ['/', '/kontakt'];

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
	const auth = guardAdminRedirect(locals, redirect);
	if (isGuardBlocked(auth)) return auth;
	const { supabase } = auth;
	const siteId = params.id;
	if (!siteId) return redirect('/admin/sites');

	const existing = await loadSiteAstroLayout(supabase, siteId);
	const form = await request.formData();
	const parsed = parseLayoutFromFormData(form, {
		navigationPath: existing.navigationPath,
		categoriesPath: existing.categoriesPath,
	});

	if (!parsed.ok) {
		return redirect(`/admin/units/${siteId}/layout?error=${parsed.error}`);
	}

	const saved = await saveSiteAstroLayout(supabase, siteId, parsed.layout);
	if (!saved.ok) {
		return redirect(`/admin/units/${siteId}/layout?error=save_failed`);
	}

	const syncGitHub = form.get('sync_github') === 'on';
	if (syncGitHub) {
		const categorySlugs = parsed.layout.categories.map((c) => c.slug);
		const knownPaths = await buildKnownNavPaths(
			supabase,
			siteId,
			categorySlugs,
			DEFAULT_STATIC_ROUTES,
		);
		const navIssues = validateNavigationLinks(parsed.layout.navigation, knownPaths);
		if (navIssues.length > 0) {
			return redirect(`/admin/units/${siteId}/layout?error=dead_nav_links&saved=1`);
		}

		const synced = await syncSiteAstroLayoutToGitHub(supabase, siteId, parsed.layout);
		if (!synced.ok) {
			const params = new URLSearchParams({ error: synced.error, saved: '1' });
			if (synced.detail) params.set('sync_detail', synced.detail.slice(0, 400));
			return redirect(`/admin/units/${siteId}/layout?${params.toString()}`);
		}
		const params = new URLSearchParams({ saved: '1', synced: '1' });
		if (synced.summary) params.set('sync_summary', synced.summary.slice(0, 400));
		return redirect(`/admin/units/${siteId}/layout?${params.toString()}`);
	}

	return redirect(`/admin/units/${siteId}/layout?saved=1`);
};
