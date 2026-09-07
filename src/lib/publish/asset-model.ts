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

/**
 * Adres pliku dla panelu i podglądu — proxy z kontrolą dostępu
 * (`servePostAssetFile` + `canViewPostAssets`). Od S-3 bucket jest prywatny,
 * więc to jedyny adres, spod którego załącznik da się pobrać przed publikacją.
 */
export function assetFileUrl(asset: Pick<PostAsset, 'id' | 'storage_path'>): string | null {
	const postId = postIdFromStoragePath(asset.storage_path);
	if (!postId || !asset.id) return null;
	return assetFileUrlFor(postId, asset.id);
}

export function assetFileUrlFor(postId: string, assetId: string): string {
	return `/api/posts/${postId}/assets/${assetId}/file`;
}

/** Ścieżka w Storage to `${postId}/${uuid}.ext` — id wpisu jest pierwszym segmentem. */
export function postIdFromStoragePath(storagePath: string): string | null {
	const [postId] = storagePath.split('/');
	return postId ? postId : null;
}

/**
 * Adres sprzed S-3 — bucket nie jest już publiczny, więc **nie serwuje pliku**.
 * Zostaje wyłącznie jako klucz: treści zapisane wcześniej mają ten URL w markdownie
 * i publikacja musi je rozpoznać. Do pobrania bajtów służy klient Storage.
 */
export function legacyPublicAssetUrl(storagePath: string): string | null {
	const url = resolveSupabaseUrl();
	if (!url) return null;
	return `${url.replace(/\/$/, '')}/storage/v1/object/public/post-assets/${storagePath}`;
}

/** Adresy, pod którymi asset może występować w markdownie wpisu (nowy proxy + legacy). */
export function assetUrlKeys(asset: Pick<PostAsset, 'id' | 'storage_path'>): string[] {
	return [assetFileUrl(asset), legacyPublicAssetUrl(asset.storage_path)].filter(
		(url): url is string => Boolean(url),
	);
}

/** Ścieżka w repo Astro, jeśli asset już poszedł na GitHub; inaczej adres panelu. */
export function resolveAssetUrl(
	asset: Pick<PostAsset, 'id' | 'storage_path'>,
	urlMap: Map<string, string>,
): string | null {
	const keys = assetUrlKeys(asset);
	for (const key of keys) {
		const published = urlMap.get(key);
		if (published) return published;
	}
	return keys[0] ?? null;
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
