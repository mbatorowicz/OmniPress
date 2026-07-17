import type { APIRoute } from 'astro';
import { guardAdminRedirect, isGuardBlocked } from '@/lib/api';
import {
	bulkApprovePosts,
	bulkCancelScheduledPosts,
	bulkDeactivatePosts,
	bulkDeletePosts,
	bulkRejectPosts,
} from '@/lib/admin';

function adminBulkRedirect(
	redirect: (path: string) => Response,
	hash: string,
	params: URLSearchParams,
): Response {
	const qs = params.toString();
	return redirect(`/admin?${qs}${hash ? `#${hash}` : ''}`);
}

export const POST: APIRoute = async ({ request, redirect, locals }) => {
	const auth = guardAdminRedirect(locals, redirect);
	if (isGuardBlocked(auth)) return auth;
	const { supabase } = auth;

	const form = await request.formData();
	const action = String(form.get('action') ?? '');
	const section = String(form.get('section') ?? '');
	const postIds = form.getAll('post_id').map(String).filter(Boolean);
	const hash =
		section === 'pending' || section === 'scheduled' || section === 'published' ? section : '';

	if (action === 'approve') {
		const result = await bulkApprovePosts(supabase, postIds);
		if (!result.ok) {
			return adminBulkRedirect(redirect, hash, new URLSearchParams({ error: result.error }));
		}
		const params = new URLSearchParams({ bulk_approved: String(result.processed) });
		if (result.skipped > 0) params.set('bulk_skipped', String(result.skipped));
		return adminBulkRedirect(redirect, hash || 'pending', params);
	}

	if (action === 'reject') {
		const note = String(form.get('rejection_note') ?? '');
		const result = await bulkRejectPosts(supabase, postIds, note);
		if (!result.ok) {
			return adminBulkRedirect(redirect, hash, new URLSearchParams({ error: result.error }));
		}
		const params = new URLSearchParams({ bulk_rejected: String(result.processed) });
		if (result.skipped > 0) params.set('bulk_skipped', String(result.skipped));
		return adminBulkRedirect(redirect, hash || 'pending', params);
	}

	if (action === 'cancel_schedule') {
		const result = await bulkCancelScheduledPosts(supabase, postIds);
		if (!result.ok) {
			return adminBulkRedirect(redirect, hash, new URLSearchParams({ error: result.error }));
		}
		const params = new URLSearchParams({ bulk_cancelled: String(result.processed) });
		if (result.skipped > 0) params.set('bulk_skipped', String(result.skipped));
		return adminBulkRedirect(redirect, hash || 'scheduled', params);
	}

	if (action === 'deactivate') {
		const result = await bulkDeactivatePosts(supabase, postIds);
		if (!result.ok) {
			const params = new URLSearchParams({ error: result.error });
			if (result.remoteErrors?.[0]) {
				params.set('remote_detail', result.remoteErrors[0].slice(0, 240));
			}
			return adminBulkRedirect(redirect, hash, params);
		}
		const params = new URLSearchParams({
			bulk_deactivated: String(result.processed),
		});
		if (result.skipped > 0) params.set('bulk_skipped', String(result.skipped));
		if (result.remoteErrors.length) params.set('remote_warning', '1');
		return adminBulkRedirect(redirect, hash || 'published', params);
	}

	if (action === 'delete') {
		const result = await bulkDeletePosts(supabase, postIds);
		if (!result.ok) {
			const params = new URLSearchParams({ error: result.error });
			if (result.remoteErrors?.[0]) {
				params.set('remote_detail', result.remoteErrors[0].slice(0, 240));
			}
			return adminBulkRedirect(redirect, hash, params);
		}
		const params = new URLSearchParams({
			bulk_deleted: String(result.processed),
		});
		if (result.skipped > 0) params.set('bulk_skipped', String(result.skipped));
		if (result.remoteErrors.length) params.set('remote_warning', '1');
		return adminBulkRedirect(redirect, hash || 'published', params);
	}

	return redirect('/admin?error=invalid_action');
};
