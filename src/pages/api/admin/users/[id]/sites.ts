import type { APIRoute } from 'astro';
import { guardAdminRedirect, isGuardBlocked } from '@/lib/api';
import { saveEditorSites } from '@/lib/admin';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
	const auth = guardAdminRedirect(locals, redirect);
	if (isGuardBlocked(auth)) return auth;
	const { supabase } = auth;
	const userId = params.id;
	if (!userId) return redirect('/admin/users');

	const form = await request.formData();
	const siteIds = form.getAll('site_id').map(String);
	const defaultSiteId = String(form.get('default_site_id') ?? '').trim() || null;

	const result = await saveEditorSites(supabase, userId, siteIds, defaultSiteId);
	if (!result.ok) return redirect(`/admin/users/${userId}?error=save_failed`);
	return redirect(`/admin/users/${userId}?saved=1`);
};
