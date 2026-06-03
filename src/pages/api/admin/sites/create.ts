import type { APIRoute } from 'astro';
import { isValidSlug, normalizeSlug, requireAdmin } from '@/lib/admin';

export const POST: APIRoute = async ({ request, redirect, locals }) => {
	if (!requireAdmin(locals)) return redirect('/login');

	const form = await request.formData();
	const name = String(form.get('name') ?? '').trim();
	const slug = normalizeSlug(String(form.get('slug') ?? name));
	const is_active = form.get('is_active') === 'on';

	if (!name || !isValidSlug(slug)) {
		return redirect('/admin/sites/new?error=invalid_slug');
	}

	const { data, error } = await locals.supabase
		.from('sites')
		.insert({ name, slug, is_active })
		.select('id')
		.single();

	if (error || !data) return redirect('/admin/sites/new?error=save_failed');
	return redirect(`/admin/sites/${data.id}`);
};
