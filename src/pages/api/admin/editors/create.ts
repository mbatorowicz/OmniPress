import type { APIRoute } from 'astro';
import { guardAdminRedirect, isGuardBlocked } from '@/lib/api';
import { createEditorAccount } from '@/lib/admin';

export const POST: APIRoute = async ({ request, redirect, locals }) => {
	const auth = guardAdminRedirect(locals, redirect);
	if (isGuardBlocked(auth)) return auth;
	const { supabase } = auth;

	const form = await request.formData();
	const email = String(form.get('email') ?? '').trim();
	const displayName = String(form.get('display_name') ?? '').trim();
	const password = String(form.get('password') ?? '');
	const defaultSiteId = String(form.get('default_site_id') ?? '').trim() || null;
	const siteIds = form.getAll('site_ids').map((v) => String(v).trim()).filter(Boolean);

	const result = await createEditorAccount({
		email,
		displayName,
		password,
		siteIds,
		defaultSiteId: defaultSiteId && siteIds.includes(defaultSiteId) ? defaultSiteId : siteIds[0] ?? null,
	});

	if (!result.ok) {
		return redirect(`/admin/editors?error=${result.error}`);
	}

	return redirect(`/admin/editors/${result.userId}?saved=1`);
};
