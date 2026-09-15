import type { SupabaseClient } from '@supabase/supabase-js';
import { parseAssetDisplayModes, parseDocxOrder, parseFileOrder, parsePdfOrder } from '@/lib/posts/asset-model';
import { editorialPageContent } from './content';
import { loadPageAssets, updatePageAssetDisplayModes, updatePageFileAttachmentOrders } from './assets';
import { resolveSitePageFields, type SitePageFields } from './access';
import type { SitePage } from './types';

export async function savePageAttachmentFields(
	supabase: SupabaseClient,
	pageId: string,
	form: FormData,
): Promise<void> {
	await updatePageAssetDisplayModes(supabase, pageId, parseAssetDisplayModes(form));
	await updatePageFileAttachmentOrders(
		supabase,
		pageId,
		parsePdfOrder(form),
		parseDocxOrder(form),
		parseFileOrder(form),
	);
}

export async function resolvePageFormFields(
	supabase: SupabaseClient,
	page: SitePage,
	form: FormData,
): Promise<{ ok: true; fields: SitePageFields } | { ok: false; error: string }> {
	await savePageAttachmentFields(supabase, page.id, form);
	const assets = await loadPageAssets(supabase, page.id);
	return resolveSitePageFields(
		String(form.get('title') ?? ''),
		String(form.get('slug') ?? ''),
		String(form.get('path_prefix') ?? ''),
		editorialPageContent(String(form.get('content_md') ?? ''), assets.length > 0),
		page.slug,
	);
}
