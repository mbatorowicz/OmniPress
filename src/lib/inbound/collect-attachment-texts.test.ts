import { describe, expect, it, vi } from 'vitest';
import { DOCX_MIME, PDF_MIME } from '@/lib/posts/upload-mime';
import { collectInboundInventory, collectExtractableAttachmentTexts } from './collect-attachment-texts';
import { docxWithText } from './extract-fixture-docx';
import { pdfWithText } from './extract-fixture-pdf';
import type { InboundAttachmentMeta } from './attachment-model';

const EMAIL = '56761188-7520-42d8-8898-ff6fc54ce618';
const PDF_BYTES = pdfWithText('Uchwala Rady Gminy');
const DOCX_BYTES = docxWithText('Nabór do przedszkola');

function item(overrides: Partial<InboundAttachmentMeta> = {}): InboundAttachmentMeta {
	return {
		id: 'att-1',
		filename: 'uchwala.pdf',
		size: PDF_BYTES.byteLength,
		contentType: PDF_MIME,
		downloadUrl: 'https://inbound-cdn.resend.com/pdf',
		...overrides,
	};
}

describe('collectExtractableAttachmentTexts', () => {
	it('wyciąga tekst z PDF i DOCX, zostawia bajty obrazu', async () => {
		const listed = [
			item(),
			item({
				id: 'att-docx',
				filename: 'nabor.docx',
				size: DOCX_BYTES.byteLength,
				contentType: DOCX_MIME,
				downloadUrl: 'https://inbound-cdn.resend.com/docx',
			}),
			item({
				id: 'att-img',
				filename: 'foto.png',
				size: 12,
				contentType: 'image/png',
				downloadUrl: 'https://inbound-cdn.resend.com/png',
			}),
		];
		const download = vi.fn(async (url: string) => {
			if (url.endsWith('/docx')) return { ok: true as const, bytes: DOCX_BYTES };
			if (url.endsWith('/pdf')) return { ok: true as const, bytes: PDF_BYTES };
			if (url.endsWith('/png')) {
				return {
					ok: true as const,
					bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]),
				};
			}
			return { ok: false as const, reason: 'fetch_failed' as const };
		});

		const texts = await collectInboundInventory({
			emailId: EMAIL,
			list: async () => listed,
			download,
		});

		expect(texts.map((row) => row.filename)).toEqual(['uchwala.pdf', 'nabor.docx', 'foto.png']);
		expect(texts[0]?.text).toContain('Uchwala Rady Gminy');
		expect(texts[1]?.text).toContain('Nabór do przedszkola');
		expect(texts[2]?.bytes?.byteLength).toBe(12);
		expect(download).toHaveBeenCalledTimes(3);
	});

	it('pusta lista / błąd listowania → []', async () => {
		expect(
			await collectExtractableAttachmentTexts({
				emailId: EMAIL,
				list: async () => null,
				download: vi.fn(),
			}),
		).toEqual([]);
		expect(
			await collectExtractableAttachmentTexts({
				emailId: EMAIL,
				list: async () => {
					throw new Error('network');
				},
				download: vi.fn(),
			}),
		).toEqual([]);
	});
});
