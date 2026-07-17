import { resolveSupabaseUrl } from '@/lib/supabase/resolve-env';
import type { SupabaseClient } from '@supabase/supabase-js';

export type PostAsset = {
	id?: string;
	storage_path: string;
	filename: string;
	mime_type: string;
	display_mode?: 'link' | 'embed';
	sort_order?: number;
	/** SHA-1 bloba Gita — pomija ponowny upload przy zgodności z GitHub. */
	content_sha?: string | null;
};

export function publicAssetUrl(storagePath: string): string | null {
	const url = resolveSupabaseUrl();
	if (!url) return null;
	return `${url.replace(/\/$/, '')}/storage/v1/object/public/post-assets/${storagePath}`;
}

export async function loadPostAssets(
	supabase: SupabaseClient,
	postId: string,
): Promise<PostAsset[]> {
	const { data } = await supabase
		.from('assets')
		.select('id, storage_path, filename, mime_type, display_mode, sort_order, content_sha')
		.eq('post_id', postId)
		.order('sort_order', { ascending: true })
		.order('created_at', { ascending: true });
	return (data ?? []).map((row) => ({
		...row,
		display_mode: row.display_mode === 'embed' ? 'embed' : 'link',
		sort_order: row.sort_order ?? 0,
		content_sha: typeof row.content_sha === 'string' ? row.content_sha : null,
	})) as PostAsset[];
}

export async function updateAssetContentSha(
	supabase: SupabaseClient,
	assetId: string | undefined,
	contentSha: string,
): Promise<void> {
	if (!assetId || !contentSha) return;
	await supabase.from('assets').update({ content_sha: contentSha }).eq('id', assetId);
}

export function bytesToBase64(bytes: ArrayBuffer): string {
	const u8 = new Uint8Array(bytes);
	let binary = '';
	for (const b of u8) binary += String.fromCharCode(b);
	return btoa(binary);
}

export function textToBase64(text: string): string {
	return bytesToBase64(new TextEncoder().encode(text).buffer);
}
