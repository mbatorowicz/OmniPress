import type { APIRoute } from 'astro';
import { guardAdminRedirect, isGuardBlocked } from '@/lib/api';
import { createUserAccount, parseUserRole } from '@/lib/admin';

export const POST: APIRoute = async ({ request, redirect, locals }) => {
	const auth = guardAdminRedirect(locals, redirect);
	if (isGuardBlocked(auth)) return auth;

	const form = await request.formData();
	const email = String(form.get('email') ?? '').trim();
	const displayName = String(form.get('display_name') ?? '').trim();
	const password = String(form.get('password') ?? '');
	const role = parseUserRole(String(form.get('role') ?? ''));
	const defaultSiteId = String(form.get('default_site_id') ?? '').trim() || null;
	const siteIds = form
		.getAll('site_ids')
		.map((v) => String(v).trim())
		.filter(Boolean);

	if (!role) return redirect('/admin/users?error=invalid_role');

	const result = await createUserAccount({
		email,
		displayName,
		password,
		role,
		siteIds,
		defaultSiteId:
			defaultSiteId && siteIds.includes(defaultSiteId) ? defaultSiteId : (siteIds[0] ?? null),
	});

	if (!result.ok) {
		return redirect(`/admin/users?error=${result.error}`);
	}

	return redirect(`/admin/users/${result.userId}?saved=1`);
};
