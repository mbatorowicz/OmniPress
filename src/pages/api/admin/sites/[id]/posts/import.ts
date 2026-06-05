import type { APIRoute } from 'astro';
import { requireAdmin } from '@/lib/admin';
import { importPublishedPostsFromGitHub } from '@/lib/publish/github-import';

export const POST: APIRoute = async ({ params, redirect, locals }) => {
	const auth = requireAdmin(locals);
	if (!auth) return redirect('/login');

	const siteId = params.id;
	if (!siteId) return redirect('/admin');

	const result = await importPublishedPostsFromGitHub(
		auth.supabase,
		siteId,
		auth.user.id,
	);

	if (!result.ok) {
		return redirect(`/admin?import_error=${encodeURIComponent(result.error)}&site_id=${siteId}`);
	}

	const query = new URLSearchParams({
		imported: String(result.imported),
		updated: String(result.updated),
		skipped: String(result.skipped),
		site_id: siteId,
	});
	if (result.errors.length > 0) {
		query.set('import_warnings', String(result.errors.length));
	}

	return redirect(`/admin?${query.toString()}`);
};
