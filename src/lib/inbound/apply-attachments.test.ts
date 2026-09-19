import { describe, expect, it, vi } from 'vitest';
import { inbound } from '@/i18n';
import { applyInboundAttachments } from './apply-attachments';
import { appendAttachmentNotes } from './attachment-notes';
import type { InboundAttachmentMeta } from './attachment-model';
import { docxWithText } from './extract-fixture-docx';
import { DOCX_MIME } from '@/lib/posts/upload-mime';

const POST = '44444444-4444-4444-8444-444444444444';
const EMAIL = '56761188-7520-42d8-8898-ff6fc54ce618';
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const URL = 'https://inbound-cdn.resend.com/att';

function item(overrides: Partial<InboundAttachmentMeta> = {}): InboundAttachmentMeta {
	return {
		id: 'att-ok',
		filename: 'foto.png',
		size: PNG.byteLength,
		contentType: 'image/png',
		downloadUrl: URL,
		...overrides,
	};
}

describe('applyInboundAttachments', () => {
	it('zapisuje poprawny plik i notuje skip bez 5xx', async () => {
		const store = vi.fn().mockResolvedValue(true);
		const saveContent = vi.fn().mockResolvedValue(undefined);
		const listed = [
			item(),
			item({
				id: 'att-bad',
				filename: 'wirus.exe',
				contentType: 'application/x-msdownload',
				downloadUrl: `${URL}-exe`,
			}),
		];

		const result = await applyInboundAttachments({
			postId: POST,
			emailId: EMAIL,
			contentMd: 'Zapraszamy.',
			list: async () => listed,
			download: async () => ({ ok: true, bytes: PNG }),
			store,
			saveContent,
		});

		expect(result.stored).toBe(1);
		expect(result.notes).toEqual([inbound.skippedType('wirus.exe')]);
		expect(store).toHaveBeenCalledTimes(1);
		expect(store.mock.calls[0]?.[0]).toMatchObject({
			postId: POST,
			filename: 'foto.png',
			mime: 'image/png',
			kind: 'gallery',
		});
		expect(saveContent).toHaveBeenCalledWith(
			POST,
			appendAttachmentNotes('Zapraszamy.', result.notes),
		);
	});

	it('fail listy i fail fetch dopisuje notatke, nie rzuca', async () => {
		const store = vi.fn();
		const saveContent = vi.fn().mockResolvedValue(undefined);

		const listFail = await applyInboundAttachments({
			postId: POST,
			emailId: EMAIL,
			contentMd: 'Tresc',
			list: async () => null,
			download: async () => ({ ok: true, bytes: PNG }),
			store,
			saveContent,
		});
		expect(listFail).toEqual({ stored: 0, notes: [inbound.skippedList] });
		expect(store).not.toHaveBeenCalled();

		const fetchFail = await applyInboundAttachments({
			postId: POST,
			emailId: EMAIL,
			contentMd: 'Tresc',
			list: async () => [item()],
			download: async () => ({ ok: false, reason: 'fetch_failed' }),
			store,
			saveContent,
		});
		expect(fetchFail.stored).toBe(0);
		expect(fetchFail.notes).toEqual([inbound.skippedFetch('foto.png')]);
		expect(store).not.toHaveBeenCalled();
	});

	it('gdy store zwroci false, szkic dostaje notatke store_failed', async () => {
		const saveContent = vi.fn().mockResolvedValue(undefined);
		const result = await applyInboundAttachments({
			postId: POST,
			emailId: EMAIL,
			contentMd: '',
			list: async () => [item()],
			download: async () => ({ ok: true, bytes: PNG }),
			store: async () => false,
			saveContent,
		});
		expect(result).toEqual({ stored: 0, notes: [inbound.skippedStore('foto.png')] });
		expect(saveContent).toHaveBeenCalledWith(POST, inbound.skippedStore('foto.png'));
	});

	it('DOCX bez pieczęci: grafika do galerii, bez pliku Word', async () => {
		const store = vi.fn().mockResolvedValue(true);
		const saveContent = vi.fn();
		const docx = docxWithText('Dofinansowanie');
		const result = await applyInboundAttachments({
			postId: POST,
			emailId: EMAIL,
			contentMd: 'Treść',
			list: async () => [
				item({
					filename: 'info.docx',
					contentType: DOCX_MIME,
					size: docx.byteLength,
				}),
			],
			download: async () => ({ ok: true, bytes: docx }),
			store,
			saveContent,
			unpackDocx: async () => ({
				dropDocx: true,
				images: [{ filename: 'info.webp', mime: 'image/webp', bytes: PNG }],
			}),
		});
		expect(result.stored).toBe(1);
		expect(store).toHaveBeenCalledTimes(1);
		expect(store.mock.calls[0]?.[0]).toMatchObject({
			kind: 'gallery',
			filename: 'info.webp',
			mime: 'image/webp',
		});
		expect(saveContent).not.toHaveBeenCalled();
	});
});
