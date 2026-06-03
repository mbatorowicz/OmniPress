import type { APIRoute } from 'astro';
import { createOrganizationalUnit, requireAdmin } from '@/lib/admin';

export const POST: APIRoute = async ({ request, redirect, locals }) => {
	if (!requireAdmin(locals)) return redirect('/login');

	const form = await request.formData();
	const result = await createOrganizationalUnit(locals.supabase, form);

	if (!result.ok) {
		return redirect(`/admin/units/new?error=${result.error}`);
	}
	return redirect(`/admin/sites/${result.siteId}?saved=1`);
};
