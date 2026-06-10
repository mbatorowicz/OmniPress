import type { APIRoute } from 'astro';
import { guardAdminRedirect, isGuardBlocked } from '@/lib/api';
import { seedNavSitePages } from '@/lib/site-pages/seed-nav';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
	const auth = guardAdminRedirect(locals, redirect);
	if (isGuardBlocked(auth)) return auth;
	const { supabase } = auth;
	const siteId = params.id;
	if (!siteId) return redirect('/admin/sites');

	const user = locals.user;
	if (!user) return redirect('/login');

	const dbOnly = new URL(request.url).searchParams.get('db_only') === '1';

	const result = await seedNavSitePages(supabase, siteId, user.id, {
		publishToGitHub: !dbOnly,
		syncLayout: !dbOnly,
	});

	if (result.githubFailed.length > 0) {
		const code = result.githubFailed.some((line) => line.includes('no_github_token'))
			? 'no_github_token'
			: 'publish_failed';
		return redirect(
			`/admin/units/${siteId}/pages?error=${code}&seeded=${result.created + result.published}`,
		);
	}

	const parts = [`seeded=${result.created}`, `published=${result.published}`];
	if (result.layoutSynced) parts.push('layout_synced=1');
	return redirect(`/admin/units/${siteId}/pages?${parts.join('&')}`);
};
