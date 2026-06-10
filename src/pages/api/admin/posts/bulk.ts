import type { APIRoute } from 'astro';
import { guardAdminRedirect, isGuardBlocked } from '@/lib/api';
import { bulkDeactivatePosts, bulkDeletePosts } from '@/lib/admin';

export const POST: APIRoute = async ({ request, redirect, locals }) => {
	const auth = guardAdminRedirect(locals, redirect);
	if (isGuardBlocked(auth)) return auth;
	const { supabase } = auth;

	const form = await request.formData();
	const action = String(form.get('action') ?? '');
	const postIds = form.getAll('post_id').map(String).filter(Boolean);

	if (action === 'deactivate') {
		const result = await bulkDeactivatePosts(supabase, postIds);
		if (!result.ok) {
			const params = new URLSearchParams({ error: result.error });
			if (result.remoteErrors?.[0]) {
				params.set('remote_detail', result.remoteErrors[0].slice(0, 240));
			}
			return redirect(`/admin?${params.toString()}`);
		}
		const params = new URLSearchParams({
			bulk_deactivated: String(result.processed),
		});
		if (result.skipped > 0) params.set('bulk_skipped', String(result.skipped));
		if (result.remoteErrors.length) params.set('remote_warning', '1');
		return redirect(`/admin?${params.toString()}`);
	}

	if (action === 'delete') {
		const result = await bulkDeletePosts(supabase, postIds);
		if (!result.ok) {
			const params = new URLSearchParams({ error: result.error });
			if (result.remoteErrors?.[0]) {
				params.set('remote_detail', result.remoteErrors[0].slice(0, 240));
			}
			return redirect(`/admin?${params.toString()}`);
		}
		const params = new URLSearchParams({
			bulk_deleted: String(result.processed),
		});
		if (result.skipped > 0) params.set('bulk_skipped', String(result.skipped));
		if (result.remoteErrors.length) params.set('remote_warning', '1');
		return redirect(`/admin?${params.toString()}`);
	}

	return redirect('/admin?error=invalid_action');
};
