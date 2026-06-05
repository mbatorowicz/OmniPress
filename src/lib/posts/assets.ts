import { publicAssetUrl } from '@/lib/publish/assets';
import type { AssetDisplayMode, AssetForDisplay } from '@/lib/publish/asset-markdown';
import type { SupabaseClient } from '@supabase/supabase-js';

export type PostAssetRow = {
	id: string;
	storage_path: string;
	filename: string;
	mime_type: string;
	display_mode: AssetDisplayMode;
};

export async function loadPostAssetsForPost(
	supabase: SupabaseClient,
	postId: string,
): Promise<PostAssetRow[]> {
	const { data } = await supabase
		.from('assets')
		.select('id, storage_path, filename, mime_type, display_mode')
		.eq('post_id', postId)
		.order('created_at', { ascending: true });
	return (data ?? []).map((row) => ({
		...row,
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
	const ids = Object.keys(modes);
	if (ids.length === 0) return;

	for (const id of ids) {
		const mode = modes[id];
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
