import { describe, expect, it } from 'vitest';
import { extensionForMime, markdownForUploadedAsset, validatePostAssetFile } from './upload';

describe('validatePostAssetFile', () => {
	it('akceptuje PDF', () => {
		const file = new File(['x'], 'ostrzezenie.pdf', { type: 'application/pdf' });
		expect(validatePostAssetFile(file)).toBeNull();
	});

	it('odrzuca nieznany typ', () => {
		const file = new File(['x'], 'doc.docx', {
			type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		});
		expect(validatePostAssetFile(file)).toBeTruthy();
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
