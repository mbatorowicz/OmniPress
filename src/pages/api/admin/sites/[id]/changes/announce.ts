import type { APIRoute } from 'astro';
import { requireAdmin } from '@/lib/admin';
import { parseAnnounceForm } from '@/lib/recent-changes/parse-form';
import { announceRecentChangeOnGitHub } from '@/lib/recent-changes/store';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
	if (!requireAdmin(locals)) return redirect('/login');
	const siteId = params.id;
	if (!siteId) return redirect('/admin/sites');

	const form = await request.formData();
	const parsed = parseAnnounceForm(form);
	if (!parsed.ok) {
		return redirect(`/admin/sites/${siteId}/changes?error=${parsed.error}`);
	}

	const result = await announceRecentChangeOnGitHub(locals.supabase, siteId, parsed.entry);
	if (!result.ok) {
		return redirect(`/admin/sites/${siteId}/changes?error=${result.error}`);
	}

	return redirect(`/admin/sites/${siteId}/changes?saved=1`);
};
