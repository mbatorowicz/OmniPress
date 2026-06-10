import type { APIRoute } from 'astro';
import { guardAdminRedirect, isGuardBlocked } from '@/lib/api';
import { deleteSite } from '@/lib/admin';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
	const auth = guardAdminRedirect(locals, redirect);
	if (isGuardBlocked(auth)) return auth;
	const { supabase } = auth;
	const siteId = params.id;
	if (!siteId) return redirect('/admin/sites');

	const form = await request.formData();
	if (form.get('confirm') !== 'on') {
		return redirect(`/admin/units/${siteId}?error=delete_confirm`);
	}

	const result = await deleteSite(supabase, siteId);
	if (!result.ok) {
		return redirect(`/admin/units/${siteId}?error=${result.error}`);
	}
	return redirect('/admin/sites?deleted=1');
};
