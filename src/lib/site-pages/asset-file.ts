import type { SupabaseClient } from '@supabase/supabase-js';

export type ServePageAssetResult =
	| { ok: true; body: ArrayBuffer; mimeType: string; filename: string }
	| { ok: false; status: 403 | 404 | 500 };

export async function servePageAssetFile(
	supabase: SupabaseClient,
	siteId: string,
	pageId: string,
	assetId: string,
): Promise<ServePageAssetResult> {
	const { data: page } = await supabase
		.from('site_pages')
		.select('id, site_id')
		.eq('id', pageId)
		.maybeSingle();
	if (!page || page.site_id !== siteId) return { ok: false, status: 404 };

	const { data: asset } = await supabase
		.from('assets')
		.select('id, storage_path, filename, mime_type')
		.eq('id', assetId)
		.eq('page_id', pageId)
		.maybeSingle();
	if (!asset) return { ok: false, status: 404 };

	const { data, error } = await supabase.storage.from('post-assets').download(asset.storage_path);
	if (error || !data) return { ok: false, status: 500 };

	return {
		ok: true,
		body: await data.arrayBuffer(),
		mimeType: asset.mime_type,
		filename: asset.filename,
	};
}
