import type { SupabaseClient } from '@supabase/supabase-js';
import { isValidSlug, normalizeSlug } from '@/lib/admin/slug';
import { isValidPathPrefix, normalizePathPrefix, buildSitePagePublicPath } from './url';
import type { SitePage } from './types';

export async function listSitePages(
	supabase: SupabaseClient,
	siteId: string,
): Promise<SitePage[]> {
	const { data } = await supabase
		.from('site_pages')
		.select('*')
		.eq('site_id', siteId)
		.order('path_prefix')
		.order('slug');
	return (data ?? []) as SitePage[];
}

export async function listPublishedSitePagePaths(
	supabase: SupabaseClient,
	siteId: string,
): Promise<string[]> {
	const pages = await listSitePages(supabase, siteId);
	return pages
		.filter((p) => p.status === 'published')
		.map((p) => buildSitePagePublicPath(p.path_prefix, p.slug));
}

export async function getSitePageById(
	supabase: SupabaseClient,
	pageId: string,
): Promise<SitePage | null> {
	const { data } = await supabase.from('site_pages').select('*').eq('id', pageId).maybeSingle();
	return (data as SitePage | null) ?? null;
}

export async function createSitePage(
	supabase: SupabaseClient,
	siteId: string,
	authorId: string,
): Promise<{ ok: true; page: SitePage } | { ok: false; error: string }> {
	const { data, error } = await supabase
		.from('site_pages')
		.insert({
			site_id: siteId,
			author_id: authorId,
			title: '',
			slug: `strona-${Date.now().toString(36)}`,
			path_prefix: '',
			content_md: '',
		})
		.select('*')
		.single();

	if (error || !data) return { ok: false, error: 'create_failed' };
	return { ok: true, page: data as SitePage };
}

export type SitePageFields = {
	title: string;
	slug: string;
	path_prefix: string;
	content_md: string;
};

export function resolveSitePageFields(
	title: string,
	slugInput: string,
	pathPrefixInput: string,
	contentMd: string,
	fallbackSlug: string | null,
): { ok: true; fields: SitePageFields } | { ok: false; error: string } {
	const trimmedTitle = title.trim();
	const rawSlug = slugInput.trim() || (trimmedTitle ? normalizeSlug(trimmedTitle) : fallbackSlug ?? '');
	const slug = normalizeSlug(rawSlug);
	const path_prefix = normalizePathPrefix(pathPrefixInput);

	if (!trimmedTitle) return { ok: false, error: 'title_required' };
	if (!isValidSlug(slug)) return { ok: false, error: 'invalid_slug' };
	if (!isValidPathPrefix(path_prefix)) return { ok: false, error: 'invalid_path_prefix' };

	return {
		ok: true,
		fields: {
			title: trimmedTitle,
			slug,
			path_prefix,
			content_md: contentMd,
		},
	};
}

export async function updateSitePage(
	supabase: SupabaseClient,
	pageId: string,
	fields: SitePageFields,
): Promise<{ ok: true } | { ok: false; error: string }> {
	const { error } = await supabase
		.from('site_pages')
		.update({
			title: fields.title,
			slug: fields.slug,
			path_prefix: fields.path_prefix,
			content_md: fields.content_md,
		})
		.eq('id', pageId);

	if (error?.code === '23505') return { ok: false, error: 'duplicate_path' };
	if (error) return { ok: false, error: 'save_failed' };
	return { ok: true };
}

export async function markSitePagePublished(
	supabase: SupabaseClient,
	pageId: string,
	externalId: string,
): Promise<boolean> {
	const { error } = await supabase
		.from('site_pages')
		.update({ status: 'published', external_id: externalId })
		.eq('id', pageId);
	return !error;
}

export async function deleteSitePage(
	supabase: SupabaseClient,
	pageId: string,
): Promise<boolean> {
	const { error } = await supabase.from('site_pages').delete().eq('id', pageId);
	return !error;
}

export function slugFromPageTitle(title: string): string {
	return normalizeSlug(title);
}
