import type { APIRoute } from 'astro';
import { guardAdminRedirect, isGuardBlocked } from '@/lib/api';
import {
	DEFAULT_STATIC_ROUTES,
	layoutSectionReturnPath,
} from '@/lib/admin/layout-editor-context';
import { collectNavInternalPageOptions } from '@/lib/admin/navigation-tree';
import { layoutSectionToSyncScope } from '@/lib/astro-layout/layout-sync-meta';
import { parseLayoutSection } from '@/lib/astro-layout/parse-form';
import {
	buildKnownNavPaths,
	validateNavigationLinks,
} from '@/lib/astro-layout/validate-nav';
import {
	loadSiteAstroLayout,
	saveSiteAstroLayout,
	syncSiteAstroLayoutToGitHub,
} from '@/lib/astro-layout/store';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
	const auth = guardAdminRedirect(locals, redirect);
	if (isGuardBlocked(auth)) return auth;
	const { supabase } = auth;
	const siteId = params.id;
	if (!siteId) return redirect('/admin/sites');

	const existing = await loadSiteAstroLayout(supabase, siteId);
	const form = await request.formData();
	const section = String(form.get('section') ?? 'all').trim();
	const returnSegment = layoutSectionReturnPath(section);
	const waitForVercel = form.get('wait_for_vercel') === 'on';
	const scope = layoutSectionToSyncScope(section);

	const parsed = parseLayoutSection(form, existing);

	if (!parsed.ok) {
		return redirect(`/admin/units/${siteId}/${returnSegment}?error=${parsed.error}`);
	}

	const saved = await saveSiteAstroLayout(supabase, siteId, parsed.layout);
	if (!saved.ok) {
		return redirect(`/admin/units/${siteId}/${returnSegment}?error=save_failed`);
	}

	const categorySlugs = parsed.layout.categories.map((c) => c.slug);
	const navInternalPaths = collectNavInternalPageOptions(parsed.layout.navigation).map(
		(p) => p.path,
	);
	const knownPaths = await buildKnownNavPaths(
		supabase,
		siteId,
		categorySlugs,
		[...DEFAULT_STATIC_ROUTES, ...navInternalPaths],
	);
	const navIssues = validateNavigationLinks(parsed.layout.navigation, knownPaths);
	if (navIssues.length > 0) {
		return redirect(
			`/admin/units/${siteId}/${returnSegment}?error=dead_nav_links&saved=1`,
		);
	}

	const synced = await syncSiteAstroLayoutToGitHub(supabase, siteId, parsed.layout, {
		scope,
		waitForVercel,
	});
	if (!synced.ok) {
		const query = new URLSearchParams({ error: synced.error, saved: '1' });
		if (synced.detail) query.set('sync_detail', synced.detail.slice(0, 400));
		return redirect(`/admin/units/${siteId}/${returnSegment}?${query.toString()}`);
	}

	const query = new URLSearchParams({ saved: '1', published: '1' });
	if (synced.summary) query.set('sync_summary', synced.summary.slice(0, 400));
	return redirect(`/admin/units/${siteId}/${returnSegment}?${query.toString()}`);
};
