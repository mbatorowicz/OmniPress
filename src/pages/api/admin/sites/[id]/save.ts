import type { APIRoute } from 'astro';
import { isValidSlug, normalizeSlug, requireAdmin } from '@/lib/admin';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
	if (!requireAdmin(locals)) return redirect('/login');
	const siteId = params.id;
	if (!siteId) return redirect('/admin/sites');

	const form = await request.formData();
	const name = String(form.get('name') ?? '').trim();
	const slug = normalizeSlug(String(form.get('slug') ?? ''));
	const is_active = form.get('is_active') === 'on';

	if (!name || !isValidSlug(slug)) {
		return redirect(`/admin/sites/${siteId}?error=invalid_slug`);
	}

	const { error } = await locals.supabase
		.from('sites')
		.update({ name, slug, is_active })
		.eq('id', siteId);

	if (error) return redirect(`/admin/sites/${siteId}?error=save_failed`);
	return redirect(`/admin/sites/${siteId}?saved=1`);
};
