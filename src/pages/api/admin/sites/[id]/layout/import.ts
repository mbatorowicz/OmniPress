import type { APIRoute } from 'astro';
import { guardAdminRedirect, isGuardBlocked } from '@/lib/api';
import { layoutSectionReturnPath } from '@/lib/admin/layout-editor-context';
import { importSiteAstroLayoutFromGitHub } from '@/lib/astro-layout/store';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
	const auth = guardAdminRedirect(locals, redirect);
	if (isGuardBlocked(auth)) return auth;
	const { supabase } = auth;
	const siteId = params.id;
	if (!siteId) return redirect('/admin/sites');

	const form = await request.formData();
	const section = String(form.get('return_section') ?? 'navigation').trim();
	const returnSegment = layoutSectionReturnPath(section);

	const result = await importSiteAstroLayoutFromGitHub(supabase, siteId);
	if (!result.ok) {
		return redirect(`/admin/units/${siteId}/${returnSegment}?error=${result.error}`);
	}

	return redirect(`/admin/units/${siteId}/${returnSegment}?imported=1`);
};
