import type { APIRoute } from 'astro';
import { requireAdmin, syncSiteDestinations } from '@/lib/admin';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
	if (!requireAdmin(locals)) return redirect('/login');
	const siteId = params.id;
	if (!siteId) return redirect('/admin/sites');

	const form = await request.formData();
	const selected = form.getAll('destination_id').map(String);
	const defaultId = String(form.get('default_destination_id') ?? '');

	const links = selected.map((destination_id) => ({
		destination_id,
		is_default: destination_id === defaultId,
	}));

	const result = await syncSiteDestinations(locals.supabase, siteId, links);
	if (!result.ok) return redirect(`/admin/sites/${siteId}/destinations?error=save_failed`);
	return redirect(`/admin/sites/${siteId}/destinations?saved=1`);
};
