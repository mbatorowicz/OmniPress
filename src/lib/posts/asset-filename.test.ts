import { describe, expect, it } from 'vitest';
import { parseAssetFilenames, sanitizeAssetFilename } from './asset-filename';

describe('sanitizeAssetFilename', () => {
	it('zostawia czytelną etykietę', () => {
		expect(sanitizeAssetFilename('  Miedzna — rejon 1  ')).toBe('Miedzna — rejon 1');
	});

	it('usuwa znaki łamiące markdown i sterujące', () => {
		expect(sanitizeAssetFilename('Rejon [1]\n(kopia)')).toBe('Rejon 1 kopia');
	});

	it('odrzuca pustą wartość', () => {
		expect(sanitizeAssetFilename('   ')).toBeNull();
		expect(sanitizeAssetFilename('[]()')).toBeNull();
	});
});

describe('parseAssetFilenames', () => {
	it('zbiera nazwy z pól formularza', () => {
		const form = new FormData();
		form.set('asset_filename_a1', 'Miedzna — rejon 1');
		form.set('asset_filename_a2', '  ');
		form.set('asset_mode_a1', 'embed');
		expect(parseAssetFilenames(form)).toEqual({ a1: 'Miedzna — rejon 1' });
	});
});
