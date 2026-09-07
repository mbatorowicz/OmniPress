/**
 * Sprawdzenie pliku już leżącego w Storage: czy treść zgadza się z deklarowanym
 * MIME i czy mieści się w limicie. Wgranie idzie signed URL-em prosto do Supabase,
 * więc dopiero tutaj serwer widzi, co naprawdę przyszło.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { posts } from '@/i18n';
import { MAX_FILE_ATTACHMENT_BYTES, validateMagicBytesForMime } from '@/lib/posts/upload';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const SIGNED_HEAD_TTL_SECONDS = 60;
const MAGIC_BYTES_RANGE = 'bytes=0-15';

export type UploadedFileCheck = { ok: true; size: number } | { ok: false; error: string };

/**
 * Pierwsze bajty i rozmiar świeżo wgranego pliku. Bucket jest prywatny (S-3),
 * więc adres bierzemy z krótkiego signed URL, a nie z `/object/public/…`.
 * Range zamiast `download()` — załącznik może mieć 50 MB, a magic bytes to 16.
 */
async function fetchStorageHead(
	supabase: SupabaseClient,
	path: string,
): Promise<{ size: number | null; head: Uint8Array | null }> {
	const { data, error } = await supabase.storage
		.from('post-assets')
		.createSignedUrl(path, SIGNED_HEAD_TTL_SECONDS);
	if (error || !data?.signedUrl) return { size: null, head: null };

	const res = await fetch(data.signedUrl, { headers: { Range: MAGIC_BYTES_RANGE } });
	if (!res.ok && res.status !== 206) return { size: null, head: null };

	const contentRange = res.headers.get('content-range');
	let size: number | null = null;
	if (contentRange) {
		const match = contentRange.match(/\/(\d+)\s*$/);
		if (match) size = Number(match[1]);
	}
	if (size == null) {
		const len = res.headers.get('content-length');
		if (len) size = Number(len);
	}

	return { size: size, head: new Uint8Array(await res.arrayBuffer()) };
}

export function sizeErrorForMime(mime: string, size: number): string | null {
	if (mime.startsWith('image/')) {
		return size > MAX_IMAGE_BYTES ? posts.upload.tooLarge : null;
	}
	return size > MAX_FILE_ATTACHMENT_BYTES ? posts.upload.fileTooLarge : null;
}

/** Treść i rozmiar pliku w Storage; `declaredSize` używane, gdy Storage nie poda własnego. */
export async function verifyUploadedFile(
	supabase: SupabaseClient,
	path: string,
	mime: string,
	declaredSize: number,
): Promise<UploadedFileCheck> {
	const { size, head } = await fetchStorageHead(supabase, path);
	if (!head || !validateMagicBytesForMime(head, mime)) {
		return { ok: false, error: posts.upload.invalidContent };
	}

	const effectiveSize = size ?? declaredSize;
	const sizeError = sizeErrorForMime(mime, effectiveSize);
	if (sizeError) return { ok: false, error: sizeError };

	return { ok: true, size: effectiveSize };
}
