/**
 * Kształt załącznika w publikacji i kodowanie treści pod GitHub API.
 * Bez bazy — operacje na `assets` są w `@/lib/publish/assets`.
 */
import { resolveSupabaseUrl } from '@/lib/supabase/resolve-env';

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

export function bytesToBase64(bytes: ArrayBuffer): string {
	const u8 = new Uint8Array(bytes);
	let binary = '';
	for (const b of u8) binary += String.fromCharCode(b);
	return btoa(binary);
}

export function textToBase64(text: string): string {
	return bytesToBase64(new TextEncoder().encode(text).buffer);
}
