import type { APIRoute } from 'astro';
import { deactivatePost, requireAdmin } from '@/lib/admin';

export const POST: APIRoute = async ({ params, redirect, locals }) => {
	if (!requireAdmin(locals)) return redirect('/login');
	const postId = params.id;
	if (!postId) return redirect('/admin');

	const result = await deactivatePost(locals.supabase, postId);
	if (!result.ok) {
		return redirect(`/admin/posts/${postId}?error=${result.error}`);
	}

	const q = result.remoteErrors.length ? '&remote_warning=1' : '';
	return redirect(`/admin?deactivated=1${q}`);
};
