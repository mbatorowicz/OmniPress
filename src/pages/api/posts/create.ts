import type { APIRoute } from 'astro';
import { collectAllowedSites, resolveSiteIdForNewPost } from '@/lib/posts';
import { getUserSites } from '@/lib/auth';

export const POST: APIRoute = async ({ request, cookies, redirect, locals }) => {
	const profile = locals.profile;
	const user = locals.user;
	if (!profile || !user) {
		return redirect('/login');
	}

	const form = await request.formData();
	const siteId = String(form.get('site_id') ?? '').trim() || null;

	const userSites = await getUserSites(locals.supabase, user.id);
	const allowed = collectAllowedSites(profile, userSites);
	const resolvedSiteId = resolveSiteIdForNewPost(profile, allowed, siteId);

	if (!resolvedSiteId) {
		return redirect('/dashboard?error=no_site');
	}

	const { data, error } = await locals.supabase
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
		return redirect('/dashboard?error=create_failed');
	}

	return redirect(`/dashboard/posts/${data.id}`);
};
