import { describe, expect, it } from 'vitest';
import {
	extensionForMime,
	markdownForUploadedAsset,
	matchesPostAssetMagicBytes,
	validatePostAssetFile,
} from './upload';

describe('validatePostAssetFile', () => {
	it('akceptuje PDF z poprawnym nagłówkiem', async () => {
		const file = new File(['%PDF-1.4'], 'ostrzezenie.pdf', { type: 'application/pdf' });
		expect(await validatePostAssetFile(file)).toBeNull();
	});

	it('odrzuca PDF z fałszywym MIME', async () => {
		const file = new File(['not-a-pdf'], 'fake.pdf', { type: 'application/pdf' });
		expect(await validatePostAssetFile(file)).toBeTruthy();
	});

	it('odrzuca nieznany typ', async () => {
		const file = new File(['x'], 'doc.docx', {
			type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		});
		expect(await validatePostAssetFile(file)).toBeTruthy();
	});
});

describe('matchesPostAssetMagicBytes', () => {
	it('rozpoznaje JPEG', () => {
		expect(matchesPostAssetMagicBytes(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), 'image/jpeg')).toBe(
			true,
		);
	});
});

describe('markdownForUploadedAsset', () => {
	it('generuje link dla PDF', () => {
		const md = markdownForUploadedAsset('MZW.pdf', 'https://example.com/x.pdf', 'application/pdf');
		expect(md).toContain('[📄 MZW.pdf]');
		expect(md).toContain('https://example.com/x.pdf');
	});

	it('generuje obrazek dla JPEG', () => {
		const md = markdownForUploadedAsset('foto.jpg', 'https://example.com/x.jpg', 'image/jpeg');
		expect(md).toBe('![foto.jpg](https://example.com/x.jpg)');
	});

	it('mapuje rozszerzenie pdf', () => {
		expect(extensionForMime('application/pdf')).toBe('pdf');
	});
});
