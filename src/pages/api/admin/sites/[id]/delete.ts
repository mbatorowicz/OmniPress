import type { APIRoute } from 'astro';
import { deleteSite, requireAdmin } from '@/lib/admin';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
	if (!requireAdmin(locals)) return redirect('/login');
	const siteId = params.id;
	if (!siteId) return redirect('/admin/sites');

	const form = await request.formData();
	if (form.get('confirm') !== 'on') {
		return redirect(`/admin/sites/${siteId}?error=delete_confirm`);
	}

	const result = await deleteSite(locals.supabase, siteId);
	if (!result.ok) {
		return redirect(`/admin/sites/${siteId}?error=${result.error}`);
	}
	return redirect('/admin/sites?deleted=1');
};
