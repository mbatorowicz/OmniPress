import type { APIRoute } from 'astro';
import { deleteDestination, requireAdmin } from '@/lib/admin';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
	if (!requireAdmin(locals)) return redirect('/login');
	const destId = params.id;
	if (!destId) return redirect('/admin/destinations');

	const form = await request.formData();
	if (form.get('confirm') !== 'on') {
		return redirect(`/admin/destinations/${destId}?error=delete_confirm`);
	}

	const result = await deleteDestination(locals.supabase, destId);
	if (!result.ok) {
		return redirect(`/admin/destinations/${destId}?error=${result.error}`);
	}
	return redirect('/admin/destinations?deleted=1');
};
