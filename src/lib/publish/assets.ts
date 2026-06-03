import { resolveSupabaseUrl } from '@/lib/supabase/resolve-env';
import type { SupabaseClient } from '@supabase/supabase-js';

export type PostAsset = {
	storage_path: string;
	filename: string;
	mime_type: string;
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
		.select('storage_path, filename, mime_type')
		.eq('post_id', postId);
	return (data ?? []) as PostAsset[];
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
