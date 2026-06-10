import type { APIRoute } from 'astro';
import { guardAdminRedirect, isGuardBlocked } from '@/lib/api';
import { parseAnnounceForm } from '@/lib/recent-changes/parse-form';
import { announceRecentChangeOnGitHub } from '@/lib/recent-changes/store';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
	const auth = guardAdminRedirect(locals, redirect);
	if (isGuardBlocked(auth)) return auth;
	const { supabase } = auth;
	const siteId = params.id;
	if (!siteId) return redirect('/admin/sites');

	const form = await request.formData();
	const parsed = parseAnnounceForm(form);
	if (!parsed.ok) {
		return redirect(`/admin/units/${siteId}/changes?error=${parsed.error}`);
	}

	const result = await announceRecentChangeOnGitHub(supabase, siteId, parsed.entry);
	if (!result.ok) {
		return redirect(`/admin/units/${siteId}/changes?error=${result.error}`);
	}

	return redirect(`/admin/units/${siteId}/changes?saved=1`);
};
