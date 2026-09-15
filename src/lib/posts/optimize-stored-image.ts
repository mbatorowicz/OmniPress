import type { SupabaseClient } from '@supabase/supabase-js';
import { extensionForMime } from '@/lib/posts/upload-markdown';
import { optimizeImage } from './optimize-image';
import { replaceStorageExtension, shouldOptimizeImage } from './optimize-image-model';

export type StoredImageLocation = { path: string; mime: string };

/** Po signed upload: kompresja w Storage. Błąd = zostaje oryginał. */
export async function replaceOptimizedStoredImage(
	supabase: SupabaseClient,
	path: string,
	mime: string,
): Promise<StoredImageLocation> {
	const original = { path, mime };
	if (!shouldOptimizeImage(mime)) return original;

	const { data, error } = await supabase.storage.from('post-assets').download(path);
	if (error || !data) return original;

	const input = new Uint8Array(await data.arrayBuffer());
	const optimized = await optimizeImage(input, mime);
	if (!optimized.changed) return original;

	const nextPath = replaceStorageExtension(path, extensionForMime(optimized.mime));
	const { error: uploadError } = await supabase.storage.from('post-assets').upload(
		nextPath,
		optimized.bytes,
		{ contentType: optimized.mime, cacheControl: '3600', upsert: true },
	);
	if (uploadError) return original;

	if (nextPath !== path) {
		await supabase.storage.from('post-assets').remove([path]);
	}

	return { path: nextPath, mime: optimized.mime };
}
