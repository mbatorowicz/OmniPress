import type { APIRoute } from 'astro';
import { guardAdminRedirect, isGuardBlocked } from '@/lib/api';
import { parseUserRole, updateUserAccount } from '@/lib/admin';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
	const auth = guardAdminRedirect(locals, redirect);
	if (isGuardBlocked(auth)) return auth;
	const { supabase } = auth;
	const userId = params.id;
	if (!userId) return redirect('/admin/users');

	const form = await request.formData();
	const displayName = String(form.get('display_name') ?? '').trim();
	const password = String(form.get('password') ?? '');
	const role = parseUserRole(String(form.get('role') ?? ''));

	if (!role) return redirect(`/admin/users/${userId}?error=invalid_role`);

	const result = await updateUserAccount({ supabase, userId, displayName, role, password });
	if (!result.ok) return redirect(`/admin/users/${userId}?error=${result.error}`);
	return redirect(`/admin/users/${userId}?saved=1`);
};
