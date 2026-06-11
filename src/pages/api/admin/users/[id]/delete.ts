import type { APIRoute } from 'astro';
import { guardAdminRedirect, isGuardBlocked } from '@/lib/api';
import { deleteUserAccount } from '@/lib/admin';

export const POST: APIRoute = async ({ params, redirect, locals }) => {
	const auth = guardAdminRedirect(locals, redirect);
	if (isGuardBlocked(auth)) return auth;
	const { supabase, user } = auth;
	const userId = params.id;
	if (!userId) return redirect('/admin/users');

	const result = await deleteUserAccount({ supabase, userId, actorId: user.id });
	if (!result.ok) return redirect(`/admin/users/${userId}?error=${result.error}`);
	return redirect('/admin/users?deleted=1');
};
