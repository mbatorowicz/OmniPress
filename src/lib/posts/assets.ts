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

export function isDocxAsset(asset: PostAssetRow): boolean {
	return (
		asset.mime_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
	);
}

export function isGpkgAsset(asset: PostAssetRow): boolean {
	return asset.mime_type === 'application/geopackage+sqlite3';
}

export function isXlsxAsset(asset: PostAssetRow): boolean {
	return (
		asset.mime_type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
	);
}

export function isZipAsset(asset: PostAssetRow): boolean {
	return asset.mime_type === 'application/zip';
}

/** Inne pliki do pobrania (poza PDF i DOCX): GPKG, XLSX, ZIP. */
export function isDownloadFileAsset(asset: PostAssetRow): boolean {
	return isGpkgAsset(asset) || isXlsxAsset(asset) || isZipAsset(asset);
}

export function isFileAttachmentAsset(asset: PostAssetRow): boolean {
	return isPdfAsset(asset) || isDocxAsset(asset) || isDownloadFileAsset(asset);
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

/** Same-origin URL do podglądu PDF w panelu (PDF.js + cookies sesji). */
export function previewAssetFileUrl(postId: string, assetId: string): string {
	return `/api/posts/${postId}/assets/${assetId}/file`;
}

export function assetsForPreviewRender(postId: string, assets: PostAssetRow[]): AssetForDisplay[] {
	return assets.flatMap((asset) => {
		const sourceUrl = publicUrlForAsset(asset.storage_path);
		if (!sourceUrl) return [];
		return [
			{
				filename: asset.filename,
				mime_type: asset.mime_type,
				display_mode: asset.display_mode,
				sourceUrl,
				publishUrl: previewAssetFileUrl(postId, asset.id),
			},
		];
	});
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

function parseAssetOrderField(form: FormData, fieldName: string): string[] {
	const raw = String(form.get(fieldName) ?? '').trim();
	if (!raw) return [];
	return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export function parseGalleryOrder(form: FormData): string[] {
	return parseAssetOrderField(form, 'gallery_order');
}

export function parsePdfOrder(form: FormData): string[] {
	return parseAssetOrderField(form, 'pdf_order');
}

export function parseDocxOrder(form: FormData): string[] {
	return parseAssetOrderField(form, 'docx_order');
}

/** Kolejność innych plików do pobrania (poza PDF/DOCX). */
export function parseFileOrder(form: FormData): string[] {
	return parseAssetOrderField(form, 'file_order');
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

/** Kolejność plików na stronie: PDF, DOCX, potem inne pliki do pobrania. */
export async function updateFileAttachmentOrders(
	supabase: SupabaseClient,
	postId: string,
	pdfIds: string[],
	docxIds: string[],
	fileIds: string[] = [],
): Promise<void> {
	let sortOrder = 0;
	for (const id of pdfIds) {
		await supabase
			.from('assets')
			.update({ sort_order: sortOrder++ })
			.eq('id', id)
			.eq('post_id', postId);
	}
	for (const id of docxIds) {
		await supabase
			.from('assets')
			.update({ sort_order: sortOrder++ })
			.eq('id', id)
			.eq('post_id', postId);
	}
	for (const id of fileIds) {
		await supabase
			.from('assets')
			.update({ sort_order: sortOrder++ })
			.eq('id', id)
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

export type DeletePostAssetError = 'not_found' | 'delete_failed';

export function canDeletePostAsset(asset: Pick<PostAssetRow, 'mime_type'>): boolean {
	return (
		isGalleryImageAsset(asset as PostAssetRow) ||
		isFileAttachmentAsset(asset as PostAssetRow)
	);
}

export async function deletePostAsset(
	supabase: SupabaseClient,
	postId: string,
	assetId: string,
): Promise<{ ok: true } | { ok: false; error: DeletePostAssetError }> {
	const { data: asset } = await supabase
		.from('assets')
		.select('id, storage_path, mime_type')
		.eq('id', assetId)
		.eq('post_id', postId)
		.maybeSingle();

	if (!asset || !canDeletePostAsset(asset)) {
		return { ok: false, error: 'not_found' };
	}

	await supabase.storage.from('post-assets').remove([asset.storage_path]);

	const { error } = await supabase
		.from('assets')
		.delete()
		.eq('id', assetId)
		.eq('post_id', postId);

	if (error) return { ok: false, error: 'delete_failed' };
	return { ok: true };
}
