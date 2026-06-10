import type { APIRoute } from 'astro';
import { guardAdminRedirect, isGuardBlocked } from '@/lib/api';
import { createOrganizationalUnit } from '@/lib/admin';

export const POST: APIRoute = async ({ request, redirect, locals }) => {
	const auth = guardAdminRedirect(locals, redirect);
	if (isGuardBlocked(auth)) return auth;
	const { supabase } = auth;

	const form = await request.formData();
	const result = await createOrganizationalUnit(supabase, form);

	if (!result.ok) {
		return redirect(`/admin/units/new?error=${result.error}`);
	}
	return redirect(`/admin/units/${result.siteId}?saved=1`);
};
