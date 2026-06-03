import type { APIRoute } from 'astro';
import { requireAdmin, updateOrganizationalUnit } from '@/lib/admin';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
	if (!requireAdmin(locals)) return redirect('/login');
	const siteId = params.id;
	if (!siteId) return redirect('/admin/sites');

	const form = await request.formData();
	const result = await updateOrganizationalUnit(locals.supabase, siteId, form);

	if (!result.ok) {
		return redirect(`/admin/units/${siteId}?error=${result.error}`);
	}
	return redirect(`/admin/units/${siteId}?saved=1`);
};
