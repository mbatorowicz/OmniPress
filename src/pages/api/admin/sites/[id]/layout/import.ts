import type { APIRoute } from 'astro';
import { guardAdminRedirect, isGuardBlocked } from '@/lib/api';
import { buildLayoutEditorReturnUrl } from '@/lib/admin/layout-editor-context';
import { importSiteAstroLayoutFromGitHub } from '@/lib/astro-layout/store';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
	const auth = guardAdminRedirect(locals, redirect);
	if (isGuardBlocked(auth)) return auth;
	const { supabase } = auth;
	const siteId = params.id;
	if (!siteId) return redirect('/admin/sites');

	const form = await request.formData();
	const section = String(form.get('return_section') ?? 'navigation').trim();
	const returnUrl = buildLayoutEditorReturnUrl(siteId, section);

	const result = await importSiteAstroLayoutFromGitHub(supabase, siteId);
	if (!result.ok) {
		return redirect(`${returnUrl}?error=${result.error}`);
	}

	const query = new URLSearchParams({
		imported: '1',
		import_hrefs: String(result.report.hrefCount),
		import_path: result.report.navigationPath,
	});
	return redirect(`${returnUrl}?${query.toString()}`);
};
