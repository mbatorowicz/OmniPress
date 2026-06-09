import type { APIRoute } from 'astro';
import { requireAdmin } from '@/lib/admin';
import {
	getSitePageById,
	markSitePagePublished,
	publishSitePageToGitHub,
	resolveSitePageFields,
	updateSitePage,
} from '@/lib/site-pages';
import { sanitizeStorageMarkdown } from '@/lib/content/sanitize';

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
	if (!requireAdmin(locals)) return redirect('/login');
	const siteId = params.id;
	const pageId = params.pageId;
	if (!siteId || !pageId) return redirect('/admin/sites');

	const page = await getSitePageById(locals.supabase, pageId);
	if (!page || page.site_id !== siteId) {
		return redirect(`/admin/units/${siteId}/pages?error=not_found`);
	}

	const form = await request.formData();
	const resolved = resolveSitePageFields(
		String(form.get('title') ?? ''),
		String(form.get('slug') ?? ''),
		String(form.get('path_prefix') ?? ''),
		sanitizeStorageMarkdown(String(form.get('content_md') ?? '')),
		page.slug,
	);
	if (!resolved.ok) {
		return redirect(`/admin/units/${siteId}/pages/${pageId}?error=${resolved.error}`);
	}

	const saved = await updateSitePage(locals.supabase, pageId, resolved.fields);
	if (!saved.ok) {
		return redirect(`/admin/units/${siteId}/pages/${pageId}?error=${saved.error}`);
	}

	const toPublish = { ...page, ...resolved.fields };
	const result = await publishSitePageToGitHub(locals.supabase, toPublish);
	if (!result.ok) {
		return redirect(`/admin/units/${siteId}/pages/${pageId}?error=${result.error}`);
	}

	await markSitePagePublished(locals.supabase, pageId, result.externalId);
	return redirect(`/admin/units/${siteId}/pages/${pageId}?published=1`);
};
