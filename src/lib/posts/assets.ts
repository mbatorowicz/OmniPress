import { publicAssetUrl } from '@/lib/publish/assets';
import type { AssetDisplayMode, AssetForDisplay } from '@/lib/publish/asset-markdown';
import type { SupabaseClient } from '@supabase/supabase-js';

export type PostAssetRow = {
	id: string;
	storage_path: string;
	filename: string;
	mime_type: string;
	display_mode: AssetDisplayMode;
	sort_order: number;
};

const IMAGE_MIME_PREFIX = 'image/';

export function isGalleryImageAsset(asset: PostAssetRow): boolean {
	return asset.mime_type.startsWith(IMAGE_MIME_PREFIX);
}

export function isPdfAsset(asset: PostAssetRow): boolean {
	return asset.mime_type === 'application/pdf';
}

export async function loadPostAssetsForPost(
	supabase: SupabaseClient,
	postId: string,
): Promise<PostAssetRow[]> {
	const { data } = await supabase
		.from('assets')
		.select('id, storage_path, filename, mime_type, display_mode, sort_order')
		.eq('post_id', postId)
		.order('sort_order', { ascending: true })
		.order('created_at', { ascending: true });
	return (data ?? []).map((row) => ({
		...row,
		sort_order: row.sort_order ?? 0,
		display_mode: (row.display_mode === 'embed' ? 'embed' : 'link') as AssetDisplayMode,
	}));
}

export function publicUrlForAsset(storagePath: string): string | null {
	return publicAssetUrl(storagePath);
}

export function assetsForContentRender(
	assets: PostAssetRow[],
	urlForPath: (storagePath: string) => string | null = publicUrlForAsset,
): AssetForDisplay[] {
	return assets.flatMap((asset) => {
		const sourceUrl = urlForPath(asset.storage_path);
		if (!sourceUrl) return [];
		return [
			{
				filename: asset.filename,
				mime_type: asset.mime_type,
				display_mode: asset.display_mode,
				sourceUrl,
				publishUrl: sourceUrl,
			},
		];
	});
}

export async function updatePostAssetDisplayModes(
	supabase: SupabaseClient,
	postId: string,
	modes: Record<string, AssetDisplayMode>,
): Promise<void> {
	for (const [id, mode] of Object.entries(modes)) {
		if (mode !== 'link' && mode !== 'embed') continue;
		await supabase
			.from('assets')
			.update({ display_mode: mode })
			.eq('id', id)
			.eq('post_id', postId);
	}
}

export function parseAssetDisplayModes(form: FormData): Record<string, AssetDisplayMode> {
	const modes: Record<string, AssetDisplayMode> = {};
	for (const [key, value] of form.entries()) {
		const match = key.match(/^asset_mode_(.+)$/);
		if (!match) continue;
		if (value === 'link' || value === 'embed') modes[match[1]!] = value;
	}
	return modes;
}

export function parseGalleryOrder(form: FormData): string[] {
	const raw = String(form.get('gallery_order') ?? '').trim();
	if (!raw) return [];
	return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export async function updateGalleryOrder(
	supabase: SupabaseClient,
	postId: string,
	orderedIds: string[],
): Promise<void> {
	if (orderedIds.length === 0) return;
	for (let i = 0; i < orderedIds.length; i++) {
		await supabase
			.from('assets')
			.update({ sort_order: i })
			.eq('id', orderedIds[i]!)
			.eq('post_id', postId);
	}
}

export async function nextGallerySortOrder(
	supabase: SupabaseClient,
	postId: string,
): Promise<number> {
	const { data } = await supabase
		.from('assets')
		.select('sort_order')
		.eq('post_id', postId)
		.order('sort_order', { ascending: false })
		.limit(1)
		.maybeSingle();
	return (data?.sort_order ?? -1) + 1;
}
