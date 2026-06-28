import type { APIRoute } from 'astro';
import { guardAdminRedirect, isGuardBlocked } from '@/lib/api';
import { layoutSectionReturnPath } from '@/lib/admin/layout-editor-context';
import { parseLayoutSection } from '@/lib/astro-layout/parse-form';
import { countNavigationHrefs } from '@/lib/astro-layout/validate-nav';
import { loadSiteAstroLayout, saveSiteAstroLayout } from '@/lib/astro-layout/store';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
	const auth = guardAdminRedirect(locals, redirect);
	if (isGuardBlocked(auth)) return auth;
	const { supabase } = auth;
	const siteId = params.id;
	if (!siteId) return redirect('/admin/sites');

	const existing = await loadSiteAstroLayout(supabase, siteId);
	const form = await request.formData();
	const section = String(form.get('section') ?? 'all').trim();
	const returnTab = String(form.get('return_tab') ?? '').trim() || null;
	const returnContext = String(form.get('return_context') ?? '').trim() || null;
	const returnSegment = layoutSectionReturnPath(section, returnTab, returnContext);

	const parsed = parseLayoutSection(form, existing);

	if (!parsed.ok) {
		return redirect(`/admin/units/${siteId}/${returnSegment}?error=${parsed.error}`);
	}

	if (section === 'navigation' || section === 'all' || section === 'layout') {
		const existingHrefs = countNavigationHrefs(existing.navigation);
		const newHrefs = countNavigationHrefs(parsed.layout.navigation);
		if (existingHrefs > 0 && newHrefs === 0) {
			return redirect(`/admin/units/${siteId}/${returnSegment}?error=navigation_hrefs_lost`);
		}
	}

	const saved = await saveSiteAstroLayout(supabase, siteId, parsed.layout);
	if (!saved.ok) {
		return redirect(`/admin/units/${siteId}/${returnSegment}?error=save_failed`);
	}

	return redirect(`/admin/units/${siteId}/${returnSegment}?saved=1`);
};
