/**
 * Kształt załącznika i wszystko, co da się o nim policzyć bez bazy: rodzaj pliku,
 * adresy, mapowanie na render i odczyt pól formularza. Operacje na bazie:
 * `@/lib/posts/assets`.
 */
import { publicAssetUrl } from '@/lib/publish/asset-model';
import type { AssetDisplayMode, AssetForDisplay } from '@/lib/publish/asset-markdown';

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

export function canDeletePostAsset(asset: Pick<PostAssetRow, 'mime_type'>): boolean {
	return (
		isGalleryImageAsset(asset as PostAssetRow) ||
		isFileAttachmentAsset(asset as PostAssetRow)
	);
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
