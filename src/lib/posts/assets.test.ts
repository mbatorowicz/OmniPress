import { describe, expect, it, vi } from 'vitest';
import { assetsForPreviewRender, canDeletePostAsset, previewAssetFileUrl } from './assets';

describe('previewAssetFileUrl', () => {
	it('zwraca same-origin URL API', () => {
		expect(previewAssetFileUrl('post-1', 'asset-2')).toBe('/api/posts/post-1/assets/asset-2/file');
	});
});

describe('assetsForPreviewRender', () => {
	it('ustawia publishUrl na proxy API', () => {
		vi.stubEnv('PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
		const assets = assetsForPreviewRender('post-1', [
			{
				id: 'asset-2',
				storage_path: 'post-1/x.pdf',
				filename: 'x.pdf',
				mime_type: 'application/pdf',
				display_mode: 'embed',
				sort_order: 0,
			},
		]);
		expect(assets[0]?.publishUrl).toBe('/api/posts/post-1/assets/asset-2/file');
	});
});

describe('canDeletePostAsset', () => {
	it('zezwala na usuwanie zdjęć galerii', () => {
		expect(canDeletePostAsset({ mime_type: 'image/jpeg' })).toBe(true);
	});

	it('zezwala na usuwanie PDF', () => {
		expect(canDeletePostAsset({ mime_type: 'application/pdf' })).toBe(true);
	});

	it('zezwala na usuwanie DOCX', () => {
		expect(
			canDeletePostAsset({
				mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			}),
		).toBe(true);
	});

	it('zezwala na usuwanie GPKG', () => {
		expect(canDeletePostAsset({ mime_type: 'application/geopackage+sqlite3' })).toBe(true);
	});

	it('zezwala na usuwanie XLSX', () => {
		expect(
			canDeletePostAsset({
				mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			}),
		).toBe(true);
	});

	it('zezwala na usuwanie ZIP', () => {
		expect(canDeletePostAsset({ mime_type: 'application/zip' })).toBe(true);
	});

	it('odrzuca nieznane typy', () => {
		expect(canDeletePostAsset({ mime_type: 'application/x-msdownload' })).toBe(false);
	});
});
