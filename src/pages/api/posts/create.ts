import type { APIRoute } from 'astro';
import { guardAuthRedirect, isGuardBlocked } from '@/lib/api';
import { getUserSites } from '@/lib/auth';
import { loadAllowedSites, resolveSiteIdForNewPost } from '@/lib/posts';

export const POST: APIRoute = async ({ request, redirect, locals }) => {
	const auth = guardAuthRedirect(locals, redirect);
	if (isGuardBlocked(auth)) return auth;
	const { user, profile, supabase } = auth;

	const form = await request.formData();
	const siteId = String(form.get('site_id') ?? '').trim() || null;

	const userSites = await getUserSites(supabase, user.id);
	const allowed = await loadAllowedSites(supabase, profile, userSites);
	const resolvedSiteId = resolveSiteIdForNewPost(profile, allowed, siteId);

	if (!resolvedSiteId) {
		return redirect('/dashboard?error=no_site');
	}

	const { data, error } = await supabase
		.from('posts')
		.insert({
			author_id: user.id,
			site_id: resolvedSiteId,
			title: '',
			content_md: '',
			status: 'draft',
		})
		.select('id')
		.single();

	if (error || !data) {
		console.error('create post:', error?.message);
		return redirect('/dashboard?error=create_failed');
	}

	return redirect(`/dashboard/posts/${data.id}`);
};
