import type { APIRoute } from 'astro';
import { requireAdmin, saveEditorSites } from '@/lib/admin';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
	if (!requireAdmin(locals)) return redirect('/login');
	const userId = params.id;
	if (!userId) return redirect('/admin/editors');

	const form = await request.formData();
	const siteIds = form.getAll('site_id').map(String);
	const defaultSiteId = String(form.get('default_site_id') ?? '').trim() || null;

	const result = await saveEditorSites(locals.supabase, userId, siteIds, defaultSiteId);
	if (!result.ok) return redirect(`/admin/editors/${userId}?error=save_failed`);
	return redirect(`/admin/editors/${userId}?saved=1`);
};
