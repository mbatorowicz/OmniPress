import type { APIRoute } from 'astro';
import { reopenPostForEditing, requireAdmin } from '@/lib/admin';

export const POST: APIRoute = async ({ params, redirect, locals }) => {
	if (!requireAdmin(locals)) return redirect('/login');
	const postId = params.id;
	if (!postId) return redirect('/admin');

	const result = await reopenPostForEditing(locals.supabase, postId);
	if (!result.ok) {
		return redirect(`/admin/posts/${postId}?error=${result.error}`);
	}

	return redirect(`/admin/posts/${postId}?reopened=1`);
};
