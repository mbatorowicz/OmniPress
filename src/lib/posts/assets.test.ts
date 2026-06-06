import { describe, expect, it } from 'vitest';
import { canDeletePostAsset } from './assets';

describe('canDeletePostAsset', () => {
	it('zezwala na usuwanie zdjęć galerii', () => {
		expect(canDeletePostAsset({ mime_type: 'image/jpeg' })).toBe(true);
	});

	it('zezwala na usuwanie PDF', () => {
		expect(canDeletePostAsset({ mime_type: 'application/pdf' })).toBe(true);
	});

	it('odrzuca nieznane typy', () => {
		expect(canDeletePostAsset({ mime_type: 'application/zip' })).toBe(false);
	});
});
