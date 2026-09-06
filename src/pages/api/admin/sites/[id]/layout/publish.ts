import type { APIRoute } from 'astro';
import { guardAdminRedirect, isGuardBlocked } from '@/lib/api';
import { layoutSectionReturnPath } from '@/lib/admin/layout-editor-context';
import { resolveLayoutBaseForSectionSave } from '@/lib/admin/layout-section-save-base';
import { layoutSectionToSyncScope } from '@/lib/astro-layout/layout-sync-meta';
import { parseLayoutSection } from '@/lib/astro-layout/parse-form';
import { hasMissingHrefIssues } from '@/lib/astro-layout/validate-nav';
import {
	blockingLayoutLinkIssues,
	validateLayoutPublicLinks,
} from '@/lib/astro-layout/validate-layout-links';
import { buildKnownNavPaths } from '@/lib/astro-layout/nav-known-paths';
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

	const stored = await loadSiteAstroLayout(supabase, siteId);
	const form = await request.formData();
	const section = String(form.get('section') ?? 'all').trim();
	const returnTab = String(form.get('return_tab') ?? '').trim() || null;
	const returnContext = String(form.get('return_context') ?? '').trim() || null;
	const returnSegment = layoutSectionReturnPath(section, returnTab, returnContext);
	const scope = layoutSectionToSyncScope(section);
	const base = await resolveLayoutBaseForSectionSave(supabase, siteId, stored, section);
	if (!base.ok) {
		return redirect(`/admin/units/${siteId}/${returnSegment}?error=${base.error}`);
	}
	const existing = base.layout;

	const parsed = parseLayoutSection(form, existing);

	if (!parsed.ok) {
		return redirect(`/admin/units/${siteId}/${returnSegment}?error=${parsed.error}`);
	}

	const saved = await saveSiteAstroLayout(supabase, siteId, parsed.layout);
	if (!saved.ok) {
		return redirect(`/admin/units/${siteId}/${returnSegment}?error=save_failed`);
	}

	const categorySlugs = parsed.layout.categories.map((c) => c.slug);
	const knownPaths = await buildKnownNavPaths(supabase, siteId, categorySlugs);
	const afterIssues = validateLayoutPublicLinks(parsed.layout, knownPaths);
	const beforeIssues = validateLayoutPublicLinks(existing, knownPaths);
	const navIssues = blockingLayoutLinkIssues(section, beforeIssues, afterIssues);
	if (navIssues.length > 0) {
		const errorCode = hasMissingHrefIssues(navIssues) ? 'missing_nav_hrefs' : 'dead_nav_links';
		return redirect(
			`/admin/units/${siteId}/${returnSegment}?error=${errorCode}&saved=1`,
		);
	}

	const synced = await syncSiteAstroLayoutToGitHub(supabase, siteId, parsed.layout, {
		scope,
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
