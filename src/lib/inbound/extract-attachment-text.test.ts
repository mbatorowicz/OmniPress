import { describe, expect, it } from 'vitest';
import { DOCX_MIME, PDF_MIME } from '@/lib/posts/upload-mime';
import { extractAttachmentText, isExtractableMime } from './extract-attachment-text';
import { extractDocxText } from './extract-docx-text';
import { extractPdfMeta, extractPdfText } from './extract-pdf-text';
import { docxWithText } from './extract-fixture-docx';
import { pdfWithText } from './extract-fixture-pdf';

describe('isExtractableMime', () => {
	it('tylko PDF i DOCX', () => {
		expect(isExtractableMime(PDF_MIME)).toBe(true);
		expect(isExtractableMime(DOCX_MIME)).toBe(true);
		expect(isExtractableMime('image/png')).toBe(false);
	});
});

describe('extractPdfText', () => {
	it('czyta warstwę tekstową i liczbę stron', async () => {
		const bytes = pdfWithText('Festyn gminny 2026');
		expect(await extractPdfText(bytes)).toContain('Festyn gminny 2026');
		expect(await extractPdfMeta(bytes)).toMatchObject({ pageCount: 1 });
	});

	it('puste bajty i śmieci dają pusty string', async () => {
		expect(await extractPdfText(new Uint8Array())).toBe('');
		expect(await extractPdfText(new Uint8Array([1, 2, 3, 4]))).toBe('');
	});
});

describe('extractDocxText', () => {
	it('czyta akapit z DOCX', async () => {
		const text = await extractDocxText(docxWithText('Ogłoszenie o naborze'));
		expect(text).toContain('Ogłoszenie o naborze');
	});

	it('uszkodzony plik daje pusty string', async () => {
		expect(await extractDocxText(new Uint8Array([0x50, 0x4b]))).toBe('');
	});
});

describe('extractAttachmentText', () => {
	it('zwraca null dla nieobsługiwanego MIME i pustych bajtów', async () => {
		expect(await extractAttachmentText('a.png', 'image/png', new Uint8Array([1]))).toBeNull();
		expect(await extractAttachmentText('a.pdf', PDF_MIME, new Uint8Array())).toBeNull();
	});

	it('PDF z tekstem ma pageCount', async () => {
		const extracted = await extractAttachmentText('a.pdf', PDF_MIME, pdfWithText('Festyn'));
		expect(extracted?.pageCount).toBe(1);
		expect(extracted?.text).toContain('Festyn');
	});

	it('składa filename + tekst z DOCX', async () => {
		const bytes = docxWithText('Komunikat wójta');
		const extracted = await extractAttachmentText('pismo.docx', DOCX_MIME, bytes);
		expect(extracted).toMatchObject({ filename: 'pismo.docx', mime: DOCX_MIME });
		expect(extracted?.text).toContain('Komunikat wójta');
	});
});
