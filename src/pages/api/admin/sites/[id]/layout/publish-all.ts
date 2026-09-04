import type { APIRoute } from 'astro';
import { guardAdminRedirect, isGuardBlocked } from '@/lib/api';
import { buildLayoutEditorReturnUrl } from '@/lib/admin/layout-editor-context';
import { hasMissingHrefIssues } from '@/lib/astro-layout/validate-nav';
import { validateLayoutPublicLinks } from '@/lib/astro-layout/validate-layout-links';
import { buildKnownNavPaths } from '@/lib/astro-layout/nav-known-paths';
import { loadSiteAstroLayout, syncSiteAstroLayoutToGitHub } from '@/lib/astro-layout/store';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
	const auth = guardAdminRedirect(locals, redirect);
	if (isGuardBlocked(auth)) return auth;
	const { supabase } = auth;
	const siteId = params.id;
	if (!siteId) return redirect('/admin/sites');

	const form = await request.formData();
	const section = String(form.get('return_section') ?? 'header').trim();
	const returnUrl = buildLayoutEditorReturnUrl(siteId, section);

	const layout = await loadSiteAstroLayout(supabase, siteId);

	const categorySlugs = layout.categories.map((c) => c.slug);
	const knownPaths = await buildKnownNavPaths(supabase, siteId, categorySlugs);
	const navIssues = validateLayoutPublicLinks(layout, knownPaths);
	if (navIssues.length > 0) {
		const errorCode = hasMissingHrefIssues(navIssues) ? 'missing_nav_hrefs' : 'dead_nav_links';
		return redirect(`${returnUrl}?error=${errorCode}`);
	}

	const synced = await syncSiteAstroLayoutToGitHub(supabase, siteId, layout, {
		scope: 'all',
	});
	if (!synced.ok) {
		const query = new URLSearchParams({ error: synced.error });
		if (synced.detail) query.set('sync_detail', synced.detail.slice(0, 120));
		return redirect(`${returnUrl}?${query.toString()}`);
	}

	const query = new URLSearchParams();
	if (synced.skipped) {
		query.set('publish_skipped', '1');
	} else {
		query.set('published', '1');
	}
	if (synced.summary) query.set('sync_summary', synced.summary.slice(0, 120));
	return redirect(`${returnUrl}?${query.toString()}`);
};
